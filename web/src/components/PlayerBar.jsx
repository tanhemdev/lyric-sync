import { formatTime } from '../lib/lrc.js';

export default function PlayerBar({ title, artist, art, position, durationMs, playing, onToggle, onSeek, children, live = false }) {
  return (
    <div className="player">
      <div className="track">
        {art ? <img src={art} alt="" width="48" height="48" /> : <div className="art-ph" aria-hidden="true">♫</div>}
        <div className="track-text">
          <strong>{title}</strong>
          <span>{artist}</span>
        </div>
      </div>
      <div className="transport">
        {!live && (
          <button type="button" className="play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
            )}
          </button>
        )}
        <span className="time">{formatTime(position)}</span>
        <input
          type="range"
          className="scrub"
          min="0"
          max={durationMs}
          step="100"
          value={Math.min(position, durationMs)}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          disabled={live}
          aria-label="Seek"
          aria-valuetext={formatTime(position)}
        />
        <span className="time">{formatTime(durationMs)}</span>
      </div>
      {children && <div className="player-extras">{children}</div>}
    </div>
  );
}
