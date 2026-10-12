import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { base64url, codeChallenge, randomString, authorizeUrl, exchangeCode, getNowPlaying, toNowPlaying, SpotifyAuthError } from '../src/lib/spotify.js';
import { getUrl, pickBest, findLyrics } from '../src/lib/lrclib.js';
import { dedupe, translateLines, cacheKey } from '../src/lib/translate.js';

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('PKCE challenge matches the example in RFC 7636', async () => {
  const challenge = await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', webcrypto);
  assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  assert.equal(base64url(new Uint8Array([251, 255])), '-_8');
  const v = randomString(64, webcrypto);
  assert.match(v, /^[A-Za-z0-9\-._~]{64}$/);
});

test('authorize URL asks only for read access to what is playing', () => {
  const url = new URL(authorizeUrl({ clientId: 'abc', redirectUri: 'https://x.dev/app/', challenge: 'ch', state: 'st' }));
  assert.equal(url.origin + url.pathname, 'https://accounts.spotify.com/authorize');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'user-read-currently-playing user-read-playback-state');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://x.dev/app/');
});

test('code exchange posts the verifier and no client secret', async () => {
  let sent;
  const fetchImpl = async (url, init) => {
    sent = { url, body: new URLSearchParams(init.body) };
    return json({ access_token: 'A', refresh_token: 'R', expires_in: 3600 });
  };
  const tokens = await exchangeCode({ clientId: 'abc', code: 'c0de', redirectUri: 'https://x.dev/', verifier: 'v', fetchImpl });
  assert.equal(sent.url, 'https://accounts.spotify.com/api/token');
  assert.equal(sent.body.get('code_verifier'), 'v');
  assert.equal(sent.body.get('client_secret'), null);
  assert.equal(tokens.accessToken, 'A');
  assert.equal(tokens.refreshToken, 'R');
});

test('now playing: tracks, nothing playing, and expired sessions', async () => {
  const track = {
    currently_playing_type: 'track',
    is_playing: true,
    progress_ms: 42_000,
    item: { id: 't1', name: 'Song Title', duration_ms: 200_000, artists: [{ name: 'Artist A' }, { name: 'Artist B' }], album: { name: 'Album', images: [{ url: 'big' }, { url: 'mid' }] } },
  };
  assert.deepEqual(await getNowPlaying('tok', async () => json(track)), {
    trackId: 't1',
    title: 'Song Title',
    artists: ['Artist A', 'Artist B'],
    album: 'Album',
    art: 'mid',
    durationMs: 200_000,
    progressMs: 42_000,
    isPlaying: true,
  });
  assert.equal(await getNowPlaying('tok', async () => ({ ok: true, status: 204 })), null);
  assert.equal(toNowPlaying({ currently_playing_type: 'episode', item: {} }), null);
  await assert.rejects(getNowPlaying('tok', async () => json({}, 401)), SpotifyAuthError);
});

test('LRCLIB lookup uses the exact track first, then search', async () => {
  const u = new URL(getUrl({ title: 'Song Title', artist: 'Artist A', album: 'Album', durationMs: 200_400 }));
  assert.equal(u.searchParams.get('duration'), '200');
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(new URL(url).pathname);
    if (url.includes('/get?')) return json({ code: 404 }, 404);
    return json([
      { trackName: 'Song Title (Live)', duration: 260, syncedLyrics: '[00:01.00]wrong length' },
      { trackName: 'Song Title', duration: 201, syncedLyrics: '[00:01.00]right one', plainLyrics: 'right one' },
      { trackName: 'Song Title', duration: 200, syncedLyrics: null, plainLyrics: 'unsynced' },
    ]);
  };
  const found = await findLyrics({ title: 'Song Title', artists: ['Artist A'], album: 'Album', durationMs: 200_000 }, fetchImpl);
  assert.deepEqual(calls, ['/api/get', '/api/search']);
  assert.equal(found.synced, '[00:01.00]right one');
  assert.equal(pickBest([], { title: 'x', durationMs: 1000 }), null);
});

test('LRCLIB: instrumental tracks and missing songs', async () => {
  assert.deepEqual(await findLyrics({ title: 'Inst', artists: ['A'], durationMs: 1000 }, async () => json({ instrumental: true })), {
    synced: null,
    plain: null,
    instrumental: true,
  });
  const none = async (url) => (url.includes('/get?') ? json({}, 404) : json([]));
  assert.equal(await findLyrics({ title: 'Nope', artists: ['A'], durationMs: 1000 }, none), null);
});

test('dedupe sends each chorus line once', () => {
  const { unique, map } = dedupe(['la la', 'verse', 'la la', '', ' verse ']);
  assert.deepEqual(unique, ['la la', 'verse']);
  assert.deepEqual(map, [0, 1, 0, -1, 1]);
});

test('translateLines maps results back, caches, and serves the cache next time', async () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  let requests = 0;
  const fetchImpl = async (url, init) => {
    requests++;
    const { lines } = JSON.parse(init.body);
    assert.deepEqual(lines, ['uno', 'dos']);
    return json({ lines: lines.map((l) => ({ meaning: `[${l}]`, note: l === 'dos' ? 'a note' : null })) });
  };
  const args = { endpoint: '/api/translate', trackId: 't1', title: 'T', artist: 'A', texts: ['uno', 'dos', '', 'uno'], lang: 'en', fetchImpl, storage };
  const out = await translateLines(args);
  assert.deepEqual(out, [{ meaning: '[uno]', note: null }, { meaning: '[dos]', note: 'a note' }, null, { meaning: '[uno]', note: null }]);
  assert.ok(store.has(cacheKey('t1', 'en')));
  assert.deepEqual(await translateLines(args), out);
  assert.equal(requests, 1, 'second call came from the cache');
});

test('translateLines surfaces server errors', async () => {
  const fetchImpl = async () => json({ error: 'This deployment has no ANTHROPIC_API_KEY set.' }, 500);
  await assert.rejects(translateLines({ endpoint: '/x', texts: ['a'], fetchImpl, storage: null }), /ANTHROPIC_API_KEY/);
});
