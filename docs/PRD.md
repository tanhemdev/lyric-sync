# LyricSync: Product Requirements

## Problem

People connect deeply with music in languages they don't speak. They know every melody and can sing whole verses phonetically, but they don't know what they're saying. Lyrics are easy to find. Good translations, in time with the music, are not:

- **Word-for-word translation flattens songs.** Slang becomes nonsense (*pana*, buddy, becomes "corduroy"), idioms become literal (*sin pena*, no holding back, becomes "without pain"), and double meanings disappear.
- **Annotations aren't synced.** Sites with good explanations make you read a wall of text instead of listening.
- **Asking a bilingual friend works best**, and doesn't scale.

## Who it's for

| Persona | Situation | What they want |
|---|---|---|
| **The concert singer** | Knows every song on the album by sound, speaks English only | To get the jokes, the heartbreak and the swagger the way bilingual friends do |
| **The learner** | Intermediate Spanish, uses music to practice; gets the words, misses the slang | The meaning layer: regional slang, references, wordplay, right on the line |
| **The writer** | Covers music professionally and needs to understand lyrics before quoting them | Reliable meaning-first translations with context to check against |

## Solution (v1, built)

A web app that follows what you're playing on Spotify and shows each line with what it means, synced to the music.

| Priority | Requirement | Status |
|---|---|---|
| P0 | Follow the current Spotify track and position, read-only | Built (`web/src/lib/spotify.js`, `clock.js`) |
| P0 | Time-synced lyrics for any song that has them | Built, via LRCLIB (`web/src/lib/lrclib.js`) |
| P0 | Meaning-first translation per line, readable in the seconds a line is on screen | Built (`api/translate.js`, `api/_lib/prompt.js`) |
| P0 | Notes only where a listener would miss something: slang, references, double meanings | Built (same prompt; notes shown in `NotePanel.jsx`) |
| P0 | A demo anyone can try in one click, without a Spotify account | Built (two original songs + Web Audio beat) |
| P1 | Compare with word-for-word, to show what literal translation loses | Built in the demo |
| P1 | Translate into languages other than English | Built: English, Spanish, Hindi, Korean, Portuguese, French |
| P1 | Instant replays: no second wait or cost for a song you've heard | Built (browser cache per track and language) |
| P2 | Feedback on a translation ("this line is wrong") | Next |
| P2 | Mobile-first overlay that works while Spotify is in front | Later |

### Non-goals for v1

- Hosting or storing lyrics. They're fetched at play time from LRCLIB in the listener's browser.
- Controlling playback. LyricSync only reads what's playing.
- Accounts or a database.

## Success metrics (to measure once Spotify mode is live)

These are targets, not results. Nothing below has been measured yet.

| Metric | Why it matters | v1 target |
|---|---|---|
| Songs per session | Do people keep going after the first song? | 2+ |
| Share of plays where synced lyrics were found | Coverage limits everything else | 70%+ |
| "This line is wrong" reports per 100 lines | Translation quality, from the people reading them | Under 2 |
| Notes opened per song | Is the context layer what people come for? | 1+ |
| Week-1 return rate | Habit | 30%+ |

## Risks

| Risk | Mitigation |
|---|---|
| Translation quality varies by song and dialect | Prompt keeps tone and asks for notes only when useful; next step is in-app feedback per line |
| LRCLIB doesn't have synced lyrics for a track | Clear message; fallback search matches on track length; coverage is tracked as a metric |
| Spotify development mode limits users to an allowlist | Fine for a pilot; apply for extended access before a public launch |
| API cost per song | Repeated lines are sent once and every translation is cached per track |
| Lyrics may contain text aimed at the model | The prompt treats lyrics as data, and the server returns only translations, never actions |
