// Context for the selected line, or for the line playing now if it has a note.
export default function NotePanel({ line, translation, pinned, onClose }) {
  if (!line || !translation) {
    return (
      <aside className="notes empty" aria-live="polite">
        <h2>Context</h2>
        <p>Lines with a dot have a note: slang, a cultural reference, or a double meaning the translation can't carry. Tap any line to read it and jump there.</p>
      </aside>
    );
  }
  return (
    <aside className="notes" aria-live="polite">
      <div className="notes-head">
        <h2>{pinned ? 'Selected line' : 'Now playing'}</h2>
        {pinned && (
          <button type="button" className="link" onClick={onClose}>
            follow the song
          </button>
        )}
      </div>
      <p className="n-orig">{line.text}</p>
      <p className="n-meaning">{translation.meaning}</p>
      {translation.literal && translation.literal !== translation.meaning && (
        <p className="n-literal">
          <span>Word for word</span>
          {translation.literal}
        </p>
      )}
      {translation.note ? <p className="n-note">{translation.note}</p> : <p className="muted">No note needed for this line.</p>}
    </aside>
  );
}
