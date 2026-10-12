import { useEffect, useRef } from 'react';
import { lineIndexAt, lineProgress } from '../lib/lrc.js';

// The synced lyric view: original line on top, what it means underneath.
// The current line is highlighted and kept in the middle of the view, unless
// the listener has just scrolled to read ahead (then we wait a few seconds).
export default function Lyrics({ lines, translations, position, durationMs, showLiteral, selected, onSelect }) {
  const active = lineIndexAt(lines, position);
  const listRef = useRef(null);
  const userScrolledAt = useRef(0);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${Math.max(0, active)}"]`);
    if (!el || Date.now() - userScrolledAt.current < 4000) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  const markScroll = () => {
    userScrolledAt.current = Date.now();
  };

  return (
    <ol className="lyrics" ref={listRef} onWheel={markScroll} onTouchMove={markScroll} aria-label="Lyrics">
      {lines.map((line, i) => {
        const tr = translations[i];
        if (!line.text) {
          return (
            <li key={i} data-i={i} className={`gap ${i === active ? 'on' : ''}`} aria-hidden="true">
              ♪
            </li>
          );
        }
        const state = i === active ? 'on' : i < active ? 'past' : 'next';
        const progress = i === active ? lineProgress(lines, i, position, durationMs) : state === 'past' ? 1 : 0;
        return (
          <li key={i} data-i={i} className={`line ${state} ${selected === i ? 'selected' : ''}`} aria-current={i === active ? 'true' : undefined}>
            <button type="button" onClick={() => onSelect(i)} aria-label={`${line.text}. Jump here${tr?.note ? ', has a note' : ''}`}>
              <span className="orig">{line.text}</span>
              {tr ? (
                <span className="meaning">{tr.meaning}</span>
              ) : (
                <span className="meaning pending">translating…</span>
              )}
              {showLiteral && tr?.literal && tr.literal !== tr.meaning && <span className="literal">word for word: {tr.literal}</span>}
              {tr?.note && <span className="note-dot" title="Has a note" />}
              <span className="bar" style={{ transform: `scaleX(${progress})` }} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
