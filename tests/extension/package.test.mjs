// The extension package: the manifest points at files that exist, it asks for
// as little access as possible, the featured songs are matched reliably, and
// the code it shares with the web app hasn't drifted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { FEATURED, matchFeatured, spotifySearchUrl, appleMusicSearchUrl } from '../../extension/lib/featured.js';

const root = new URL('../../', import.meta.url);
const ext = new URL('extension/', root);
const manifest = JSON.parse(await readFile(new URL('manifest.json', ext), 'utf8'));

test('the manifest is Manifest V3 and every file it names exists', async () => {
  assert.equal(manifest.manifest_version, 3);
  const files = [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap((c) => c.js),
  ];
  for (const f of files) await access(new URL(f, ext));
});

test('it only asks for what it needs', () => {
  assert.deepEqual(manifest.permissions.sort(), ['sidePanel', 'storage']);
  assert.deepEqual(manifest.host_permissions, ['https://lrclib.net/*']);
  for (const c of manifest.content_scripts) assert.deepEqual(c.matches, ['https://open.spotify.com/*', 'https://music.apple.com/*']);
});

test('the shared lyric parser and clock match the web app', async () => {
  for (const f of ['lrc.js', 'clock.js']) {
    const a = await readFile(new URL(`extension/lib/${f}`, root), 'utf8');
    const b = await readFile(new URL(`web/src/lib/${f}`, root), 'utf8');
    assert.equal(a, b, `extension/lib/${f} has drifted from web/src/lib/${f}`);
  }
});

test('recognizes the featured songs however the player credits them', () => {
  assert.equal(matchFeatured({ title: 'Tum Hi Ho', artist: 'Mithoon, Arijit Singh' })?.id, 'tum-hi-ho');
  assert.equal(matchFeatured({ title: 'Tum Hi Ho (From "Aashiqui 2")', artist: 'Arijit Singh' })?.id, 'tum-hi-ho');
  assert.equal(matchFeatured({ title: 'DtMF', artist: 'Bad Bunny' })?.id, 'dtmf');
  assert.equal(matchFeatured({ title: 'FAKE LOVE', artist: 'BTS' })?.id, 'fake-love');
  assert.equal(matchFeatured({ title: 'Fake Love', artist: 'Someone Else' }), null);
  assert.equal(matchFeatured({ title: 'DtMF Remix', artist: 'Bad Bunny' }), null);
  assert.equal(matchFeatured(null), null);
});

test('featured songs hold facts only, never lyrics', () => {
  for (const s of FEATURED) {
    assert.deepEqual(Object.keys(s).sort(), ['artist', 'id', 'lang', 'lrclibId', 'title', 'year']);
    assert.match(spotifySearchUrl(s), /^https:\/\/open\.spotify\.com\/search\//);
    assert.match(appleMusicSearchUrl(s), /^https:\/\/music\.apple\.com\/us\/search\?term=/);
  }
});
