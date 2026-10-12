// Turns the model's reply into exactly one { meaning, note } per input line.
// Models occasionally wrap JSON in prose or code fences, skip a line, or
// return them out of order; this handles all three instead of failing the
// whole song.

function extractJson(text) {
  const s = String(text ?? '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

const clean = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function parseTranslation(text, count) {
  const data = extractJson(text);
  if (!data || !Array.isArray(data.lines)) return { ok: false, error: 'The model did not return JSON lines.' };
  const out = Array.from({ length: count }, () => null);
  data.lines.forEach((entry, pos) => {
    if (!entry || typeof entry !== 'object') return;
    const i = Number.isInteger(entry.i) ? entry.i : pos;
    if (i < 0 || i >= count || out[i]) return;
    const meaning = clean(entry.meaning, 400);
    if (meaning) out[i] = { meaning, note: clean(entry.note, 300) };
  });
  const missing = out.filter((x) => !x).length;
  return { ok: true, lines: out.map((x) => x ?? { meaning: '', note: null }), missing };
}
