/* ============================================================
   GEARBOUND — procedural audio (Web Audio API)
   A clockwork waltz for the overworld, a driving theme for
   battles, plus mechanical sound effects. No audio files.
   ============================================================ */
(function () {
'use strict';

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let enabled = true;
let started = false;

let currentTrack = null;     // 'world' | 'battle'
let schedTimer = null;
let nextNoteTime = 0;
let step = 0;

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { enabled = false; return; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.32;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(master);
}

// ---- note helper ------------------------------------------------
function note(freq, t, dur, type, gain, dest, glideTo) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'triangle';
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// soft mechanical "tick" percussion
function tick(t, gain) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(2400, t);
  g.gain.setValueAtTime(gain || 0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g); g.connect(musicGain);
  o.start(t); o.stop(t + 0.04);
}

function noiseHit(t, dur, gain, freq, dest) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq || 1200;
  const g = ctx.createGain();
  g.gain.value = gain || 0.3;
  src.connect(f); f.connect(g); g.connect(dest || sfxGain);
  src.start(t); src.stop(t + dur);
}

// richer synth voice: ADSR, optional lowpass + detune for warmth
function voice(freq, t, dur, o) {
  o = o || {};
  const type = o.type || 'triangle';
  const gain = o.gain != null ? o.gain : 0.14;
  const dest = o.dest || musicGain;
  const attack = o.attack != null ? o.attack : 0.02;
  const release = o.release != null ? o.release : 0.1;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + dur);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t);
  let out = osc;
  if (o.cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.cutoff, t);
    f.Q.value = o.q || 0.7;
    osc.connect(f); out = f;
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack + 0.001, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// warm detuned chord pad
function pad(freqs, t, dur, gain, type) {
  for (const f of freqs) {
    voice(f, t, dur, { type: type || 'sine', gain: gain, detune: 7, cutoff: 1700, attack: 0.12, release: 0.35 });
    voice(f, t, dur, { type: type || 'sine', gain: gain * 0.75, detune: -7, cutoff: 1700, attack: 0.12, release: 0.35 });
  }
}

// ---- note tables (Hz) ------------------------------------------
const N = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, Bb3:233.08,
  B4:493.88, C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  Gs4:415.30, Eb4:311.13, Bb4:466.16, Ab4:415.30, Fs4:369.99
};

// ===== Overworld: a clockwork waltz in A minor, 8-bar loop =====
// chord per bar: root (for bass) + triad (for pad), plus an arp set
const WORLD_PROG = [
  { root: N.A3, triad: [N.A3, N.C4, N.E4] }, // Am
  { root: N.F3, triad: [N.F3, N.A3, N.C4] }, // F
  { root: N.C4, triad: [N.C4, N.E4, N.G4] }, // C
  { root: N.G3, triad: [N.G3, N.B3, N.D4] }, // G
  { root: N.A3, triad: [N.A3, N.C4, N.E4] }, // Am
  { root: N.F3, triad: [N.F3, N.A3, N.C4] }, // F
  { root: N.E3, triad: [N.E3, N.Gs4, N.B4] }, // E (harmonic-minor V)
  { root: N.A3, triad: [N.A3, N.C4, N.E4] }  // Am
];
// melody: one slot per beat across 8 bars (24 beats); 0 = rest
const WORLD_MEL = [
  N.A4, 0, N.E5,  N.F5, 0, N.E5,  N.G5, 0, N.E5,  N.D5, 0, N.B4,
  N.C5, 0, N.A4,  N.D5, 0, N.F5,  N.E5, 0, N.Gs4, N.A4, 0, 0
];

// ===== Battle: driving 4/4 in A minor, 8-bar loop =====
const BATTLE_PROG = [
  { root: N.A3, triad: [N.A3, N.C4, N.E4], arp: [N.A4, N.C5, N.E5, N.C5] },
  { root: N.A3, triad: [N.A3, N.C4, N.E4], arp: [N.A4, N.E5, N.C5, N.E5] },
  { root: N.F3, triad: [N.F3, N.A3, N.C4], arp: [N.F4, N.A4, N.C5, N.A4] },
  { root: N.G3, triad: [N.G3, N.B3, N.D4], arp: [N.G4, N.B4, N.D5, N.B4] },
  { root: N.C4, triad: [N.C4, N.E4, N.G4], arp: [N.C5, N.E5, N.G5, N.E5] },
  { root: N.D4, triad: [N.D4, N.F4, N.A4], arp: [N.D5, N.F5, N.A5, N.F5] },
  { root: N.E3, triad: [N.E3, N.Gs4, N.B4], arp: [N.E5, N.Gs4, N.B4, N.Gs4] },
  { root: N.E3, triad: [N.E3, N.Gs4, N.B4], arp: [N.B4, N.E5, N.Gs4 * 2, N.E5] }
];
// lead melody, one slot per 8th (4 per bar) across 8 bars = 32; 0 = rest
const BATTLE_MEL = [
  N.A5, 0, N.G5, N.A5,  0, N.E5, 0, N.A5,
  N.F5, 0, N.E5, N.D5,  N.E5, 0, N.D5, 0,
  N.G5, 0, N.E5, N.C5,  N.A5, 0, N.G5, N.A5,
  N.Gs4 * 2, 0, N.B4 * 2, 0,  N.A5, 0, N.E5, 0
];

