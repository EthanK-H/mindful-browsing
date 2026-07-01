/**
 * LiveTranscriber — microphone -> AssemblyAI Universal-Streaming (v3) WebSocket.
 *
 * The browser fetches a short-lived token from our backend (the real API key
 * never reaches the client), opens the streaming socket, and forwards 16kHz
 * PCM16 audio. Finalized turns are surfaced via onUtterance callbacks.
 *
 * Note on diarization: real-time speaker labels are read from `words[].speaker`
 * when the service provides them. If your AssemblyAI plan/endpoint doesn't
 * support streaming diarization yet, turns are labeled by turn-taking heuristic
 * ("Speaker ?"), and everything downstream still works.
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
  }

  async start() {
    const tokenRes = await fetch("/api/streaming-token");
    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}));
      throw new Error(body.error || `Token endpoint returned ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    const url =
      "wss://streaming.assemblyai.com/v3/ws" +
      `?sample_rate=16000&format_turns=true&token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => this._handleMessage(event);
    this.ws.onerror = () => this.onError(new Error("Transcription socket error"));
    this.ws.onclose = () => {
      if (this.running) this.onStatus("disconnected");
      this.running = false;
    };

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      const t = setTimeout(() => reject(new Error("Transcription socket timed out")), 8000);
      this.ws.addEventListener("open", () => clearTimeout(t), { once: true });
    });

    await this._startAudioPump();
    this.running = true;
    this.onStatus("live");
  }

  async _startAudioPump() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    // Inline AudioWorklet: batches mic samples into ~50ms PCM16 frames.
    const workletSource = `
      class PcmForwarder extends AudioWorkletProcessor {
        constructor() { super(); this.buf = []; this.len = 0; }
        process(inputs) {
          const ch = inputs[0] && inputs[0][0];
          if (ch) {
            this.buf.push(new Float32Array(ch));
            this.len += ch.length;
            if (this.len >= 800) { // 50ms @ 16kHz
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
    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-forwarder");
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
    if (msg.type !== "Turn") return;

    const text = (msg.transcript || "").trim();
    if (!text) return;

    // Streaming diarization (when available) attaches a speaker to each word.
    const speakerRaw = msg.words && msg.words.length ? msg.words[0].speaker : undefined;
    const speaker = speakerRaw != null ? `Speaker ${speakerRaw}` : "Speaker ?";

    if (msg.end_of_turn) {
      this.onPartial("");
      this.onUtterance({ speaker, text, turnOrder: msg.turn_order });
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
