// A playback clock. Spotify only tells us the song position when we poll
// (every few seconds), so between polls we extrapolate from the last known
// position. Two details keep the highlight steady:
//   - a poll's position is stamped at the midpoint of the request, which
//     cancels out most of the network delay;
//   - small disagreements (under SMOOTH_MS) are ignored, so the current line
//     doesn't flicker back and forth by a few hundred milliseconds.
// The demo player drives the same clock with play / pause / seek.

export const SMOOTH_MS = 300;

export function createClock({ now = () => performance.now(), durationMs = Infinity } = {}) {
  let base = 0; // position (ms) at time `at`
  let at = now();
  let playing = false;
  let duration = durationMs;
  let rate = 1;

  const clamp = (ms) => Math.min(duration, Math.max(0, ms));

  const clock = {
    position(t = now()) {
      return clamp(playing ? base + (t - at) * rate : base);
    },
    get playing() {
      return playing;
    },
    get duration() {
      return duration;
    },
    setDuration(ms) {
      duration = ms;
    },
    play(t = now()) {
      if (playing) return;
      base = clock.position(t);
      at = t;
      playing = true;
    },
    pause(t = now()) {
      if (!playing) return;
      base = clock.position(t);
      at = t;
      playing = false;
    },
    seek(ms, t = now()) {
      base = clamp(ms);
      at = t;
    },
    // Used by tests and the e2e "fast" mode only.
    setRate(r, t = now()) {
      base = clock.position(t);
      at = t;
      rate = r;
    },
    // Apply a reading from Spotify. `sentAt` and `receivedAt` are local times
    // around the request; `positionMs` is what Spotify reported.
    sync({ positionMs, isPlaying, sentAt, receivedAt }) {
      const stampedAt = (sentAt + receivedAt) / 2;
      const estimate = clock.position(stampedAt);
      const drift = positionMs - estimate;
      const stateChanged = isPlaying !== playing;
      if (stateChanged || Math.abs(drift) > SMOOTH_MS) {
        base = clamp(positionMs);
        at = stampedAt;
      }
      playing = isPlaying;
      if (!isPlaying) {
        base = clamp(positionMs);
        at = stampedAt;
      }
      return drift;
    },
  };
  return clock;
}
