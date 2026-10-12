// End-to-end browser test of the built app (run `npm run build` first).
//  1. Demo mode: play, jump to a line, read its note, compare word for word,
//     switch songs, keyboard controls, phone layout.
//  2. Spotify mode without config: the setup card explains what's needed.
//  3. Spotify mode with config, against stand-ins for Spotify, LRCLIB and the
//     translation endpoint: sign-in callback, now playing, synced lyrics,
//     translations. The stand-in song is made up; no real lyrics.
// Run: npx playwright install chromium && npm run build && node tests/e2e.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
const server = createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const errors = [];

async function newPage(viewport = { width: 1280, height: 860 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  return page;
}

const activeText = (page) => page.locator('.line.on .orig').textContent();

// 1. Demo mode -------------------------------------------------------------
{
  const page = await newPage();
  await page.goto(base);
  await page.getByRole('radio', { name: /Azotea/ }).waitFor();
  assert.equal(await page.locator('.line').count(), 17, 'Azotea has 17 sung lines');

  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => document.querySelector('.time')?.textContent !== '0:00', null, { timeout: 4000 });

  // Jump to the "chavos" line: it plays from there and its note shows.
  await page.locator('.line', { hasText: 'Nadie tiene chavos' }).getByRole('button').click();
  assert.equal(await activeText(page), 'Nadie tiene chavos pero sobra la alegría');
  await page.locator('.notes .n-note', { hasText: 'ochavo' }).waitFor();
  assert.match(await page.locator('.notes .n-meaning').textContent(), /money/);

  // Playing continues on to the next line by itself.
  await page.waitForFunction(() => document.querySelector('.line.on .orig')?.textContent.startsWith('Y tú bailando'), null, { timeout: 7000 });

  // Word-for-word comparison.
  assert.equal(await page.locator('.literal').count(), 0);
  await page.getByLabel('Compare with word for word').check();
  assert.ok((await page.locator('.literal').count()) > 5);
  assert.match(await page.locator('.literal').first().textContent(), /^word for word: /);

  // Space pauses (when focus isn't on a control), arrows seek.
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  const pausedAt = await page.locator('.time').first().textContent();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.time').first().textContent(), pausedAt, 'paused');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((t) => document.querySelector('.time').textContent !== t, pausedAt, { timeout: 2000 });

  // "Follow the song" unpins the note.
  await page.getByRole('button', { name: 'follow the song' }).click();
  await page.locator('.notes h2', { hasText: 'Now playing' }).waitFor();

  // Second song.
  await page.getByRole('radio', { name: /Carta al mar/ }).click();
  await page.locator('.line', { hasText: 'Ojalá' }).getByRole('button').click();
  await page.locator('.n-note', { hasText: 'Arabic' }).waitFor();
  await page.screenshot({ path: 'test-results/demo-desktop.png' }).catch(() => {});
  await page.close();
}

// Phone layout: nothing wider than the screen.
{
  const page = await newPage({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator('.line', { hasText: 'Mi pana' }).getByRole('button').click();
  await page.locator('.n-note', { hasText: 'corduroy' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `page scrolls sideways on a phone by ${overflow}px`);
  await page.close();
}

// 2. Spotify mode without config ------------------------------------------
{
  const page = await newPage();
  await page.goto(base);
  await page.getByRole('button', { name: 'Spotify' }).click();
  await page.getByRole('heading', { name: /Spotify mode isn't switched on/ }).waitFor();
  await page.close();
}

// 3. Spotify mode against stand-ins ----------------------------------------
{
  const page = await newPage();
  const calls = { token: 0, nowPlaying: 0, lrclib: 0, translate: 0 };
  await page.route('**/config.json', (r) => r.fulfill({ json: { spotifyClientId: 'test-client', translateUrl: '/api/translate' } }));
  await page.route('https://accounts.spotify.com/api/token', async (r) => {
    calls.token++;
    const body = new URLSearchParams(r.request().postData());
    assert.equal(body.get('grant_type'), 'authorization_code');
    assert.equal(body.get('code'), 'test-code');
    assert.equal(body.get('code_verifier'), 'test-verifier');
    await r.fulfill({ json: { access_token: 'tok', refresh_token: 'ref', expires_in: 3600 } });
  });
  const t0 = Date.now();
  await page.route('https://api.spotify.com/v1/me/player/currently-playing', (r) => {
    calls.nowPlaying++;
    assert.equal(r.request().headers().authorization, 'Bearer tok');
    return r.fulfill({
      json: {
        currently_playing_type: 'track',
        is_playing: true,
        progress_ms: 4000 + (Date.now() - t0),
        item: { id: 'track-1', name: 'Canción de Prueba', duration_ms: 60_000, artists: [{ name: 'Test Artist' }], album: { name: 'Test Album', images: [] } },
      },
    });
  });
  await page.route(/https:\/\/lrclib\.net\/api\/get\?/, (r) => {
    calls.lrclib++;
    const u = new URL(r.request().url());
    assert.equal(u.searchParams.get('track_name'), 'Canción de Prueba');
    assert.equal(u.searchParams.get('duration'), '60');
    return r.fulfill({ json: { trackName: 'Canción de Prueba', syncedLyrics: '[00:02.00]línea uno\n[00:06.00]línea dos\n[00:10.00]línea uno\n[00:30.00]fin' } });
  });
  await page.route('**/api/translate', async (r) => {
    calls.translate++;
    const { lines, lang } = r.request().postDataJSON();
    assert.equal(lang, 'en');
    assert.deepEqual(lines, ['línea uno', 'línea dos', 'fin'], 'repeated line sent once');
    await r.fulfill({ json: { lines: lines.map((l) => ({ meaning: `EN ${l}`, note: l === 'línea dos' ? 'A test note.' : null })) } });
  });

  // Arrive back from Spotify's sign-in page.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lyricsync.spotify')) sessionStorage.setItem('lyricsync.pkce', JSON.stringify({ verifier: 'test-verifier', state: 'test-state' }));
  });
  await page.goto(`${base}?code=test-code&state=test-state`);
  await page.locator('.track-text strong', { hasText: 'Canción de Prueba' }).waitFor({ timeout: 8000 });
  assert.equal(new URL(page.url()).search, '', 'code removed from the address bar');
  await page.locator('.line.on .meaning', { hasText: 'EN línea dos' }).waitFor({ timeout: 8000 });
  await page.locator('.notes .n-note', { hasText: 'A test note.' }).waitFor();
  await page.waitForFunction(() => document.querySelector('.line.on .orig')?.textContent === 'línea uno', null, { timeout: 8000 });
  assert.equal(calls.token, 1);
  assert.equal(calls.lrclib, 1);
  assert.equal(calls.translate, 1);
  assert.ok(calls.nowPlaying >= 2, 'keeps polling');
  await page.screenshot({ path: 'test-results/spotify-mode.png' }).catch(() => {});

  // Reload: translations come from the cache, no second request.
  await page.reload();
  await page.locator('.line .meaning', { hasText: 'EN fin' }).waitFor({ timeout: 8000 });
  assert.equal(calls.translate, 1, 'served from cache');

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await page.getByRole('button', { name: 'Connect Spotify' }).waitFor();
  await page.close();
}

await browser.close();
server.close();
assert.deepEqual(errors, [], 'no errors in the browser console');
console.log('e2e: all browser checks passed');
