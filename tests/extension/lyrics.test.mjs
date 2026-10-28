// LRCLIB lookups for the extension. All lyric text here is made up for the
// tests; no real lyrics are used or stored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUrl, searchUrl, leadArtist, pickBest, fetchWithRetry, findLyrics, getFeaturedLyrics, scriptShare } from '../../extension/lib/lyrics.js';

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const noWait = { sleepImpl: async () => {} };

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    for (const [match, reply] of routes) if (url.includes(match)) return typeof reply === 'function' ? reply(url) : reply;
    return json({ message: 'not found' }, 404);
  };
  fn.calls = calls;
  return fn;
}

test('builds LRCLIB urls with the track length in whole seconds', () => {
  const url = new URL(getUrl({ title: 'Una Canción', artist: 'Banda', album: 'Disco', durationMs: 201600 }));
  assert.equal(url.pathname, '/api/get');
  assert.equal(url.searchParams.get('track_name'), 'Una Canción');
  assert.equal(url.searchParams.get('duration'), '202');
  assert.equal(new URL(searchUrl({ title: 'A', artist: 'B' })).searchParams.get('artist_name'), 'B');
});

test('searches with the lead artist when players credit several', () => {
  assert.equal(leadArtist('Mithoon, Arijit Singh'), 'Mithoon');
  assert.equal(leadArtist('Bad Bunny feat. Someone'), 'Bad Bunny');
  assert.equal(leadArtist('BTS'), 'BTS');
});

test('picks the synced result closest in length, preferring the same title', () => {
  const results = [
    { trackName: 'Other', duration: 200, syncedLyrics: '[00:01.00]x' },
    { trackName: 'Song', duration: 199, syncedLyrics: '[00:01.00]y' },
    { trackName: 'Song', duration: 260, syncedLyrics: '[00:01.00]too long' },
    { trackName: 'Song', duration: 200, plainLyrics: 'no timing' },
    { trackName: 'Song', duration: 200, instrumental: true },
  ];
  assert.equal(pickBest(results, { title: 'Song', durationMs: 200000 }).syncedLyrics, '[00:01.00]y');
  assert.equal(pickBest([], { title: 'Song', durationMs: 200000 }), null);
  assert.equal(pickBest(null, { title: 'Song' }), null);
});

test('retries when LRCLIB is busy, with a growing pause', async () => {
  const waits = [];
  let n = 0;
  const res = await fetchWithRetry('u', async () => (++n < 3 ? json({}, 503) : json({ ok: 1 })), { sleepImpl: async (ms) => waits.push(ms), delayMs: 100 });
  assert.equal(res.status, 200);
  assert.deepEqual(waits, [100, 200]);
});

test('finds lyrics with the exact lookup first', async () => {
  const f = fakeFetch([['/api/get?', json({ syncedLyrics: '[00:01.00]línea de prueba', duration: 30 })]]);
  const found = await findLyrics({ title: 'Prueba', artist: 'Banda', durationMs: 30000 }, f, noWait);
  assert.equal(found.synced, '[00:01.00]línea de prueba');
  assert.equal(found.durationMs, 30000);
  assert.equal(f.calls.length, 1);
});

test('falls back to search, then to plain lyrics, then to nothing', async () => {
  const synced = fakeFetch([['/api/search?', json([{ trackName: 'Prueba', duration: 30, syncedLyrics: '[00:02.00]otra línea' }])]]);
  assert.equal((await findLyrics({ title: 'Prueba', artist: 'Banda, Otra', durationMs: 31000 }, synced, noWait)).synced, '[00:02.00]otra línea');
  assert.match(synced.calls[1], /artist_name=Banda$/);

  const plain = fakeFetch([['/api/search?', json([{ trackName: 'Prueba', duration: 30, plainLyrics: 'sin tiempos' }])]]);
  const found = await findLyrics({ title: 'Prueba', artist: 'Banda', durationMs: 30000 }, plain, noWait);
  assert.equal(found.synced, null);
  assert.equal(found.plain, 'sin tiempos');

  assert.equal(await findLyrics({ title: 'Nada', artist: 'Nadie' }, fakeFetch([['/api/search?', json([])]]), noWait), null);
});

test('reports instrumentals, and says so when LRCLIB is busy', async () => {
  const inst = await findLyrics({ title: 'Solo', artist: 'Banda' }, fakeFetch([['/api/get?', json({ instrumental: true })]]), noWait);
  assert.equal(inst.instrumental, true);
  await assert.rejects(findLyrics({ title: 'X', artist: 'Y' }, fakeFetch([['/api/', json({}, 503)]]), noWait), /busy/);
});

test('featured songs use their chosen entry, or a search result in the right script', async () => {
  const song = { title: 'Prueba', artist: 'Banda', lang: 'hi', lrclibId: 42 };
  const byId = fakeFetch([['/api/get/42', json({ syncedLyrics: '[00:01.00]यह परीक्षण है', duration: 100 })]]);
  assert.equal((await getFeaturedLyrics(song, byId, noWait)).synced, '[00:01.00]यह परीक्षण है');

  // The chosen entry has turned into romanized text: search for one in Devanagari.
  const fallback = fakeFetch([
    ['/api/get/42', json({ syncedLyrics: '[00:01.00]yah pariksha hai', duration: 100 })],
    [
      '/api/search?',
      json([
        { syncedLyrics: '[00:01.00]yah pariksha hai', duration: 100 },
        { syncedLyrics: '[00:01.00]यह परीक्षण है', duration: 100 },
      ]),
    ],
  ]);
  assert.equal((await getFeaturedLyrics(song, fallback, noWait)).synced, '[00:01.00]यह परीक्षण है');
  await assert.rejects(getFeaturedLyrics(song, fakeFetch([['/api/search?', json([])]]), noWait), /doesn't have synced lyrics/);
});

test('measures how much of the text is in a language’s own script', () => {
  assert.equal(scriptShare('[00:01.00]테스트', 'ko'), 1);
  assert.equal(scriptShare('[00:01.00]ab 테스', 'ko'), 0.5);
  assert.equal(scriptShare('anything', 'es'), 1);
  assert.equal(scriptShare('', 'hi'), 0);
});
