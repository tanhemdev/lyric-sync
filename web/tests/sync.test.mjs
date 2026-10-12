import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock, SMOOTH_MS } from '../src/lib/clock.js';
import { hitsBetween, PATTERNS } from '../src/lib/beat.js';

function fakeTime() {
  let t = 0;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test('clock plays, pauses and seeks', () => {
  const time = fakeTime();
  const clock = createClock({ now: time.now, durationMs: 10_000 });
  clock.play();
  time.advance(1500);
  assert.equal(clock.position(), 1500);
  clock.pause();
  time.advance(1000);
  assert.equal(clock.position(), 1500);
  clock.seek(9000);
  clock.play();
  time.advance(5000);
  assert.equal(clock.position(), 10_000, 'stops at the end');
  clock.seek(-50);
  assert.equal(clock.position(), 0);
});

test('a Spotify reading is stamped at the middle of the request', () => {
  const time = fakeTime();
  const clock = createClock({ now: time.now });
  // Request sent at t=0, answer at t=400: Spotify said 60s, true at t=200.
  time.advance(400);
  clock.sync({ positionMs: 60_000, isPlaying: true, sentAt: 0, receivedAt: 400 });
  assert.equal(clock.position(), 60_200);
});

test('small drift is ignored so the highlight does not jitter; big drift snaps', () => {
  const time = fakeTime();
  const clock = createClock({ now: time.now });
  clock.sync({ positionMs: 30_000, isPlaying: true, sentAt: 0, receivedAt: 0 });
  time.advance(3000);
  const drift = clock.sync({ positionMs: 33_000 + SMOOTH_MS - 50, isPlaying: true, sentAt: 3000, receivedAt: 3000 });
  assert.equal(drift, SMOOTH_MS - 50);
  assert.equal(clock.position(), 33_000, 'kept its own estimate');
  // The listener scrubbed ahead on their phone.
  clock.sync({ positionMs: 90_000, isPlaying: true, sentAt: 3000, receivedAt: 3000 });
  assert.equal(clock.position(), 90_000);
});

test('pausing on Spotify freezes the clock', () => {
  const time = fakeTime();
  const clock = createClock({ now: time.now });
  clock.sync({ positionMs: 10_000, isPlaying: true, sentAt: 0, receivedAt: 0 });
  time.advance(2000);
  clock.sync({ positionMs: 12_100, isPlaying: false, sentAt: 2000, receivedAt: 2000 });
  time.advance(5000);
  assert.equal(clock.playing, false);
  assert.equal(clock.position(), 12_100);
});

test('dembow pattern: four kicks and four snares per bar', () => {
  const bar = (60000 / 92) * 4;
  const hits = hitsBetween(0, bar, 92, PATTERNS.dembow);
  assert.equal(hits.filter((h) => h.voice === 'kick').length, 4);
  assert.equal(hits.filter((h) => h.voice === 'snare').length, 4);
  // Scheduling in two halves gives the same hits as one window (no doubles at the seam).
  const split = [...hitsBetween(0, bar / 2 + 1, 92, PATTERNS.dembow), ...hitsBetween(bar / 2 + 1, bar, 92, PATTERNS.dembow)];
  assert.deepEqual(split, hits);
});
