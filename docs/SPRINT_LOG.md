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

## October 2026: a free Chrome extension

Spotify mode needs a hosted function and a paid API key. To let anyone follow their own music at no cost, LyricSync also ships as a Chrome extension.

**Decisions**
- **Read the web players instead of their APIs.** The extension reads what's playing from the Spotify and Apple Music web players in Chrome (Media Session info and the audio element), so there's no developer app, sign-in or allowlist.
- **Translate on the listener's computer.** Chrome's built-in translator is free and private. The trade-off is plainer translations without the slang notes, so the notes stay with the Claude-powered mode.
- **Ask for as little as possible.** The extension can read only the two player sites and LRCLIB, and it sends nothing anywhere else.
- **Three featured songs, facts only.** DtMF (Spanish), FAKE LOVE (Korean) and Tum Hi Ho (Hindi), each pinned to an LRCLIB entry in the song's own script. Their lyrics are fetched at play time, never stored here.

**Built**
- Side panel that follows the playing tab, highlights the current line and keeps up across pause, seek and the next track.
- Language detection (script, then Chrome's detector, then a common-word vote), English hooks in K-pop and Bollywood songs left alone, and the one-click language pack download Chrome requires.
- Preview mode for the featured songs when nothing is playing.
- 24 unit tests and a browser test that loads the real extension into Chromium against stand-in players and a stand-in translator.

## Next

1. Put the extension in front of a few listeners and measure lyric coverage and songs per session.
2. Deploy Spotify mode on Vercel for a small allowlisted group.
3. Add per-line "this is wrong" feedback.
