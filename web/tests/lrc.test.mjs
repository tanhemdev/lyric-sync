import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, lineIndexAt, lineProgress, formatTime } from '../src/lib/lrc.js';
import { SONGS } from '../src/demo/songs.js';

// Made-up lines only: no real lyrics in tests.
test('parses timestamps in all three precisions and sorts lines', () => {
  const { lines } = parseLrc('[00:05.5]second\n[00:01.250]first\n[01:02]third');
  assert.deepEqual(lines, [
    { t: 1250, text: 'first' },
    { t: 5500, text: 'second' },
    { t: 62000, text: 'third' },
  ]);
});

test('a line with several timestamps appears at each of them', () => {
  const { lines } = parseLrc('[00:10.00][00:40.00]repeat me\n[00:20.00]once');
  assert.deepEqual(
    lines.map((l) => [l.t, l.text]),
    [
      [10000, 'repeat me'],
      [20000, 'once'],
      [40000, 'repeat me'],
    ],
  );
});

test('reads metadata, applies offset, keeps blank lines as instrumental gaps', () => {
  const { meta, lines } = parseLrc('[ar:Someone]\n[ti:A Title]\n[offset:+500]\n[00:02.00]hello\n[00:05.00]\n');
  assert.equal(meta.ar, 'Someone');
  assert.equal(meta.ti, 'A Title');
  assert.deepEqual(lines, [
    { t: 1500, text: 'hello' },
    { t: 4500, text: '' },
  ]);
});

test('strips enhanced word timing and ignores junk lines', () => {
  const { lines } = parseLrc('not a lyric\n[00:01.00]<00:01.00>one <00:01.50>two\n[xx:yy]bad');
  assert.deepEqual(lines, [{ t: 1000, text: 'one two' }]);
});

test('lineIndexAt finds the current line', () => {
  const lines = [{ t: 1000 }, { t: 3000 }, { t: 6000 }];
  assert.equal(lineIndexAt(lines, 0), -1);
  assert.equal(lineIndexAt(lines, 1000), 0);
  assert.equal(lineIndexAt(lines, 2999), 0);
  assert.equal(lineIndexAt(lines, 3000), 1);
  assert.equal(lineIndexAt(lines, 99999), 2);
  assert.equal(lineIndexAt([], 5), -1);
});

test('lineProgress runs from 0 to 1 across a line', () => {
  const lines = [{ t: 1000 }, { t: 3000 }];
  assert.equal(lineProgress(lines, 0, 1000), 0);
  assert.equal(lineProgress(lines, 0, 2000), 0.5);
  assert.equal(lineProgress(lines, 1, 5000, 5000), 1);
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65_400), '1:05');
});

test('every demo line has a translation, and choruses reuse one', () => {
  for (const song of SONGS) {
    const { lines } = parseLrc(song.lrc);
    const sung = lines.filter((l) => l.text);
    assert.ok(sung.length >= 10, song.id);
    for (const l of sung) assert.ok(song.translations[l.text]?.meaning, `${song.id}: "${l.text}" has no translation`);
    assert.ok(new Set(sung.map((l) => l.text)).size < sung.length, `${song.id} should repeat a line`);
    assert.ok(lines[lines.length - 1].t < song.durationMs);
  }
});
