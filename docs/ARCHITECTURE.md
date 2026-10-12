# LyricSync: Architecture

## Overview

```
 Browser (web/, static React app)                         Vercel function (api/)
 ┌──────────────────────────────────────────────┐        ┌───────────────────────────┐
 │ spotify.js  PKCE sign-in, now playing ───────┼──► api.spotify.com              │
 │ clock.js    position between polls           │        │                           │
 │ lrclib.js   synced lyrics ───────────────────┼──► lrclib.net                    │
 │ lrc.js      parse to timed lines             │        │                           │
 │ translate.js de-dupe, cache ─────────────────┼──► /api/translate ──► Claude API │
 │ Lyrics.jsx  highlight, scroll, notes         │        │  validate, prompt, parse  │
 └──────────────────────────────────────────────┘        └───────────────────────────┘
```

Everything except translation runs in the browser. The only server code is one function, because it holds the Anthropic API key.

## Following Spotify

- **Sign-in:** Authorization Code with PKCE. The browser makes a random verifier, sends its SHA-256 challenge to Spotify, and proves it with the verifier when exchanging the code. No client secret exists, so none can leak. Scopes are read-only: `user-read-currently-playing` and `user-read-playback-state`.
- **Tokens** live in `sessionStorage` (gone when the tab closes) and are refreshed a minute before they expire.
- **Polling:** `GET /v1/me/player/currently-playing` every 3 seconds, paused while the tab is hidden.

## Staying in sync between polls (`clock.js`)

Spotify reports the position only when asked, and the answer is already old when it arrives. The clock:

1. stamps each reading at the **midpoint of the request** (half the round trip), which cancels most of the network delay;
2. **extrapolates** between polls using the local clock;
3. **ignores disagreements under 300 ms**, so the highlight doesn't flicker between two lines when a reading is slightly off, and **snaps** on bigger jumps (someone scrubbed on their phone);
4. freezes when Spotify says playback is paused.

The demo player drives the same clock with play, pause and seek, and the demo beat schedules its drum hits from it, so seeking keeps the beat aligned.

## Lyrics (`lrclib.js`, `lrc.js`)

1. `GET lrclib.net/api/get` with the exact title, artist, album and length.
2. If that's not found, `GET /api/search` and pick the synced result within 3 seconds of the track's length, preferring an exact title match (live versions and remasters often differ in length).
3. Parse LRC: lines with several timestamps (choruses) appear at each one, `[offset:]` is applied, word-level `<mm:ss>` timing is stripped, and empty lines become instrumental gaps.

Lyrics are fetched at play time in the listener's browser and never stored by LyricSync.

## Translation

**Client (`translate.js`):** repeated lines are sent once and mapped back (a chorus can be a third of a song). The result is cached in `localStorage` per track and language, so a replay is instant and free.

**Server (`api/translate.js`):**

| Step | Detail |
|---|---|
| CORS | Only origins in `ALLOWED_ORIGINS`; same-origin on Vercel needs none |
| Validate | 1 to 150 lines, 300 characters each, known target language |
| Prompt | Meaning over words; keep tone and slang; translations about as long as the line; notes only for slang, references or double meanings, under 30 words; lyrics are data, not instructions |
| Model | `claude-haiku-5-5` by default (fast, and the job is short), overridable with `ANTHROPIC_MODEL` |
| Parse | Finds the JSON even if wrapped in prose or fences, matches entries by index, fills any gap with an empty line instead of failing the whole song |

## Deployment

| Target | What runs |
|---|---|
| GitHub Pages | The static app. Demo mode always; Spotify mode if `config.json` points at a deployed translation function |
| Vercel | The app and `/api/translate` from one repo (`vercel.json`); build-time env vars write `config.json` |

## Testing

| Layer | Tests |
|---|---|
| Pure logic | LRC parsing, clock sync, beat scheduling, PKCE (RFC 7636 example), response mapping, de-dupe and cache (`web/tests/*.test.mjs`) |
| Server | Validation, CORS, prompt, reply parsing, handler with a stand-in model client (`api/tests/`) |
| Browser | Playwright against the built app, with stand-in Spotify, LRCLIB and translation servers (`web/tests/e2e.mjs`) |
