# LyricSync: Build Log

## February 2026: the idea

Watched the Super Bowl LX halftime show with friends, everyone singing along, and wondered how many viewers knew what the words meant. That's where the idea started.

## August 2026: concept on GitHub

- Published the PRD, research themes and architecture plan, and a screenshot of the reading experience.
- The core bet: translate for meaning, keep notes selective, and keep the translation on the line that's playing.

## October 2026: v1 as working code

This repository is the product built for real, test-first.

**Pipeline**
- LRC parser and a playback clock that compensates for network delay and filters jitter. Readings within 300 ms of the clock are ignored so the highlight doesn't twitch between lines.
- Spotify sign-in with PKCE, chosen so the app needs no secret and can be hosted as static files.
- LRCLIB lookup with a fallback search matched on track length, because live versions and remasters often fail the exact lookup.

**Translation**
- One serverless function holding the API key, with input limits and CORS.
- Prompt written around the research: meaning over words, translations sized to the line, notes only when they earn their place.
- Parser that survives imperfect model replies instead of failing the whole song.
- Choruses sent once and every song cached per language: a replay costs nothing.

**Demo**
- Two original songs, written for the demo so the repo holds no real lyrics, each with a word-for-word rendering to show what literal translation loses.
- A drum machine (dembow and ballad patterns) built with the Web Audio API, scheduled from the same clock.

**Quality**
- 30 unit tests and Playwright browser tests, including the whole Spotify flow against stand-in servers. CI on every push, demo deployed to GitHub Pages.

## Next

1. Deploy Spotify mode on Vercel for a small allowlisted group.
2. Add per-line "this is wrong" feedback.
3. Measure the metrics in [METRICS.md](METRICS.md), then decide between more languages and a mobile overlay.
