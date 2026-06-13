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

// ---- note tables (Hz) ------------------------------------------
const N = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, Bb3:233.08,
  B4:493.88, C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  Gs4:415.30, Eb4:311.13, Bb4:466.16, Ab4:415.30, Fs4:369.99
};

// Overworld: gentle 3/4 clockwork waltz in A minor
const WORLD_BASS = [N.A3, N.E3, N.E3, N.F3, N.C4, N.C4, N.G3, N.D4, N.D4, N.E3, N.B3, N.B3];
const WORLD_MEL = [
  N.A4, N.C5, N.E5, N.D5, N.C5, N.B4,
  N.C5, N.E5, N.A5, N.G5, N.E5, N.C5,
  N.F4, N.A4, N.C5, N.E5, N.D5, N.C5,
  N.E4, N.Gs4, N.B4, N.A4, 0, 0
];

// Battle: tense 4/4 in A minor with arpeggio drive
const BATTLE_BASS = [N.A3, N.A3, N.G3, N.G3, N.F3, N.F3, N.E3, N.E3];
const BATTLE_ARP = [
  N.A4, N.E5, N.C5, N.E5, N.A4, N.E5, N.C5, N.E5,
  N.G4, N.D5, N.B4, N.D5, N.G4, N.D5, N.B4, N.D5,
  N.F4, N.C5, N.A4, N.C5, N.F4, N.C5, N.A4, N.C5,
  N.E4, N.B4, N.Gs4, N.B4, N.E5, N.B4, N.Gs4, N.B4
];
const BATTLE_MEL = [N.A5, 0, N.G5, N.A5, 0, N.E5, 0, 0, N.F5, 0, N.E5, N.D5, 0, N.C5, 0, 0];

function scheduler() {
  if (!ctx || !currentTrack) return;
  while (nextNoteTime < ctx.currentTime + 0.2) {
    if (currentTrack === 'world') scheduleWorld(nextNoteTime, step);
    else scheduleBattle(nextNoteTime, step);
    const beat = currentTrack === 'world' ? 0.34 : 0.156;
    nextNoteTime += beat;
    step++;
  }
}

function scheduleWorld(t, s) {
  const bar = Math.floor(s / 3);
  const beatInBar = s % 3;
  const bi = bar % 12;
  // bass on beat 1, chord stabs on 2 & 3 (waltz)
  if (beatInBar === 0) {
    note(WORLD_BASS[bi] / 2, t, 0.5, 'sine', 0.28);
    tick(t, 0.04);
  } else {
    const root = WORLD_BASS[bi];
    note(root, t, 0.28, 'triangle', 0.12);
    note(root * 1.5, t, 0.28, 'triangle', 0.09);
    tick(t, 0.025);
  }
  // melody: one note per beat, two bars per phrase note
  const mi = s % WORLD_MEL.length;
  if (WORLD_MEL[mi]) note(WORLD_MEL[mi], t, 0.46, 'triangle', 0.16);
}

function scheduleBattle(t, s) {
  const ai = s % BATTLE_ARP.length;
  const bi = Math.floor(s / 4) % BATTLE_BASS.length;
  // bass pulse every 2 steps
  if (s % 2 === 0) note(BATTLE_BASS[bi] / 2, t, 0.3, 'sawtooth', 0.16);
  // arpeggio drive
  note(BATTLE_ARP[ai], t, 0.13, 'square', 0.07);
  // melody every 2 steps
  if (s % 2 === 0) {
    const mi = Math.floor(s / 2) % BATTLE_MEL.length;
    if (BATTLE_MEL[mi]) note(BATTLE_MEL[mi], t, 0.26, 'triangle', 0.17);
  }
  // hi-hat tick
  if (s % 2 === 1) tick(t, 0.03);
  // kick on downbeats
  if (s % 4 === 0) noiseHit(t, 0.08, 0.12, 220, musicGain);
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
