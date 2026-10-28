// The LyricSync side panel. It follows whatever Spotify or Apple Music is
// playing in a Chrome tab (page-hook.js reports title, artist and position
// twice a second), fetches the synced lyrics from LRCLIB, and translates them
// line by line with Chrome's on-device translator. With nothing playing, it
// offers three featured songs to preview on a timer.

import { parseLrc, lineIndexAt, formatTime } from './lib/lrc.js';
import { createClock } from './lib/clock.js';
import { FEATURED, matchFeatured, norm, spotifySearchUrl, appleMusicSearchUrl } from './lib/featured.js';
import { findLyrics, getFeaturedLyrics } from './lib/lyrics.js';
import { detectLanguage, languageName } from './lib/language.js';
import { hasTranslator, translatorStatus, createTranslator, translateLines, untranslated } from './lib/ondevice.js';

const $ = (id) => document.getElementById(id);
const SITE_NAME = { spotify: 'Spotify', apple: 'Apple Music' };
const TARGETS = ['en', 'es', 'hi', 'ko', 'pt', 'fr', 'ja'];
const SOURCES = ['es', 'ko', 'hi', 'en', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'pa', 'ru', 'ar'];
const STALE_MS = 6000; // a player tab that has gone quiet (closed, or nothing loaded)
const LEAD_MS = 150; // highlight a line a moment early so it's readable on the beat

const clock = createClock({ now: () => Date.now() });
const players = new Map(); // tab id -> latest state from that tab
const translators = new Map(); // "es>en" -> Promise<translator>
const translationCache = new Map(); // song key + pair -> translated lines

let mode = 'idle'; // 'idle' | 'live' | 'preview'
let song = null;
let loadToken = 0;
let translateToken = 0;
let target = 'en';
let lastIndex = -2;
let userScrollAt = 0;

// ---------- player tabs ----------

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

function clean(s) {
  if (!s || typeof s !== 'object') return null;
  const title = str(s.title).trim();
  if (!title) return null;
  const artwork = str(s.artwork, 2000);
  return {
    site: s.site === 'apple' ? 'apple' : 'spotify',
    title,
    artist: str(s.artist).trim(),
    album: str(s.album).trim(),
    artwork: artwork.startsWith('https://') ? artwork : '',
    positionMs: num(s.positionMs),
    durationMs: num(s.durationMs),
    playing: s.playing === true,
    at: num(s.at) ?? Date.now(),
  };
}

function freshPlayers() {
  const now = Date.now();
  for (const [id, p] of players) if (now - p.receivedAt > STALE_MS) players.delete(id);
  return [...players.values()];
}

// The tab to follow: one that's playing, else the most recently active.
function pickPlayer() {
  return freshPlayers().sort((a, b) => Number(b.playing) - Number(a.playing) || b.at - a.at)[0] ?? null;
}

const keyOf = (t) => `${norm(t.title)}|${norm(t.artist)}`;

function followLive() {
  const live = pickPlayer();
  if (!live) {
    if (mode === 'live') showIdle();
    return;
  }
  const key = keyOf(live);
  if (mode !== 'live' || !song || song.key !== key) {
    mode = 'live';
    clock.pause();
    startSong({ key, ...live, featured: matchFeatured(live) });
  }
  // The same song can move between Spotify and Apple Music tabs.
  if (song.site !== live.site || song.artwork !== live.artwork) {
    song.site = live.site;
    song.artwork = live.artwork;
    showArtwork();
  }
  if (live.durationMs) clock.setDuration(live.durationMs);
  if (live.positionMs != null) {
    clock.sync({ positionMs: live.positionMs, isPlaying: live.playing, sentAt: live.at, receivedAt: live.at });
  }
  renderPill();
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'lyricsync:state' || !sender?.tab) return;
  const state = clean(msg.state);
  if (!state) return;
  players.set(sender.tab.id, { ...state, receivedAt: Date.now() });
  if (mode === 'preview') renderPreviewControls();
  else followLive();
});

setInterval(() => {
  if (mode === 'live') followLive();
  else if (mode === 'preview') renderPreviewControls();
}, 1000);

// ---------- songs ----------

