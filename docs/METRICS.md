# LyricSync: Metrics

LyricSync's Spotify mode hasn't been deployed to users yet, so there are no usage numbers. This page has two parts: what's measured today (the build itself) and what will be measured once listeners use it.

## Measured today

| What | Value | How |
|---|---|---|
| Unit tests | 30 passing | `npm test` in `web/` (22) and at the root (8) |
| Browser tests | Demo and Spotify flows passing | `npm run test:e2e` in `web/` (Playwright) |
| Sync jitter filter | Readings within 300 ms of the clock are ignored | `web/tests/sync.test.mjs` |
| Requests per replayed song | 0 (served from the browser cache) | e2e test: reload makes no second translation request |
| Translation calls per song | 1 for a typical song (up to 120 unique lines per request) | `web/src/lib/translate.js` |

## To measure with the first listeners

| Metric | Definition | Target |
|---|---|---|
| Lyrics coverage | Plays where synced lyrics were found ÷ plays | 70%+ |
| Time to first translated line | From track change to translations on screen | Under 4 s (uncached) |
| Songs per session | Distinct tracks shown per visit | 2+ |
| Notes opened per song | Taps on lines that have a note | 1+ |
| Reported lines | "This is wrong" reports per 100 lines shown | Under 2 |
| Week-1 return | Listeners who come back within 7 days | 30%+ |

## How they'll be collected

Counts only, no lyrics and no listening history: a track change, whether lyrics were found, time to translation, note taps, and reports. Collected after the in-app feedback button ships (see [SPRINT_LOG.md](SPRINT_LOG.md)).
