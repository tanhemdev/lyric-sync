import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authorizeUrl, codeChallenge, exchangeCode, getNowPlaying, randomString, refreshToken, SpotifyAuthError } from '../lib/spotify.js';
import { findLyrics } from '../lib/lrclib.js';
import { parseLrc, lineIndexAt } from '../lib/lrc.js';
import { translateLines } from '../lib/translate.js';
import { createClock } from '../lib/clock.js';
import { usePosition } from '../usePlayback.js';
import PlayerBar from './PlayerBar.jsx';
import Lyrics from './Lyrics.jsx';
import NotePanel from './NotePanel.jsx';

const TOKEN_KEY = 'lyricsync.spotify';
const PKCE_KEY = 'lyricsync.pkce';
const POLL_MS = 3000;

export const LANG_OPTIONS = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['hi', 'Hindi'],
  ['ko', 'Korean'],
  ['pt', 'Portuguese'],
  ['fr', 'French'],
];

const session = {
  get(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode: sign-in lasts for this page only */
    }
  },
};

const redirectUri = () => `${location.origin}${location.pathname}`;

export function SetupCard() {
  return (
    <section className="card setup">
      <h2>Spotify mode isn't switched on in this build</h2>
      <p>
        Spotify mode follows whatever you're playing on Spotify, fetches the synced lyrics from LRCLIB, and translates each line with Claude. It needs two
        things this public demo doesn't have: a Spotify app ID and a translation endpoint holding an Anthropic API key.
      </p>
      <ol>
        <li>Create an app in the Spotify Developer Dashboard and add this page's address as a redirect URI.</li>
        <li>Deploy the repo to Vercel with <code>ANTHROPIC_API_KEY</code> set. That serves the app and <code>/api/translate</code> together.</li>
        <li>
          Put the app ID in <code>config.json</code>, or set <code>LYRICSYNC_SPOTIFY_CLIENT_ID</code> at build time.
        </li>
      </ol>
      <p>
        Step-by-step: <a href="https://github.com/tanhemdev/lyric-sync#run-spotify-mode">README → Run Spotify mode</a>. Until then, the Demo tab shows the
        full experience.
      </p>
    </section>
  );
}

