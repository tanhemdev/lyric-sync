// Checks a translation request before it reaches the model.
// Files in api/_lib are helpers; Vercel doesn't turn them into endpoints.

export const LANGS = {
  en: 'English',
  es: 'Spanish',
  hi: 'Hindi',
  ko: 'Korean',
  pt: 'Portuguese',
  fr: 'French',
};

export const LIMITS = { maxLines: 150, maxLineChars: 300, maxMetaChars: 200 };

export function validateRequest(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send a JSON body.' };
  const { title = '', artist = '', lang = 'en', lines } = body;
  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: 'lines must be a non-empty array of strings.' };
  if (lines.length > LIMITS.maxLines) return { ok: false, error: `At most ${LIMITS.maxLines} lines per request.` };
  if (!lines.every((l) => typeof l === 'string')) return { ok: false, error: 'Every line must be a string.' };
  if (lines.some((l) => l.length > LIMITS.maxLineChars)) return { ok: false, error: `Lines are limited to ${LIMITS.maxLineChars} characters.` };
  if (typeof title !== 'string' || typeof artist !== 'string') return { ok: false, error: 'title and artist must be strings.' };
  if (title.length > LIMITS.maxMetaChars || artist.length > LIMITS.maxMetaChars) return { ok: false, error: 'title or artist is too long.' };
  if (!Object.hasOwn(LANGS, lang)) return { ok: false, error: `lang must be one of: ${Object.keys(LANGS).join(', ')}.` };
  return { ok: true, value: { title: title.trim(), artist: artist.trim(), lang, lines: lines.map((l) => l.trim()) } };
}

// CORS: the browser app may live on another origin (GitHub Pages) than this
// function (Vercel). Only origins listed in ALLOWED_ORIGINS may call it.
export function corsHeaders(origin, allowed = '') {
  const list = allowed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin || !list.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
