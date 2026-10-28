// End-to-end test of the Chrome extension in headless Chromium, against
// stand-in Spotify, Apple Music and LRCLIB pages. Every lyric line here is
// made up for the test. Chrome's on-device translator isn't in test browsers,
// so a stand-in translator marks each line it translates with "[en]".
//
// Run: npx playwright install chromium && node tests/extension/e2e.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT = new URL('../../extension', import.meta.url).pathname;
const SHOTS = process.env.SHOTS_DIR;

const lrc = (lines, step = 1500, start = 500) =>
  lines.map((text, i) => {
    const ms = start + i * step;
    return `[${String(Math.floor(ms / 60000)).padStart(2, '0')}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}]${text}`;
  }).join('\n');

const SPANISH = ['Esta es la primera línea de prueba', 'La segunda línea de la canción inventada', 'Una tercera línea para el ensayo', 'Y la cuarta línea que no es real', 'La quinta línea de prueba otra vez', 'Esta es la primera línea de prueba'];
const KOREAN = ['테스트 가사 첫 줄입니다', 'oh oh test hook', '두 번째 테스트 줄입니다', '세 번째 줄도 만든 가사', 'oh oh test hook'];
const HINDI = ['यह परीक्षण की पहली पंक्ति है', 'यह दूसरी बनाई हुई पंक्ति है', 'तीसरी पंक्ति भी परीक्षण है'];
const SECOND = ['Otra canción de prueba empieza', 'con líneas que tampoco son reales', 'y una más para terminar'];

const entry = (lines, duration = 40) => ({ syncedLyrics: lrc(lines), plainLyrics: lines.join('\n'), duration, instrumental: false });

async function lrclib(route) {
  const url = new URL(route.request().url());
  const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  const p = url.searchParams;
  if (url.pathname === '/api/get/36840990') return reply(entry(SPANISH, 12));
  if (url.pathname === '/api/get/36804898') return reply(entry(KOREAN, 10));
  if (url.pathname === '/api/get/32902512') return reply(entry(HINDI, 8));
  if (url.pathname === '/api/get' && p.get('track_name') === 'Canción de Prueba') return reply(entry(SPANISH));
  if (url.pathname === '/api/search' && p.get('track_name') === 'Segunda Prueba') return reply([{ trackName: 'Segunda Prueba', ...entry(SECOND, 30) }]);
  return reply({ message: 'not found' }, 404);
}

// A silent 40-second WAV, so the stand-in players have real audio to play.
function silence(seconds = 40, rate = 8000) {
  const n = seconds * rate;
  const buf = Buffer.alloc(44 + n, 128);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n, 40);
  return buf;
}
const WAV = silence();
// A 1x1 green PNG for album art.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// Stand-in players. Spotify keeps its audio element out of the page; Apple
// Music's is in the page; the third shows only Spotify's on-screen clock.
const PLAYER = (inPage) => `<!doctype html><meta charset="utf-8"><title>Player</title><body><p>stand-in player</p><script>
  navigator.mediaSession.metadata = new MediaMetadata({ title: 'Canción de Prueba', artist: 'Banda Inventada, Otra Banda', album: 'Disco de Prueba', artwork: [{ src: '/__test/art.png', sizes: '64x64' }] });
  const a = new Audio('/__test/silence.wav');
  ${inPage ? 'document.body.append(a);' : ''}
  a.play();
  window.testPause = () => a.pause();
  window.testPlay = () => a.play();
  window.testNext = () => { navigator.mediaSession.metadata = new MediaMetadata({ title: 'Segunda Prueba', artist: 'Banda Inventada' }); a.currentTime = 0; };
</script>`;
const DOM_CLOCK = `<!doctype html><meta charset="utf-8"><title>Player</title><body>
  <button data-testid="control-button-playpause" aria-label="Pause"></button>
  <div data-testid="playback-position">0:00</div><div data-testid="playback-duration">0:40</div><script>
  navigator.mediaSession.metadata = new MediaMetadata({ title: 'Canción de Prueba', artist: 'Banda Inventada' });
  const start = Date.now();
  setInterval(() => { const s = Math.floor((Date.now() - start) / 1000); document.querySelector('[data-testid=playback-position]').textContent = '0:' + String(s).padStart(2, '0'); }, 200);
</script>`;

async function players(route) {
  const url = new URL(route.request().url());
  if (url.pathname === '/__test/silence.wav') return route.fulfill({ contentType: 'audio/wav', body: WAV });
  if (url.pathname === '/__test/art.png') return route.fulfill({ contentType: 'image/png', body: PNG });
  const body = url.pathname.includes('domclock') ? DOM_CLOCK : PLAYER(url.hostname.includes('apple'));
  return route.fulfill({ contentType: 'text/html; charset=utf-8', body });
}

