import { useEffect, useMemo, useState } from 'react';
import { SONGS } from '../demo/songs.js';
import { parseLrc } from '../lib/lrc.js';
import { createClock } from '../lib/clock.js';
import { createBeat, PATTERNS } from '../lib/beat.js';
import { usePosition } from '../usePlayback.js';
import PlayerBar from './PlayerBar.jsx';
import Lyrics from './Lyrics.jsx';
import NotePanel from './NotePanel.jsx';
import { lineIndexAt } from '../lib/lrc.js';

function prepare(song) {
  const { lines } = parseLrc(song.lrc);
  // Same shape as live mode: one translation per line, looked up by text.
  const translations = lines.map((l) => (l.text ? song.translations[l.text] ?? null : null));
  return { lines, translations };
}

export default function DemoView({ showLiteral }) {
  const [songId, setSongId] = useState(SONGS[0].id);
  const song = SONGS.find((s) => s.id === songId);
  const { lines, translations } = useMemo(() => prepare(song), [song]);
  const clock = useMemo(() => createClock({ durationMs: song.durationMs }), [song]);
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pinned, setPinned] = useState(null);
  const position = usePosition(clock);

  const beat = useMemo(
    () => createBeat({ clock, bpm: song.bpm, pattern: PATTERNS[song.pattern], endMs: song.durationMs - 1500 }),
    [clock, song],
  );
  useEffect(() => () => beat.close(), [beat]);
  useEffect(() => beat.setVolume(soundOn ? 0.5 : 0), [beat, soundOn]);

  // Stop at the end of the song.
  useEffect(() => {
    if (playing && position >= song.durationMs) {
      clock.pause();
      beat.stop();
      setPlaying(false);
    }
  }, [position, playing, song, clock, beat]);

  const toggle = () => {
    if (clock.playing) {
      clock.pause();
      beat.stop();
      setPlaying(false);
    } else {
      if (clock.position() >= song.durationMs) clock.seek(0);
      clock.play();
      beat.start();
      setPlaying(true);
    }
  };
  const seek = (ms) => clock.seek(ms);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, button, a')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') seek(clock.position() + 5000);
      else if (e.key === 'ArrowLeft') seek(clock.position() - 5000);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pick = (id) => {
    clock.pause();
    beat.stop();
    setPlaying(false);
    setPinned(null);
    setSongId(id);
  };

  const select = (i) => {
    seek(lines[i].t);
    setPinned(i);
    if (!clock.playing) toggle();
  };

  const current = lineIndexAt(lines, position);
  const shown = pinned ?? (current >= 0 && lines[current].text ? current : null);

  return (
    <>
      <div className="songs" role="radiogroup" aria-label="Demo songs">
        {SONGS.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={s.id === songId} className={`song ${s.id === songId ? 'on' : ''}`} onClick={() => pick(s.id)}>
            <strong>{s.title}</strong>
            <span>
              Spanish · {s.pattern === 'dembow' ? 'reggaeton beat' : 'ballad'} · {Math.round(s.durationMs / 1000)}s
            </span>
          </button>
        ))}
      </div>
      <p className="credit">
        Both songs were written for this demo, so there are no real lyrics here. In Spotify mode, LyricSync does the same thing with the song you're playing.
      </p>

      <PlayerBar title={song.title} artist={song.credit} position={position} durationMs={song.durationMs} playing={playing} onToggle={toggle} onSeek={seek}>
        <label className="switch">
          <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
          Beat
        </label>
      </PlayerBar>

      <div className="stage">
        <Lyrics lines={lines} translations={translations} position={position} durationMs={song.durationMs} showLiteral={showLiteral} selected={pinned} onSelect={select} />
        <NotePanel line={shown != null ? lines[shown] : null} translation={shown != null ? translations[shown] : null} pinned={pinned != null} onClose={() => setPinned(null)} />
      </div>
    </>
  );
}
