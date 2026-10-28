// Finds time-synced lyrics on LRCLIB (https://lrclib.net), a free, open lyrics
// database, at play time on the listener's computer. The only things sent are
// the song's title, artist, album and length. Nothing is stored in this repo.

import { norm } from './featured.js';

export const BASE = 'https://lrclib.net/api';

export function getUrl({ title, artist, album, durationMs }) {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  if (album) params.set('album_name', album);
  if (durationMs) params.set('duration', String(Math.round(durationMs / 1000)));
  return `${BASE}/get?${params}`;
}

export function searchUrl({ title, artist }) {
  return `${BASE}/search?${new URLSearchParams({ track_name: title, artist_name: artist })}`;
}

// Players credit several artists ("Bad Bunny, Chuwi"); LRCLIB lists the lead.
export const leadArtist = (artist) => String(artist ?? '').split(/,|&| feat\.? | ft\.? | x /i)[0].trim();

// LRCLIB is a free community service and sometimes answers 429 or 503 when
// it's busy, so those get a couple of retries with a growing pause.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, fetchImpl = fetch, { tries = 3, delayMs = 800, sleepImpl = sleep } = {}) {
  let res;
  for (let i = 0; i < tries; i++) {
    res = await fetchImpl(url);
    if (res.status !== 429 && res.status < 500) return res;
    if (i < tries - 1) await sleepImpl(delayMs * 2 ** i);
  }
  return res;
}

const busyError = () => new Error('LRCLIB, the free lyrics service, is busy right now. Try again in a minute.');

// Share of the letters in `text` (timestamps aside) written in the script of
// `lang`, for languages with their own script; 1 for everything else.
const SCRIPT = { ko: /\p{Script=Hangul}/u, hi: /\p{Script=Devanagari}/u };

export function scriptShare(text, lang) {
  const re = SCRIPT[lang];
  if (!re) return 1;
  const letters = String(text ?? '').replace(/\[[^\]]*\]/g, '').match(/\p{L}/gu) ?? [];
  if (!letters.length) return 0;
  return letters.filter((ch) => re.test(ch)).length / letters.length;
}

// From search results, the synced version whose length is closest to the
// track playing (within 3 seconds), preferring an exact title match.
export function pickBest(results, { title, durationMs }) {
  const target = durationMs ? durationMs / 1000 : null;
  const candidates = (Array.isArray(results) ? results : [])
    .filter((r) => r?.syncedLyrics && !r.instrumental)
    .filter((r) => target == null || Math.abs((r.duration ?? 0) - target) <= 3)
    .map((r) => ({ r, score: (norm(r.trackName) === norm(title) ? 0 : 10) + (target == null ? 0 : Math.abs((r.duration ?? target) - target)) }))
    .sort((a, b) => a.score - b.score);
  return candidates[0]?.r ?? null;
}

const result = (r) => ({
  synced: r.syncedLyrics ?? null,
  plain: r.plainLyrics ?? null,
  instrumental: !!r.instrumental,
  durationMs: r.duration ? r.duration * 1000 : null,
});

// Lyrics for whatever is playing. Returns { synced, plain, instrumental,
// durationMs } or null when LRCLIB has nothing for it.
export async function findLyrics(track, fetchImpl = fetch, retry) {
  const artist = track.artist ?? '';
  const exact = await fetchWithRetry(getUrl({ ...track, artist }), fetchImpl, retry);
  if (exact.ok) {
    const r = await exact.json();
    if (r?.instrumental || r?.syncedLyrics) return result(r);
  } else if (exact.status === 429 || exact.status >= 500) {
    throw busyError();
  }
  const search = await fetchWithRetry(searchUrl({ title: track.title, artist: leadArtist(artist) }), fetchImpl, retry);
  if (!search.ok) {
    if (search.status === 429 || search.status >= 500) throw busyError();
    return null;
  }
  const list = await search.json();
  const best = pickBest(list, track);
  if (best) return result(best);
  // No synced version: plain lyrics are still worth showing.
  const plain = (Array.isArray(list) ? list : []).find((r) => r?.plainLyrics && !r.instrumental);
  return plain ? { ...result(plain), synced: null } : null;
}

// Lyrics for one of the featured songs: its chosen LRCLIB entry or, if that's
// gone, the best synced search result written in the song's own script.
export async function getFeaturedLyrics(song, fetchImpl = fetch, retry) {
  const byId = await fetchWithRetry(`${BASE}/get/${song.lrclibId}`, fetchImpl, retry);
  if (byId.ok) {
    const r = await byId.json();
    if (r?.syncedLyrics && scriptShare(r.syncedLyrics, song.lang) >= 0.3) return result(r);
  }
  const search = await fetchWithRetry(searchUrl(song), fetchImpl, retry);
  if (!search.ok) {
    if (search.status === 429 || search.status >= 500) throw busyError();
    throw new Error(`LRCLIB answered ${search.status}.`);
  }
  const best = ((await search.json()) ?? [])
    .filter((r) => r?.syncedLyrics && !r.instrumental && scriptShare(r.syncedLyrics, song.lang) >= 0.3)
    .sort((a, b) => scriptShare(b.syncedLyrics, song.lang) - scriptShare(a.syncedLyrics, song.lang))[0];
  if (!best) throw new Error(`LRCLIB doesn't have synced lyrics for ${song.title} right now.`);
  return result(best);
}