async function startSong(info) {
  const token = ++loadToken;
  translateToken++;
  song = { ...info, lines: [], synced: true, translations: null, source: null, sourceOverride: null };
  lastIndex = -2;
  showPlayer();
  renderLines();
  setNotice('Finding the synced lyrics…');
  try {
    const found = info.featured
      ? await getFeaturedLyrics(info.featured)
      : await findLyrics({ title: info.title, artist: info.artist, album: info.album, durationMs: info.durationMs });
    if (token !== loadToken) return;
    if (!found || (!found.synced && !found.plain)) {
      setNotice(found?.instrumental ? "This one's an instrumental." : "LRCLIB doesn't have lyrics for this song yet.");
      return;
    }
    if (found.synced) {
      song.lines = parseLrc(found.synced).lines;
      song.synced = true;
    } else {
      song.lines = found.plain.split(/\r?\n/).map((text) => ({ t: null, text: text.trim() }));
      song.synced = false;
    }
    if (mode === 'preview') clock.setDuration(found.durationMs ?? (song.lines.at(-1)?.t ?? 0) + 5000);
    renderLines();
    setNotice(null);
    const detector = await languageDetector();
    song.source = info.featured?.lang ?? (await detectLanguage(song.lines.map((l) => l.text), { detector }));
    if (token !== loadToken) return;
    renderLanguages();
    translateSong();
  } catch (err) {
    if (token === loadToken) setNotice(err?.message || "Couldn't load the lyrics.");
  }
}

let detectorPromise = null;
function languageDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        if (typeof LanguageDetector === 'undefined') return null;
        return (await LanguageDetector.availability()) === 'available' ? await LanguageDetector.create() : null;
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

// ---------- translation ----------

const sourceOf = () => song?.sourceOverride ?? song?.source ?? null;
const name = (code) => languageName(code);

async function translateSong() {
  if (!song?.lines.length) return;
  const token = ++translateToken;
  const src = sourceOf();
  const dst = target;
  const texts = song.lines.map((l) => l.text);
  const current = () => token === translateToken && sourceOf() === src && target === dst;

  if (!src) {
    setNotice("Couldn't tell what language this song is in. Pick it under “Sung in”.");
    return;
  }
  if (src === dst) {
    song.translations = untranslated(texts);
    renderTranslations();
    setNotice(null);
    return;
  }
  const cacheKey = `${song.key}|${src}>${dst}`;
  if (translationCache.has(cacheKey)) {
    song.translations = translationCache.get(cacheKey);
    renderTranslations();
    setNotice(null);
    return;
  }
  if (!hasTranslator()) {
    song.translations = null;
    renderTranslations();
    setNotice('Translation needs Chrome 138 or newer on a computer. The lyrics still follow the music.');
    return;
  }

  const pair = `${src}>${dst}`;
  let pending = translators.get(pair);
  if (!pending) {
    const status = await translatorStatus(src, dst);
    if (!current()) return;
    if (status === 'unavailable') {
      song.translations = null;
      renderTranslations();
      setNotice(`Chrome can't translate ${name(src)} into ${name(dst)} on this computer yet.`);
      return;
    }
    if (status !== 'available') {
      setNotice(`Translating ${name(src)} into ${name(dst)} needs a free language pack. Chrome downloads it once and keeps it on this computer.`, {
        label: 'Download it',
        onClick: () => download(src, dst),
      });
      return;
    }
    pending = rememberTranslator(pair, createTranslator(src, dst));
  }

  song.translations = texts.map(() => undefined);
  renderTranslations();
  let translator;
  try {
    translator = await pending;
  } catch {
    if (current()) setNotice(`Chrome couldn't set up ${name(src)} to ${name(dst)} translation. Try again in a moment.`);
    return;
  }
  if (!current()) return;
  setNotice(null);
  const out = await translateLines(translator, texts, src, {
    shouldContinue: current,
    onUpdate: (aligned) => {
      if (!current()) return;
      song.translations = aligned;
      renderTranslations();
    },
  }).catch(() => null);
  if (out && current()) translationCache.set(cacheKey, out);
}

function rememberTranslator(pair, promise) {
  translators.set(pair, promise);
  promise.catch(() => translators.delete(pair));
  return promise;
}

