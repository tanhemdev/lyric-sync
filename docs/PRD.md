# LyricSync  -  Product Requirements Document

## The Problem

There are 77 million people in the US streaming Bad Bunny every month. The overwhelming majority don't speak Spanish. They know every melody, every beat drop, every ad-lib. They can phonetically reproduce entire verses. But they have no idea what they're saying.

This isn't a Bad Bunny problem  -  it's a *music* problem. Non-English music is exploding globally (Latin music revenue hit $1.2B in the US in 2023, K-pop continues to grow), and streaming platforms have done nothing meaningful to bridge the comprehension gap. Lyrics are available. Translations are not  -  and the ones that exist (Genius annotations, scattered fan forums, Google Translate) are either incomplete, unsynchronized, or so literal they strip the art out of the words.

People are connecting deeply to music they can't literally understand. That connection is real  -  but it's incomplete. LyricSync completes it.

---

## Market Sizing

### Total Addressable Market

- **Global music streaming subscribers**: 680M+ (2024)
- **Non-English songs in Spotify Global Top 50**: ~30-40% on any given week
- **Revenue of global music streaming market**: $42B (2024), growing ~10% YoY

### Serviceable Addressable Market

- **Bad Bunny monthly listeners**: 103M
- **US-based listeners** (primarily English-speaking): 77M
- **Estimated non-Spanish-speaking US listeners**: ~60M+ (based on US Spanish-speaking population demographics)

### Starting Wedge

- Bad Bunny fans who actively look up lyrics or translations (estimated 8-12% based on Genius traffic data for Bad Bunny pages)
- **Initial target**: ~5-7M potential users just within Bad Bunny's US fanbase
- Expansion path: other Latin artists (Karol G, Peso Pluma, Feid), then K-pop, Afrobeats, etc.

---

## Personas

### 1. Maya  -  The Concert Screamer
**Age**: 21 | **Location**: Austin, TX | **Speaks**: English only

Maya went to the Bad Bunny concert at the Austin F1 race and had the time of her life. She "knows" every song on Un Verano Sin Ti. She has a Bad Bunny tattoo. She cannot tell you what a single song is about beyond what she's picked up from vibes and TikTok context.

**Pain point**: She's looked up translations on Google but they're clunky, unsynchronized, and reading a wall of text while a song plays isn't the same as *feeling* the meaning in real time.

**What she wants**: To understand the songs the way her bilingual friends do. To know why they're laughing at certain lines. To get the jokes, the heartbreak, the swagger.

### 2. Diego  -  The Spanish Learner
**Age**: 28 | **Location**: Chicago, IL | **Speaks**: Intermediate Spanish

Diego is using music to improve his Spanish. He catches maybe 60% of what Bad Bunny says but the slang, the Puerto Rican dialect, the speed  -  he misses the nuance. He uses Duolingo and thinks music is a better teacher.

**Pain point**: Existing translations are either too literal (he already gets the literal words) or too sparse (just a few lines annotated on Genius). He wants the *meaning layer*  -  the cultural context, the wordplay, why a particular phrase is funny or sad.

**What he wants**: Side-by-side lyrics with contextual translations and slang breakdowns. A way to learn through the music he's already listening to.

### 3. Rachel  -  The Music Journalist
**Age**: 34 | **Location**: Brooklyn, NY | **Speaks**: English, some French

Rachel writes about music for a mid-tier publication. She covers Latin music's crossover into mainstream US culture. She needs to actually understand what artists are saying to write meaningfully about them. She's tired of relying on press-kit translations or bilingual colleagues.

**Pain point**: She can't credibly analyze lyrics she doesn't understand. Fan translations vary wildly in quality. Professional translations lose the feel.

**What she wants**: Reliable, contextual translations she can reference while writing. Cultural annotations that help her write about the music without getting things wrong.

---

## Success Metrics