function scheduler() {
  if (!ctx || !currentTrack) return;
  while (nextNoteTime < ctx.currentTime + 0.2) {
    if (currentTrack === 'world') scheduleWorld(nextNoteTime, step);
    else scheduleBattle(nextNoteTime, step);
    const beat = currentTrack === 'world' ? 0.34 : 0.152;
    nextNoteTime += beat;
    step++;
  }
}

function scheduleWorld(t, s) {
  const beatInBar = s % 3;
  const bar = Math.floor(s / 3) % 8;
  const ch = WORLD_PROG[bar];

  if (beatInBar === 0) {
    // downbeat: sub-bass + sustained pad for the whole bar + soft tick
    voice(ch.root / 2, t, 0.55, { type: 'triangle', gain: 0.26, cutoff: 700, attack: 0.01, release: 0.2 });
    pad(ch.triad, t, 1.02, 0.045, 'sine');
    tick(t, 0.035);
  } else {
    // up-beats: gentle plucked chord stabs (the "oom-pah-pah")
    voice(ch.triad[1], t, 0.26, { type: 'triangle', gain: 0.09, cutoff: 2200, release: 0.12 });
    voice(ch.triad[2], t, 0.26, { type: 'triangle', gain: 0.07, cutoff: 2200, release: 0.12 });
    tick(t, 0.02);
  }

  // lead melody (music-box bell)
  const mel = WORLD_MEL[s % WORLD_MEL.length];
  if (mel) {
    voice(mel, t, 0.5, { type: 'triangle', gain: 0.15, cutoff: 3200, attack: 0.01, release: 0.25 });
    voice(mel * 2, t, 0.4, { type: 'sine', gain: 0.04, attack: 0.01, release: 0.2 }); // shimmer
  }
  // high music-box arpeggio counter-line
  voice(ch.triad[beatInBar % 3] * 2, t, 0.22, { type: 'sine', gain: 0.05, release: 0.1 });
}

function scheduleBattle(t, s) {
  const step8 = s % 4;          // 8th within the bar
  const bar = Math.floor(s / 4) % 8;
  const ch = BATTLE_PROG[bar];

  // pulsing sub-bass on every 8th, accent on the beat
  voice(ch.root / 2, t, 0.16, { type: 'sawtooth', gain: step8 % 2 === 0 ? 0.17 : 0.1, cutoff: 600, release: 0.05 });
  // sustained pad once per bar
  if (step8 === 0) pad(ch.triad, t, 0.62, 0.04, 'sine');
  // arpeggio drive (bright square through a filter)
  voice(ch.arp[step8], t, 0.14, { type: 'square', gain: 0.06, cutoff: 2600, release: 0.05 });

  // lead melody
  const mel = BATTLE_MEL[s % BATTLE_MEL.length];
  if (mel) voice(mel, t, 0.26, { type: 'triangle', gain: 0.16, cutoff: 3400, attack: 0.01, release: 0.12 });

  // percussion: kick on beats, snare on the back-beat, hats on off-8ths
  if (step8 === 0) noiseHit(t, 0.09, 0.13, 150, musicGain);
  if (step8 === 2) noiseHit(t, 0.12, 0.10, 1600, musicGain);
  if (step8 % 2 === 1) tick(t, 0.028);
}

function playTrack(name) {
  init();
  if (!ctx) return;
  if (currentTrack === name && schedTimer) return;
  currentTrack = name;
  step = 0;
  nextNoteTime = ctx.currentTime + 0.06;
  if (!schedTimer) schedTimer = setInterval(scheduler, 25);
}

function stopMusic() {
  currentTrack = null;
  if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
}