// Stand-in for Chrome's on-device translator and language detector.
// Korean to English starts out "downloadable", like a fresh Chrome profile,
// and can only be created during a click, as in Chrome.
const STUB = () => {
  if (!location.href.startsWith('chrome-extension:')) return;
  const ready = new Set(['es>en', 'hi>en', 'es>fr']);
  globalThis.__translated = [];
  globalThis.Translator = {
    availability: async ({ sourceLanguage: s, targetLanguage: t }) => (ready.has(`${s}>${t}`) ? 'available' : s === 'ko' ? 'downloadable' : 'unavailable'),
    create: (opts) => {
      const pair = `${opts.sourceLanguage}>${opts.targetLanguage}`;
      if (!ready.has(pair) && !navigator.userActivation.isActive) return Promise.reject(new Error('needs a click'));
      ready.add(pair);
      return Promise.resolve({ translate: async (text) => (globalThis.__translated.push(text), `[${opts.targetLanguage}] ${text}`) });
    },
  };
  globalThis.LanguageDetector = {
    availability: async () => 'available',
    create: async () => ({ detect: async (text) => [{ detectedLanguage: /línea|canción/.test(text) ? 'es' : 'en', confidence: 0.9 }] }),
  };
};

async function launch({ stub = true } = {}) {
  const ctx = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), 'lyricsync-')), {
    channel: 'chromium',
    headless: true,
    viewport: { width: 380, height: 760 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required'],
  });
  if (stub) await ctx.addInitScript(STUB);
  else await ctx.addInitScript(() => { delete globalThis.Translator; delete globalThis.LanguageDetector; });
  await ctx.route('https://lrclib.net/**', lrclib);
  await ctx.route('https://open.spotify.com/**', players);
  await ctx.route('https://music.apple.com/**', players);
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const id = new URL(sw.url()).host;
  const errors = [];
  const panel = await ctx.newPage();
  panel.on('pageerror', (e) => errors.push(e.message));
  // A lookup LRCLIB answers with 404 shows up as a network message; that's expected.
  panel.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await panel.goto(`chrome-extension://${id}/panel.html`);
  return { ctx, panel, errors };
}

const currentIndex = (panel) => panel.locator('.line.current').evaluate((el) => Number(el.dataset.i)).catch(() => -1);
async function waitForIndex(panel, atLeast, timeout = 8000) {
  await panel.waitForFunction((n) => Number(document.querySelector('.line.current')?.dataset.i ?? -1) >= n, atLeast, { timeout });
}

