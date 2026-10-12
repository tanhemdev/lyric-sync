// Looks up time-synced lyrics on LRCLIB (https://lrclib.net), a free, open
// lyrics database. Lyrics are fetched at play time in the listener's browser;
// none are stored in this repository.

const BASE = 'https://lrclib.net/api';

export function getUrl({ title, artist, album, durationMs }) {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  if (album) params.set('album_name', album);
  if (durationMs) params.set('duration', String(Math.round(durationMs / 1000)));
  return `${BASE}/get?${params}`;
}

export function searchUrl({ title, artist }) {
  return `${BASE}/search?${new URLSearchParams({ track_name: title, artist_name: artist })}`;
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]|- .*remaster.*$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// From search results, pick the synced version whose length is closest to
// the track Spotify is playing (within 3 seconds), preferring a title match.
export function pickBest(results, { title, durationMs }) {
  const target = durationMs / 1000;
  const candidates = (results ?? [])
    .filter((r) => r.syncedLyrics && !r.instrumental)
    .filter((r) => !durationMs || Math.abs((r.duration ?? 0) - target) <= 3)
    .map((r) => ({ r, score: (norm(r.trackName) === norm(title) ? 0 : 10) + Math.abs((r.duration ?? target) - target) }))
    .sort((a, b) => a.score - b.score);
  return candidates[0]?.r ?? null;
}

// Returns { synced, plain, instrumental } or null when LRCLIB has nothing.
export async function findLyrics(track, fetchImpl = fetch) {
  const artist = track.artists?.[0] ?? track.artist ?? '';
  const exact = await fetchImpl(getUrl({ title: track.title, artist, album: track.album, durationMs: track.durationMs }));
  if (exact.ok) {
    const r = await exact.json();
    if (r.instrumental) return { synced: null, plain: null, instrumental: true };
    if (r.syncedLyrics) return { synced: r.syncedLyrics, plain: r.plainLyrics ?? null, instrumental: false };
  } else if (exact.status !== 404) {
    throw new Error(`LRCLIB returned ${exact.status}`);
  }
  const search = await fetchImpl(searchUrl({ title: track.title, artist }));
  if (!search.ok) return null;
  const best = pickBest(await search.json(), track);
  return best ? { synced: best.syncedLyrics, plain: best.plainLyrics ?? null, instrumental: false } : null;
}