// Runs inside the click, so Chrome allows the language pack download.
function download(src, dst) {
  const pair = `${src}>${dst}`;
  if (!translators.has(pair)) {
    rememberTranslator(
      pair,
      createTranslator(src, dst, {
        onProgress: (loaded) => setNotice(`Downloading the ${name(src)} language pack… ${Math.round(loaded * 100)}%`),
      }),
    );
  }
  setNotice(`Downloading the ${name(src)} language pack…`);
  translateSong();
}

// ---------- preview ----------

function startPreview(featured) {
  mode = 'preview';
  clock.pause();
  clock.seek(0);
  clock.setDuration(Infinity);
  startSong({ key: `preview:${featured.id}`, title: featured.title, artist: featured.artist, site: null, artwork: '', featured }).then(() => {
    if (mode === 'preview' && song?.featured === featured && song.lines.length) {
      clock.play();
      renderPreviewControls();
    }
  });
  renderPill();
  renderPreviewControls();
}

function exitPreview() {
  mode = 'idle';
  clock.pause();
  loadToken++;
  translateToken++;
  song = null;
  if (pickPlayer()) followLive();
  else showIdle();
}

$('btn-play').addEventListener('click', () => {
  if (clock.playing) clock.pause();
  else {
    if (clock.position() >= clock.duration) clock.seek(0);
    clock.play();
  }
  renderPreviewControls();
});
$('btn-restart').addEventListener('click', () => {
  clock.seek(0);
  clock.play();
  lastIndex = -2;
  userScrollAt = 0;
  renderPreviewControls();
});
$('btn-exit').addEventListener('click', exitPreview);

$('lines').addEventListener('click', (e) => {
  if (mode !== 'preview' || !song?.synced) return;
  const li = e.target.closest('.line');
  const line = li && song.lines[Number(li.dataset.i)];
  if (line?.t == null) return;
  clock.seek(line.t);
  userScrollAt = 0;
  lastIndex = -2;
});

// ---------- rendering ----------

function showIdle() {
  mode = 'idle';
  song = null;
  loadToken++;
  translateToken++;
  $('player').hidden = true;
  $('idle').hidden = false;
  renderPill();
}

function showPlayer() {
  $('idle').hidden = true;
  $('player').hidden = false;
  $('title').textContent = song.title;
  $('artist').textContent = song.artist;
  showArtwork();
  $('player').classList.toggle('preview', mode === 'preview');
  renderLanguages();
  renderPill();
  renderPreviewControls();
}

function showArtwork() {
  const art = $('art');
  art.hidden = !song?.artwork;
  if (song?.artwork) art.src = song.artwork;
  else art.removeAttribute('src');
}

function renderPill() {
  const pill = $('pill');
  let text = 'Waiting for music';
  let on = false;
  if (mode === 'preview') text = 'Preview';
  else if (mode === 'live' && song) {
    const live = pickPlayer();
    on = !!live?.playing;
    text = `${SITE_NAME[song.site] ?? 'Playing'} · ${on ? 'playing' : 'paused'}`;
  }
  pill.textContent = text;
  pill.classList.toggle('on', on);
}

function renderPreviewControls() {
  $('preview-controls').hidden = mode !== 'preview';
  if (mode !== 'preview') return;
  $('btn-play').textContent = clock.playing ? 'Pause' : 'Play';
  const live = pickPlayer();
  $('btn-exit').textContent = live?.playing ? `Follow ${SITE_NAME[live.site]}` : 'Back';
}

function option(code) {
  const o = document.createElement('option');
  o.value = code;
  o.textContent = name(code);
  return o;
}

function renderLanguages() {
  const src = $('src');
  const codes = [...new Set([sourceOf(), ...SOURCES].filter(Boolean))];
  src.replaceChildren(...(sourceOf() ? [] : [Object.assign(option(''), { textContent: 'Not sure' })]), ...codes.map(option));
  src.value = sourceOf() ?? '';
  const dst = $('dst');
  if (!dst.options.length) dst.replaceChildren(...TARGETS.map(option));
  dst.value = target;
}

$('src').addEventListener('change', (e) => {
  if (!song) return;
  song.sourceOverride = e.target.value || null;
  translateSong();
});
$('dst').addEventListener('change', (e) => {
  target = e.target.value;
  try {
    chrome.storage?.local.set({ target });
  } catch {
    // preferences are a convenience
  }
  translateSong();
});