// ---------- with the translator ----------
{
  const { ctx, panel, errors } = await launch();

  // Nothing playing: the three featured songs.
  await panel.getByRole('heading', { name: 'Play a song on Spotify or Apple Music' }).waitFor();
  const names = await panel.locator('.featured .name').allInnerTexts();
  assert.deepEqual(names, ['DtMF', 'FAKE LOVE', 'Tum Hi Ho']);
  assert.equal(await panel.locator('#pill').innerText(), 'Waiting for music');
  if (SHOTS) await panel.screenshot({ path: `${SHOTS}/idle.png` });

  // Preview a Spanish song: lyrics, translations, the highlight moves, tap to jump.
  await panel.getByRole('button', { name: 'Preview DtMF' }).click();
  await panel.locator('.line .tr:not([hidden])').first().waitFor();
  assert.equal(await panel.locator('#pill').innerText(), 'Preview');
  assert.equal(await panel.locator('#src').inputValue(), 'es');
  assert.equal(await panel.locator('.line').count(), SPANISH.length);
  assert.equal(await panel.locator('.line .tr').first().innerText(), `[en] ${SPANISH[0]}`);
  await waitForIndex(panel, 1);
  // The repeated line was translated once.
  await panel.waitForFunction(() => document.querySelectorAll('.line .tr:not([hidden]):not(.pending)').length === 6);
  assert.equal((await panel.evaluate(() => globalThis.__translated)).filter((t) => t === 'Esta es la primera línea de prueba').length, 1);
  await panel.locator('.line').nth(4).click();
  await waitForIndex(panel, 4, 2000);
  if (SHOTS) await panel.screenshot({ path: `${SHOTS}/preview.png` });

  // Switch the target language, then pause and restart.
  await panel.locator('#dst').selectOption('fr');
  await panel.waitForFunction(() => document.querySelector('.line .tr')?.textContent.startsWith('[fr]'));
  await panel.locator('#dst').selectOption('en');
  await panel.getByRole('button', { name: 'Pause' }).click();
  const paused = await panel.locator('#t-pos').innerText();
  await panel.waitForTimeout(1200);
  assert.equal(await panel.locator('#t-pos').innerText(), paused, 'pause stops the preview clock');
  await panel.getByRole('button', { name: 'Restart' }).click();
  await panel.getByRole('button', { name: 'Back' }).click();
  await panel.getByRole('heading', { name: 'Play a song on Spotify or Apple Music' }).waitFor();

  // Korean: the language pack needs a download, which needs a click. The
  // English hook isn't translated.
  await panel.getByRole('button', { name: 'Preview FAKE LOVE' }).click();
  const download = panel.getByRole('button', { name: 'Download it' });
  await download.waitFor();
  assert.match(await panel.locator('#notice-text').innerText(), /free language pack/);
  assert.equal(await panel.locator('.line .tr:not([hidden])').count(), 0);
  await download.click();
  await panel.waitForFunction(() => document.querySelectorAll('.line .tr:not([hidden]):not(.pending)').length === 3);
  const hook = panel.locator('.line').nth(1);
  assert.equal(await hook.locator('.orig').innerText(), 'oh oh test hook');
  assert.equal(await hook.locator('.tr').isHidden(), true);
  assert.equal(await panel.locator('#notice').isHidden(), true);
  await panel.getByRole('button', { name: 'Back' }).click();

  // Hindi, in Devanagari.
  await panel.getByRole('button', { name: 'Preview Tum Hi Ho' }).click();
  await panel.waitForFunction(() => document.querySelectorAll('.line .tr:not([hidden]):not(.pending)').length === 3);
  assert.equal(await panel.locator('#src').inputValue(), 'hi');
  await panel.getByRole('button', { name: 'Back' }).click();

  // Spotify: follows the song, the position, pause, and the next track.
  const spotify = await ctx.newPage();
  await spotify.goto('https://open.spotify.com/track/test');
  await panel.bringToFront();
  await panel.locator('#title', { hasText: 'Canción de Prueba' }).waitFor();
  await panel.waitForFunction(() => document.querySelector('#pill').textContent === 'Spotify · playing');
  assert.equal(await panel.locator('#artist').innerText(), 'Banda Inventada, Otra Banda');
  await panel.locator('.line .tr:not([hidden])').first().waitFor();
  await waitForIndex(panel, 1);
  const pos = await spotify.evaluate(() => [...document.querySelectorAll('audio')].length);
  assert.equal(pos, 0, 'the stand-in keeps its audio out of the page, like Spotify');
  if (SHOTS) await panel.screenshot({ path: `${SHOTS}/spotify.png` });

  await spotify.evaluate(() => window.testPause());
  await panel.waitForFunction(() => document.querySelector('#pill').textContent === 'Spotify · paused');
  const at = await currentIndex(panel);
  await panel.waitForTimeout(2000);
  assert.equal(await currentIndex(panel), at, 'the highlight stops while paused');

  await spotify.evaluate(() => (window.testNext(), window.testPlay()));
  await panel.locator('#title', { hasText: 'Segunda Prueba' }).waitFor();
  await panel.locator('.line .orig', { hasText: SECOND[0] }).waitFor();
  await spotify.close();

  // Spotify's on-screen clock, when there's no audio element to read.
  const clockOnly = await ctx.newPage();
  await clockOnly.goto('https://open.spotify.com/domclock');
  await panel.bringToFront();
  await panel.locator('#title', { hasText: 'Canción de Prueba' }).waitFor();
  await waitForIndex(panel, 1);
  await clockOnly.close();

  // Apple Music.
  const apple = await ctx.newPage();
  await apple.goto('https://music.apple.com/us/album/test');
  await panel.bringToFront();
  await panel.waitForFunction(() => document.querySelector('#pill').textContent === 'Apple Music · playing');
  await waitForIndex(panel, 1);
  await apple.close();

  // With every player closed, the panel goes back to waiting.
  await panel.getByRole('heading', { name: 'Play a song on Spotify or Apple Music' }).waitFor({ timeout: 10000 });

  // Fits a narrow side panel.
  const overflow = await panel.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `the panel scrolls sideways by ${overflow}px`);
  assert.deepEqual(errors, [], 'no errors in the panel');
  await ctx.close();
}

// ---------- without the translator (older Chrome, or another browser) ----------
{
  const { ctx, panel, errors } = await launch({ stub: false });
  await panel.getByRole('button', { name: 'Preview DtMF' }).click();
  await panel.locator('#notice-text', { hasText: 'Translation needs Chrome 138' }).waitFor();
  assert.equal(await panel.locator('.line').count(), SPANISH.length, 'the lyrics still show');
  await waitForIndex(panel, 1);
  assert.equal(await panel.locator('#src').inputValue(), 'es', 'the word vote still finds the language');
  assert.deepEqual(errors, []);
  await ctx.close();
}

console.log('extension e2e: all checks passed');