export default function LiveView({ config, showLiteral, lang }) {
  const [auth, setAuth] = useState(() => session.get(TOKEN_KEY));
  const [error, setError] = useState('');
  const [track, setTrack] = useState(null);
  const [song, setSong] = useState({ status: 'idle', lines: [], translations: [] });
  const [pinned, setPinned] = useState(null);
  const clock = useMemo(() => createClock(), []);
  const position = usePosition(clock);
  const authRef = useRef(auth);
  authRef.current = auth;

  const saveAuth = (a) => {
    session.set(TOKEN_KEY, a);
    setAuth(a);
  };

  // Coming back from Spotify's sign-in page with ?code=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const err = params.get('error');
    if (!code && !err) return;
    history.replaceState(null, '', redirectUri() + location.hash);
    const pkce = session.get(PKCE_KEY);
    session.set(PKCE_KEY, null);
    if (err) return setError(err === 'access_denied' ? 'Spotify sign-in was cancelled.' : `Spotify sign-in failed: ${err}`);
    if (!pkce || pkce.state !== params.get('state')) return setError('Sign-in expired. Please connect again.');
    exchangeCode({ clientId: config.spotifyClientId, code, redirectUri: redirectUri(), verifier: pkce.verifier })
      .then(saveAuth)
      .catch((e) => setError(e.message));
  }, [config.spotifyClientId]);

  const connect = async () => {
    const verifier = randomString(64);
    const state = randomString(16);
    session.set(PKCE_KEY, { verifier, state });
    location.assign(authorizeUrl({ clientId: config.spotifyClientId, redirectUri: redirectUri(), challenge: await codeChallenge(verifier), state }));
  };

  const disconnect = () => {
    saveAuth(null);
    setTrack(null);
    setSong({ status: 'idle', lines: [], translations: [] });
    clock.pause();
  };

  const freshToken = useCallback(async () => {
    let a = authRef.current;
    if (a && a.expiresAt - Date.now() < 60_000 && a.refreshToken) {
      a = await refreshToken({ clientId: config.spotifyClientId, refreshToken: a.refreshToken });
      saveAuth(a);
    }
    return a?.accessToken;
  }, [config.spotifyClientId]);

  // Poll Spotify for what's playing and keep the clock in sync.
  useEffect(() => {
    if (!auth) return undefined;
    let stopped = false;
    let timer;
    const poll = async () => {
      if (document.hidden) return schedule();
      try {
        const token = await freshToken();
        const sentAt = performance.now();
        const now = await getNowPlaying(token);
        const receivedAt = performance.now();
        if (stopped) return;
        setError('');
        if (!now) {
          clock.pause();
          setTrack(null);
        } else {
          clock.setDuration(now.durationMs);
          clock.sync({ positionMs: now.progressMs, isPlaying: now.isPlaying, sentAt, receivedAt });
          setTrack((prev) => (prev?.trackId === now.trackId ? prev : now));
        }
      } catch (e) {
        if (e instanceof SpotifyAuthError) {
          disconnect();
          setError('Your Spotify session ended. Connect again to keep going.');
          return;
        }
        setError(`Couldn't reach Spotify (${e.message}). Retrying…`);
      }
      schedule();
    };
    const schedule = () => {
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [auth, clock, freshToken]);

  // New track (or new language): fetch synced lyrics, then translate them.
  useEffect(() => {
    if (!track) return undefined;
    let cancelled = false;
    setPinned(null);
    setSong({ status: 'lyrics', lines: [], translations: [] });
    (async () => {
      try {
        const found = await findLyrics(track);
        if (cancelled) return;
        if (!found || (!found.synced && !found.instrumental)) return setSong({ status: 'none', lines: [], translations: [] });
        if (found.instrumental) return setSong({ status: 'instrumental', lines: [], translations: [] });
        const { lines } = parseLrc(found.synced);
        setSong({ status: 'translating', lines, translations: lines.map(() => null) });
        const translations = await translateLines({
          endpoint: config.translateUrl,
          trackId: track.trackId,
          title: track.title,
          artist: track.artists.join(', '),
          texts: lines.map((l) => l.text),
          lang,
        });
        if (!cancelled) setSong({ status: 'ready', lines, translations });
      } catch (e) {
        if (!cancelled) setSong((s) => ({ ...s, status: 'error', message: e.message }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track, lang, config.translateUrl]);

  if (!auth) {
    return (
      <section className="card connect">
        <h2>Follow along with Spotify</h2>
        <p>Play a song on any device, and LyricSync shows each line with what it means, in time with the music.</p>
        <button type="button" className="primary" onClick={connect}>
          Connect Spotify
        </button>
        <p className="muted small">Read-only access to what you're currently playing. LyricSync can't control playback or see your library.</p>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  const current = lineIndexAt(song.lines, position);
  const shown = pinned ?? (current >= 0 && song.lines[current]?.text ? current : null);
  const message = {
    lyrics: 'Looking up synced lyrics…',
    none: "LRCLIB doesn't have time-synced lyrics for this song yet.",
    instrumental: 'Instrumental: nothing to translate.',
    error: `Translation failed: ${song.message}`,
  }[song.status];

  return (
    <>
      {error && <p className="error">{error}</p>}
      {!track ? (
        <section className="card">
          <h2>Nothing playing</h2>
          <p>Start a song on Spotify (phone, desktop or web) and it will show up here within a few seconds.</p>
          <button type="button" className="link" onClick={disconnect}>
            Disconnect Spotify
          </button>
        </section>
      ) : (
        <>
          <PlayerBar live title={track.title} artist={track.artists.join(', ')} art={track.art} position={position} durationMs={track.durationMs} playing={clock.playing}>
            <button type="button" className="link" onClick={disconnect}>
              Disconnect
            </button>
          </PlayerBar>
          {message && <p className={song.status === 'error' ? 'error' : 'muted status'}>{message}</p>}
          {song.lines.length > 0 && (
            <div className="stage">
              <Lyrics
                lines={song.lines}
                translations={song.translations}
                position={position}
                durationMs={track.durationMs}
                showLiteral={showLiteral}
                selected={pinned}
                onSelect={setPinned}
              />
              <NotePanel line={shown != null ? song.lines[shown] : null} translation={shown != null ? song.translations[shown] : null} pinned={pinned != null} onClose={() => setPinned(null)} />
            </div>
          )}
          <p className="credit">
            Lyrics from <a href="https://lrclib.net">LRCLIB</a>. Translations by Claude, cached in this browser.
          </p>
        </>
      )}
    </>
  );
}
