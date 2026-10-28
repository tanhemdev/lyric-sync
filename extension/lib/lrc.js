// Parses LRC, the plain-text format for time-synced lyrics that LRCLIB and
// most lyric players use:
//
//   [ar:Artist]
//   [offset:+250]
//   [00:12.40]first line
//   [00:15.10][01:02.00]a line that repeats (two timestamps)
//
// Returns { meta, lines: [{ t, text }] } with t in milliseconds, sorted.

const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const META = /^\[([a-z]+):(.*)\]$/i;
const WORD_STAMP = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g; // "enhanced" LRC word timing

function stampToMs(min, sec, frac = '') {
  const f = frac ? Number(frac.padEnd(3, '0').slice(0, 3)) : 0;
  return Number(min) * 60000 + Number(sec) * 1000 + f;
}

export function parseLrc(source) {
  const meta = {};
  const lines = [];
  for (const raw of String(source ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const stamps = [];
    let rest = line;
    STAMP.lastIndex = 0;
    let m;
    // Timestamps are only valid at the start of a line, one after another.
    while ((m = STAMP.exec(rest)) && m.index === 0) {
      stamps.push(stampToMs(m[1], m[2], m[3]));
      rest = rest.slice(m[0].length);
      STAMP.lastIndex = 0;
    }
    if (stamps.length) {
      const text = rest.replace(WORD_STAMP, '').replace(/\s+/g, ' ').trim();
      for (const t of stamps) lines.push({ t, text });
      continue;
    }
    const tag = line.match(META);
    if (tag) meta[tag[1].toLowerCase()] = tag[2].trim();
  }
  // LRC spec: a positive offset makes lyrics appear sooner.
  const offset = Number(meta.offset) || 0;
  for (const l of lines) l.t = Math.max(0, l.t - offset);
  lines.sort((a, b) => a.t - b.t);
  return { meta, lines };
}

// Index of the line that should be highlighted at `ms`, or -1 before the
// first line. Binary search, since it runs on every animation frame.
export function lineIndexAt(lines, ms) {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

// How far through the current line we are (0..1), for the progress underline.
export function lineProgress(lines, i, ms, endMs) {
  if (i < 0 || i >= lines.length) return 0;
  const start = lines[i].t;
  const end = i + 1 < lines.length ? lines[i + 1].t : endMs ?? start + 4000;
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (ms - start) / (end - start)));
}

export function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