// ---- sound effects ---------------------------------------------
const SFX = {
  select() { if (!ready()) return; const t = ctx.currentTime; note(N.E5, t, 0.08, 'square', 0.2, sfxGain); },
  confirm() { if (!ready()) return; const t = ctx.currentTime; note(N.C5, t, 0.08, 'square', 0.2, sfxGain); note(N.G5, t + 0.07, 0.1, 'square', 0.2, sfxGain); },
  hit(power) { if (!ready()) return; const t = ctx.currentTime; noiseHit(t, 0.14, 0.4, 700, sfxGain); note(120, t, 0.12, 'sawtooth', 0.25, sfxGain, 60); },
  superhit() { if (!ready()) return; const t = ctx.currentTime; noiseHit(t, 0.22, 0.5, 500, sfxGain); note(160, t, 0.2, 'sawtooth', 0.3, sfxGain, 50); },
  faint() { if (!ready()) return; const t = ctx.currentTime; note(N.A4, t, 0.5, 'triangle', 0.25, sfxGain, 80); },
  levelup() { if (!ready()) return; const t = ctx.currentTime; [N.C5, N.E5, N.G5, N.C5 * 2].forEach((f, i) => note(f, t + i * 0.09, 0.18, 'square', 0.18, sfxGain)); },
  throw() { if (!ready()) return; const t = ctx.currentTime; note(300, t, 0.2, 'sine', 0.18, sfxGain, 700); },
  catch() { if (!ready()) return; const t = ctx.currentTime; [N.C5, N.E5, N.G5].forEach((f, i) => note(f, t + i * 0.12, 0.22, 'triangle', 0.2, sfxGain)); },
  fizzle() { if (!ready()) return; const t = ctx.currentTime; note(N.G4, t, 0.18, 'sawtooth', 0.2, sfxGain, N.C4); },
  step() { if (!ready()) return; const t = ctx.currentTime; noiseHit(t, 0.04, 0.05, 500, sfxGain); },
  flee() { if (!ready()) return; const t = ctx.currentTime; note(N.G4, t, 0.1, 'square', 0.15, sfxGain); note(N.C5, t + 0.08, 0.12, 'square', 0.15, sfxGain); },
  // elemental move "cast" cues
  move(type) {
    if (!ready()) return;
    const t = ctx.currentTime;
    switch (type) {
      case 'Fire': noiseHit(t, 0.3, 0.3, 900, sfxGain); note(200, t, 0.3, 'sawtooth', 0.12, sfxGain, 400); break;
      case 'Water': note(900, t, 0.25, 'sine', 0.2, sfxGain, 300); break;
      case 'Electric': for (let i = 0; i < 3; i++) note(1600 + i * 200, t + i * 0.05, 0.06, 'square', 0.18, sfxGain); break;
      case 'Ice': note(1400, t, 0.3, 'triangle', 0.16, sfxGain, 2000); noiseHit(t, 0.12, 0.12, 3000, sfxGain); break;
      case 'Rock': noiseHit(t, 0.2, 0.35, 300, sfxGain); note(90, t, 0.2, 'square', 0.2, sfxGain); break;
      case 'Grass': note(500, t, 0.22, 'triangle', 0.16, sfxGain, 800); break;
      case 'Flying': note(700, t, 0.18, 'sine', 0.14, sfxGain, 1600); break;
      case 'Ghost': note(400, t, 0.4, 'sine', 0.16, sfxGain, 200); note(404, t, 0.4, 'sine', 0.14, sfxGain, 198); break;
      default: noiseHit(t, 0.1, 0.2, 800, sfxGain);
    }
  },
  // ---- evolution cues ----
  evolveStart() { if (!ready()) return; const t = ctx.currentTime; note(N.C4, t, 1.0, 'triangle', 0.12, sfxGain, N.G4); },
  evolvePing(k) { if (!ready()) return; const t = ctx.currentTime; const f = 440 * Math.pow(2, k * 1.5); note(f, t, 0.09, 'square', 0.14, sfxGain); },
  evolveDone() {
    if (!ready()) return;
    const t = ctx.currentTime;
    [N.C5, N.E5, N.G5, N.C5 * 2, N.E5 * 2].forEach((f, i) => note(f, t + i * 0.11, 0.4, 'triangle', 0.2, sfxGain));
    note(N.C4, t, 1.4, 'sine', 0.16, sfxGain);
    note(N.G4, t + 0.2, 1.2, 'sine', 0.12, sfxGain);
  }
};

function ready() { return ctx && enabled && started; }

// ---- public API -------------------------------------------------
function resume() {
  init();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  started = true;
}
function setEnabled(v) {
  enabled = v;
  init();
  if (!master) return;
  master.gain.setTargetAtTime(v ? 0.9 : 0.0, ctx.currentTime, 0.05);
}
function isEnabled() { return enabled; }

window.AUDIO = {
  resume, setEnabled, isEnabled,
  playWorld: () => { if (enabled) playTrack('world'); },
  playBattle: () => { if (enabled) playTrack('battle'); },
  stop: stopMusic,
  sfx: SFX,
};
})();