| Metric | Target (v1) | Stretch |
|---|---|---|
| Songs covered | 50+ | 100+ |
| Translation quality score (1-5 user rating) | 4.2+ | 4.5+ |
| Weekly active users | 500 | 2,000 |
| Average session duration | 8 min (2+ songs) | 15 min |
| User retention (week 1) | 40% | 55% |
| Community corrections submitted | 50/month | 200/month |

---

## Feature Prioritization

### P0  -  Must Have (MVP)

| Feature | Description |
|---|---|
| Spotify OAuth | Connect user's Spotify account for playback access |
| Real-time playback sync | Poll Spotify API for current track + position, sync translations to timestamps |
| Line-by-line translation display | Side-by-side original Spanish and English translation, highlighted in sync with playback |
| Contextual translations | Translations that preserve meaning, slang, and tone  -  not literal word-for-word |
| Album browser | Browse and select from supported songs/albums |

### P1  -  Should Have (v1.1)

| Feature | Description |
|---|---|
| Cultural context notes | Tap any line for annotations explaining references, slang, double meanings |
| Slang dictionary | Searchable dictionary of recurring slang terms across songs |
| Translation quality ratings | Users rate translations 1-5, flag inaccurate lines |
| Offline caching | Cache translations locally so they load instantly on replay |

### P2  -  Nice to Have (v2)

| Feature | Description |
|---|---|
| Community corrections | Users submit translation improvements, reviewed + merged by moderators |
| Multi-language support | Translations into languages beyond English (Portuguese, French, etc.) |
| Artist expansion | Karol G, Peso Pluma, Rosalia, K-pop artists |
| Social sharing | Share a translated lyric snippet as an image card |
| Learning mode | Flashcards and quizzes generated from song vocabulary |

### P3  -  Future

| Feature | Description |
|---|---|
| Spotify overlay / integration | Native Spotify integration (pending API support) |
| Apple Music support | Expand beyond Spotify |
| AI-assisted translation | Use LLMs to generate draft translations for new songs, human-reviewed before publishing |

---

## Competitive Analysis

### Musixmatch
- **What they do**: Largest lyrics database. Synced lyrics on Spotify, Apple Music, etc.
- **What they don't do**: Translations are community-sourced with minimal quality control. Most are literal, machine-like. No cultural context. No slang explanations. The translation for "perreo" is "twerking" and they call it a day.
- **Our edge**: Quality over quantity. Every LyricSync translation is contextual, annotated, and preserves the artistic intent.

### Genius
- **What they do**: Annotations and explanations for songs. Strong community.
- **What they don't do**: Not synced to playback. Annotations are line-by-line but you have to scroll through a webpage while your song plays. Coverage of non-English songs is spotty and inconsistent.
- **Our edge**: Real-time sync. You don't read our translations  -  you *experience* them alongside the music.

### Google Translate / DeepL
- **What they do**: Translate text.
- **What they don't do**: Understand music. "Titi Me Pregunto" becomes "Uncle I Wonder." Slang is destroyed. Poetry is flattened. Context is nonexistent.
- **Our edge**: We're not a translation tool. We're a *comprehension* tool. The output isn't just correct  -  it's *right*.

### Fan translations (Reddit, Twitter, blogs)
- **What they do**: Often the best translations available. Written by fans who love the music and understand the culture.
- **What they don't do**: Scattered across the internet. Not synced. Inconsistent quality. Disappear when accounts are deleted.
- **Our edge**: We curate and build on this energy, giving it a home and syncing it to the music.

---

## Open Questions

1. **Spotify rate limits**: Playback state polling at 100ms is aggressive. What's the actual rate limit behavior, and do we need to implement predictive sync to reduce API calls?
2. **Translation IP**: Who "owns" a contextual translation of a song lyric? Legal gray area worth monitoring.
3. **Artist relationships**: Could we partner with artists or labels to get official translations? Would that help or limit us?
4. **Monetization**: Freemium? Donations? This started as a passion project  -  when/how does it sustain itself?

---

*Last updated: Sprint 5 | Author: Tanya Hemdev*
