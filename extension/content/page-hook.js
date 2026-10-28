// Runs inside the Spotify or Apple Music web player, in the page's own
// JavaScript world, because that's where the player's audio element and its
// Media Session info live. Four times a second it reads what's playing and how
// far in, and hands that to bridge.js. It only reads; it never controls
// playback.
(() => {
  if (window.__lyricsyncHook) return;
  window.__lyricsyncHook = true;

  const SITE = location.hostname.endsWith('spotify.com') ? 'spotify' : 'apple';

  // Players often keep their audio element out of the page, so note every
  // element that starts playing, plus any that are in the page.
  const media = new Map(); // element -> when it last started playing
  const remember = (el) => {
    if (el instanceof HTMLMediaElement) media.set(el, Date.now());
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    remember(this);
    return play.apply(this, args);
  };
  document.addEventListener('play', (e) => remember(e.target), true);

  function currentMedia() {
    for (const el of document.querySelectorAll('audio, video')) if (!media.has(el)) media.set(el, 0);
    let best = null;
    let bestScore = -Infinity;
    for (const [el, startedAt] of media) {
      if (!(el.duration > 0)) continue;
      const score = (el.paused ? 0 : 1e13) + startedAt;
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }

  // "1:23" or "1:02:03" (or "-2:31", time left) in milliseconds.
  function parseClock(text) {
    const m = String(text ?? '').trim().match(/^(-)?(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return ((Number(m[2] ?? 0) * 60 + Number(m[3])) * 60 + Number(m[4])) * 1000 * (m[1] ? -1 : 1);
  }

  // The on-screen clock only shows whole seconds. Note when it ticks over and
  // count from there, so the position is accurate to a fraction of a second.
  let tick = { shown: null, at: 0 };
  function onScreen(shownMs, playing) {
    const now = Date.now();
    if (shownMs !== tick.shown) tick = { shown: shownMs, at: now };
    return playing ? shownMs + Math.min(999, now - tick.at) : shownMs;
  }

  function readState() {
    const md = navigator.mediaSession?.metadata;
    let title = md?.title ?? '';
    let artist = md?.artist ?? '';
    // Spotify's tab title is "Song • Artist" while a song plays.
    if (!title && SITE === 'spotify' && document.title.includes(' • ')) {
      [title, artist] = document.title.split(' • ');
    }
    if (!title) return null;

    const el = currentMedia();
    let positionMs = el ? el.currentTime * 1000 : null;
    let durationMs = el && Number.isFinite(el.duration) ? el.duration * 1000 : null;
    let playing = el ? !el.paused : navigator.mediaSession?.playbackState === 'playing';

    // Spotify also shows its own clock. Use it when the audio element's
    // length doesn't match the song (or there's no element to read).
    if (SITE === 'spotify') {
      const pos = parseClock(document.querySelector('[data-testid="playback-position"]')?.textContent);
      let dur = parseClock(document.querySelector('[data-testid="playback-duration"]')?.textContent);
      if (pos != null && dur != null) {
        if (dur < 0) dur = pos - dur; // the player can show time left instead
        if (durationMs == null || Math.abs(durationMs - dur) > 3000) {
          if (!el) playing = playing || document.querySelector('[data-testid="control-button-playpause"]')?.getAttribute('aria-label') === 'Pause';
          positionMs = onScreen(pos, playing);
          durationMs = dur;
        }
      }
    }

    const art = md?.artwork?.length ? md.artwork[md.artwork.length - 1].src : '';
    return {
      site: SITE,
      title: String(title),
      artist: String(artist),
      album: String(md?.album ?? ''),
      artwork: String(art),
      positionMs,
      durationMs,
      playing,
      at: Date.now(),
    };
  }

  function send() {
    let state = null;
    try {
      state = readState();
    } catch {
      return;
    }
    if (state) window.postMessage({ source: 'lyricsync-page', state }, location.origin);
  }

  setInterval(send, 250);
  for (const type of ['play', 'pause', 'seeked']) document.addEventListener(type, () => setTimeout(send, 0), true);
})();
