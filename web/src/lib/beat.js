// A tiny drum machine for the demo songs, built with the Web Audio API, so the
// demo has something to listen to without shipping any recorded music.
// It reads the shared playback clock, so seeking and pausing stay in sync.

// 16 steps per bar. Dembow is the reggaeton rhythm: kick on every beat,
// snare on the "3-3-2" offbeats.
export const PATTERNS = {
  dembow: { kick: [0, 4, 8, 12], snare: [3, 6, 11, 14], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  ballad: { kick: [0, 10], snare: [8], hat: [0, 4, 8, 12] },
};

// Every hit that falls in [fromMs, toMs), for a given tempo and pattern.
export function hitsBetween(fromMs, toMs, bpm, pattern) {
  const stepMs = 60000 / bpm / 4;
  const hits = [];
  const first = Math.ceil(fromMs / stepMs - 1e-9);
  for (let step = first; step * stepMs < toMs; step++) {
    const s = ((step % 16) + 16) % 16;
    for (const voice of ['kick', 'snare', 'hat']) {
      if (pattern[voice].includes(s)) hits.push({ voice, ms: step * stepMs });
    }
  }
  return hits;
}

export function createBeat({ clock, bpm, pattern, startMs = 0, endMs = Infinity }) {
  let ctx = null;
  let noise = null;
  let timer = null;
  let scheduledUntil = -1;
  let lastPos = -1;
  let volume = 0.5;
  let master = null;

  function ensureContext() {
    if (ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function play(voice, when) {
    if (voice === 'kick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(130, when);
      o.frequency.exponentialRampToValueAtTime(45, when + 0.18);
      g.gain.setValueAtTime(0.9, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.28);
      o.connect(g).connect(master);
      o.start(when);
      o.stop(when + 0.3);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const long = voice === 'snare';
    f.type = long ? 'bandpass' : 'highpass';
    f.frequency.value = long ? 1800 : 7000;
    g.gain.setValueAtTime(long ? 0.5 : 0.18, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + (long ? 0.14 : 0.04));
    src.connect(f).connect(g).connect(master);
    src.start(when);
    src.stop(when + 0.2);
  }

  function tick() {
    if (!ctx || !clock.playing) return;
    const pos = clock.position();
    if (pos < lastPos - 50 || pos > scheduledUntil + 400) scheduledUntil = pos; // after a seek
    lastPos = pos;
    const until = Math.min(pos + 150, endMs);
    if (until <= scheduledUntil) return;
    for (const hit of hitsBetween(Math.max(scheduledUntil, startMs), until, bpm, pattern)) {
      play(hit.voice, ctx.currentTime + Math.max(0, (hit.ms - pos) / 1000));
    }
    scheduledUntil = until;
  }

  return {
    start() {
      ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      scheduledUntil = clock.position();
      clearInterval(timer);
      timer = setInterval(tick, 25);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    setVolume(v) {
      volume = v;
      if (master) master.gain.value = v;
    },
    close() {
      clearInterval(timer);
      ctx?.close();
      ctx = null;
    },
  };
}
