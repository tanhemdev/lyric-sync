import { useEffect, useState } from 'react';
import DemoView from './components/DemoView.jsx';
import LiveView, { LANG_OPTIONS, SetupCard } from './components/LiveView.jsx';

function startTab() {
  if (new URLSearchParams(location.search).has('code') || location.hash === '#spotify') return 'live';
  try {
    if (sessionStorage.getItem('lyricsync.spotify')) return 'live';
  } catch {
    /* storage blocked */
  }
  return 'demo';
}

export default function App() {
  const [tab, setTab] = useState(startTab);
  const [config, setConfig] = useState(null);
  const [showLiteral, setShowLiteral] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    fetch('./config.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((c) => setConfig({ spotifyClientId: c.spotifyClientId || '', translateUrl: c.translateUrl || '' }));
  }, []);

  const liveReady = config && config.spotifyClientId && config.translateUrl;

  const choose = (next) => {
    setTab(next);
    history.replaceState(null, '', `${location.pathname}${location.search}${next === 'live' ? '#spotify' : ''}`);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 7h10M4 12h16M4 17h7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h1>LyricSync</h1>
            <p>Know what you're singing.</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Mode">
          <button type="button" className={tab === 'demo' ? 'on' : ''} aria-pressed={tab === 'demo'} onClick={() => choose('demo')}>
            Demo
          </button>
          <button type="button" className={tab === 'live' ? 'on' : ''} aria-pressed={tab === 'live'} onClick={() => choose('live')}>
            Spotify
          </button>
        </nav>
      </header>

      <div className="options">
        <label className="switch">
          <input type="checkbox" checked={showLiteral} onChange={(e) => setShowLiteral(e.target.checked)} />
          Compare with word for word
        </label>
        {tab === 'live' && liveReady && (
          <label className="lang">
            Translate into
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANG_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <main>
        {tab === 'demo' && <DemoView showLiteral={showLiteral} />}
        {tab === 'live' && !config && <p className="muted">Loading…</p>}
        {tab === 'live' && config && (liveReady ? <LiveView config={config} showLiteral={showLiteral} lang={lang} /> : <SetupCard />)}
      </main>

      <footer className="foot">
        <a href="https://github.com/tanhemdev/lyric-sync#chrome-extension-free">Free Chrome extension for Spotify and Apple Music</a> ·{' '}
        <a href="https://github.com/tanhemdev/lyric-sync">Code on GitHub</a> · Built by <a href="https://tanyahemdev.com">Tanya Hemdev</a>
      </footer>
    </div>
  );
}