function setNotice(text, action) {
  $('notice').hidden = !text;
  $('notice-text').textContent = text ?? '';
  const btn = $('notice-btn');
  btn.hidden = !action;
  btn.textContent = action?.label ?? '';
  btn.onclick = action ? () => action.onClick() : null;
}

function renderLines() {
  const ol = $('lines');
  ol.classList.toggle('unsynced', !!song && !song.synced);
  ol.replaceChildren(
    ...(song?.lines ?? []).map((l, i) => {
      const li = document.createElement('li');
      li.className = l.text ? 'line' : 'line gap';
      li.dataset.i = String(i);
      const orig = document.createElement('p');
      orig.className = 'orig';
      orig.textContent = l.text || '♪';
      const tr = document.createElement('p');
      tr.className = 'tr';
      tr.hidden = true;
      li.append(orig, tr);
      return li;
    }),
  );
  lastIndex = -2;
}

function renderTranslations() {
  const items = $('lines').children;
  for (let i = 0; i < items.length; i++) {
    const tr = items[i].querySelector('.tr');
    const t = song?.translations?.[i];
    const pending = t === undefined && Array.isArray(song?.translations) && !!song.lines[i]?.text;
    tr.classList.toggle('pending', pending);
    if (pending) {
      tr.hidden = false;
      tr.textContent = '…';
    } else if (t && !t.same) {
      tr.hidden = false;
      tr.textContent = t.text;
    } else {
      tr.hidden = true;
      tr.textContent = '';
    }
  }
}

function highlight(index) {
  const items = $('lines').children;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('current', i === index);
    items[i].classList.toggle('past', i < index);
  }
  const li = items[index];
  if (li && Date.now() - userScrollAt > 3000) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

for (const type of ['wheel', 'touchmove']) addEventListener(type, () => (userScrollAt = Date.now()), { passive: true });
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) userScrollAt = Date.now();
});

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

function frame() {
  requestAnimationFrame(frame);
  if (mode === 'idle' || !song) return;
  const pos = clock.position();
  const dur = clock.duration;
  setText($('t-pos'), formatTime(pos));
  setText($('t-dur'), Number.isFinite(dur) ? formatTime(dur) : '0:00');
  $('progress').style.width = Number.isFinite(dur) && dur > 0 ? `${Math.min(100, (pos / dur) * 100)}%` : '0';
  if (mode === 'preview' && clock.playing && pos >= dur) {
    clock.pause();
    renderPreviewControls();
  }
  if (!song.synced || !song.lines.length) return;
  const index = lineIndexAt(song.lines, pos + LEAD_MS);
  if (index !== lastIndex) {
    lastIndex = index;
    highlight(index);
  }
}

function renderFeatured() {
  $('featured').replaceChildren(
    ...FEATURED.map((f) => {
      const li = document.createElement('li');
      const nameEl = document.createElement('span');
      nameEl.className = 'name';
      nameEl.textContent = f.title;
      const by = document.createElement('span');
      by.className = 'by';
      by.textContent = `${f.artist} · ${name(f.lang)}`;
      const acts = document.createElement('div');
      acts.className = 'acts';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'primary';
      preview.textContent = 'Preview';
      preview.setAttribute('aria-label', `Preview ${f.title}`);
      preview.addEventListener('click', () => startPreview(f));
      const link = (href, text) => Object.assign(document.createElement('a'), { href, textContent: text, target: '_blank', rel: 'noopener' });
      acts.append(preview, link(spotifySearchUrl(f), 'Play on Spotify'), link(appleMusicSearchUrl(f), 'Apple Music'));
      li.append(nameEl, by, acts);
      return li;
    }),
  );
}

// ---------- start ----------

renderFeatured();
renderLanguages();
renderPill();
requestAnimationFrame(frame);
try {
  chrome.storage?.local.get('target').then(({ target: saved }) => {
    if (TARGETS.includes(saved)) {
      target = saved;
      $('dst').value = target;
      if (song) translateSong();
    }
  });
} catch {
  // first run, or storage unavailable
}
