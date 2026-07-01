/**
 * LiveTranscriber — microphone -> AssemblyAI Universal-Streaming (v3) WebSocket.
 *
 * The browser fetches a short-lived token from our backend (the real API key
 * never reaches the client), opens the streaming socket, and forwards PCM16
 * audio at the AudioContext's REAL sample rate — browsers may ignore a
 * requested rate, and advertising the wrong one makes AssemblyAI hear
 * slowed-down garble (billed, but no usable transcripts).
 *
 * Diarization: we request streaming speaker labels (`speaker_labels=true`) and
 * read the turn-level `speaker_label` (falling back to per-word `speaker`).
 * If the stream carries no labels, turns fall back to "Speaker ?" and
 * everything downstream still works.
 */
class LiveTranscriber {
  constructor({ onUtterance, onPartial, onStatus, onError }) {
    this.onUtterance = onUtterance;
    this.onPartial = onPartial || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || console.error;
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.running = false;
    this.lastEmittedTurn = -1;
  }

  async start() {
    const tokenRes = await fetch("/api/streaming-token");
    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}));
      throw new Error(body.error || `Token endpoint returned ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();

    // Mic + audio context FIRST, so we know the true capture rate before
    // telling AssemblyAI what to expect.
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    this.audioContext = new AudioContext();
    if (this.audioContext.state === "suspended") await this.audioContext.resume();
    const sampleRate = this.audioContext.sampleRate; // typically 44100 or 48000

    const params = new URLSearchParams({
      sample_rate: String(sampleRate),
      speech_model: "u3-rt-pro",
      speaker_labels: "true", // streaming diarization: adds speaker_label to Turn events
      format_turns: "true",
      token,
    });
    this.ws = new WebSocket(`wss://streaming.assemblyai.com/v3/ws?${params}`);

    this.ws.onmessage = (event) => this._handleMessage(event);
    this.ws.onerror = () => this.onError(new Error("Transcription socket error — check the browser console."));
    this.ws.onclose = (e) => {
      const wasRunning = this.running;
      this.running = false;
      if (wasRunning) {
        this.onStatus("disconnected");
        if (e.code !== 1000) {
          this.onError(new Error(`Transcription stream closed (${e.code}): ${e.reason || "no reason given"}`));
        }
      }
    };

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Transcription socket timed out")), 8000);
      this.ws.addEventListener("open", () => { clearTimeout(t); resolve(); }, { once: true });
      this.ws.addEventListener("close", (e) => {
        clearTimeout(t);
        reject(new Error(`Could not connect to AssemblyAI (${e.code}): ${e.reason || "connection refused"}`));
      }, { once: true });
    });

    await this._startAudioPump(sampleRate);
    this.running = true;
    this.onStatus("live");
  }

  async _startAudioPump(sampleRate) {
    // ~50ms frames at the actual rate (AssemblyAI wants 50-1000ms chunks).
    const chunkSamples = Math.round(sampleRate * 0.05);
    const workletSource = `
      class PcmForwarder extends AudioWorkletProcessor {
        constructor(options) {
          super();
          this.chunk = (options.processorOptions && options.processorOptions.chunkSamples) || 800;
          this.buf = []; this.len = 0;
        }
        process(inputs) {
          const ch = inputs[0] && inputs[0][0];
          if (ch) {
            this.buf.push(new Float32Array(ch));
            this.len += ch.length;
            if (this.len >= this.chunk) {
              const flat = new Float32Array(this.len);
              let o = 0;
              for (const b of this.buf) { flat.set(b, o); o += b.length; }
              const pcm = new Int16Array(flat.length);
              for (let i = 0; i < flat.length; i++) {
                const s = Math.max(-1, Math.min(1, flat[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              this.port.postMessage(pcm.buffer, [pcm.buffer]);
              this.buf = []; this.len = 0;
            }
          }
          return true;
        }
      }
      registerProcessor("pcm-forwarder", PcmForwarder);
    `;
    const blobUrl = URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
    await this.audioContext.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-forwarder", {
      processorOptions: { chunkSamples },
    });
    this.workletNode.port.onmessage = (e) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(e.data);
    };
    source.connect(this.workletNode);
  }

  _handleMessage(event) {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "Error" || msg.error) {
      this.onError(new Error(`AssemblyAI: ${msg.error || JSON.stringify(msg)}`));
      return;
    }
    if (msg.type !== "Turn") return;

    const text = (msg.transcript || "").trim();
    if (!text) return;

    // Turn-level speaker_label is the primary signal; fall back to the first
    // word's speaker. Labels may arrive as "A" or "Speaker A" — normalize.
    const speakerRaw = msg.speaker_label ?? (msg.words && msg.words.length ? msg.words[0].speaker : undefined);
    const speaker =
      speakerRaw == null || speakerRaw === ""
        ? "Speaker ?"
        : /^speaker/i.test(String(speakerRaw))
          ? String(speakerRaw)
          : `Speaker ${speakerRaw}`;
    const turnOrder = msg.turn_order ?? 0;

    // With format_turns=true, each finished turn can arrive twice: once raw
    // (end_of_turn, unformatted) and once formatted. Emit each turn exactly
    // once, preferring the formatted version; show everything else as the
    // live partial line.
    if (msg.end_of_turn && (msg.turn_is_formatted || msg.turn_is_formatted === undefined)) {
      if (turnOrder > this.lastEmittedTurn) {
        this.lastEmittedTurn = turnOrder;
        this.onPartial("");
        this.onUtterance({ speaker, text, turnOrder });
      }
    } else {
      this.onPartial(`${speaker}: ${text}`);
    }
  }

  stop() {
    this.running = false;
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "Terminate" }));
      }
      this.ws?.close();
    } catch { /* already closed */ }
    this.workletNode?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.ws = null;
    this.onStatus("idle");
  }
}

window.LiveTranscriber = LiveTranscriber;
