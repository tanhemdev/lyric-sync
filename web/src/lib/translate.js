// Client for the translation function (api/translate.js). Two things keep it
// fast and cheap:
//   - repeated lines (choruses) are sent once and mapped back;
//   - finished translations are cached per track and language, so replaying a
//     song costs nothing.

export const MAX_LINES_PER_REQUEST = 120;

// Unique, non-empty lines in first-seen order, plus where each line maps.
export function dedupe(texts) {
  const unique = [];
  const seen = new Map();
  const map = texts.map((text) => {
    const key = text.trim();
    if (!key) return -1;
    if (!seen.has(key)) {
      seen.set(key, unique.length);
      unique.push(key);
    }
    return seen.get(key);
  });
  return { unique, map };
}

export function cacheKey(trackId, lang) {
  return `lyricsync.tr.v1.${lang}.${trackId}`;
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    s.getItem('x');
    return s;
  } catch {
    return null;
  }
}

// Returns an array aligned with `texts`: { meaning, note } or null for blank lines.
export async function translateLines({ endpoint, trackId, title, artist, texts, lang = 'en', fetchImpl = fetch, storage = safeStorage() }) {
  const key = trackId ? cacheKey(trackId, lang) : null;
  if (key && storage) {
    try {
      const hit = JSON.parse(storage.getItem(key) || 'null');
      if (Array.isArray(hit) && hit.length === texts.length) return hit;
    } catch {
      /* ignore a corrupt cache entry */
    }
  }

  const { unique, map } = dedupe(texts);
  const translated = [];
  for (let start = 0; start < unique.length; start += MAX_LINES_PER_REQUEST) {
    const lines = unique.slice(start, start + MAX_LINES_PER_REQUEST);
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, lang, lines }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Translation failed (${res.status})`);
    if (!Array.isArray(data.lines) || data.lines.length !== lines.length) throw new Error('Translation came back incomplete');
    translated.push(...data.lines);
  }

  const result = map.map((i) => (i < 0 ? null : { meaning: translated[i]?.meaning ?? '', note: translated[i]?.note ?? null }));
  if (key && storage) {
    try {
      storage.setItem(key, JSON.stringify(result));
    } catch {
      /* storage full: fine, we just won't cache */
    }
  }
  return result;
}
