# LyricSync  -  Metrics

*Data as of December 2025, end of Sprint 5.*

---

## User Growth

| Week | New Users | Total Users | Source |
|---|---|---|---|
| Week 1 (Nov 17) | 512 | 512 | Twitter launch + r/BadBunny |
| Week 2 (Nov 24) | 389 | 901 | Reddit long tail + word of mouth |
| Week 3 (Dec 1) | 476 | 1,377 | r/spotify post + TikTok mention |
| Week 4 (Dec 8) | 641 | 2,018 | Organic growth + community sharing |

**Growth trend**: Accelerating. Week 4 was the biggest despite no new launch posts. Users are sharing organically  -  the "tag your friend who sings Bad Bunny phonetically" meme has legs.

---

## Engagement

| Metric | Value | Notes |
|---|---|---|
| Weekly active users | ~850 | ~42% of total base |
| Average session duration | 11.2 min | ~2.8 songs per session |
| Median session duration | 8.5 min | ~2 songs per session |
| Sessions per user per week | 3.1 | Users come back multiple times |
| Week 1 retention | 47% | Target was 40% |
| Week 4 retention | 31% | Healthy for a content-dependent product |

**Key insight**: Session duration is higher than typical music companion apps. Users aren't checking one translation and leaving  -  they're going down rabbit holes, listening to songs they thought they knew and discovering what they actually mean.

---

## Translation Coverage

### By Album

| Album | Total Tracks | Translated | Coverage | Avg Quality Score |
|---|---|---|---|---|
| Un Verano Sin Ti (2022) | 23 | 18 | 78% | 4.6 |
| YHLQMDLG (2020) | 20 | 14 | 70% | 4.4 |
| El Ultimo Tour Del Mundo (2020) | 16 | 11 | 69% | 4.3 |
| X 100PRE (2018) | 13 | 9 | 69% | 4.5 |
| **Total** | **72** | **52** | **72%** | **4.5** |

### Top 5 Songs by Translation Views

| Rank | Song | Album | Views | Context Note Taps |
|---|---|---|---|---|
| 1 | Titi Me Pregunto | Un Verano Sin Ti | 1,847 | 73% |
| 2 | Me Porto Bonito | Un Verano Sin Ti | 1,203 | 68% |
| 3 | Dakiti | El Ultimo Tour Del Mundo | 982 | 54% |
| 4 | Yo Perreo Sola | YHLQMDLG | 871 | 71% |
| 5 | Callaita | X 100PRE | 756 | 62% |

---

## Translation Quality

| Metric | Value |
|---|---|
| Average quality score (all songs) | 4.5 / 5.0 |
| Songs scoring 4.5+ | 31 (60%) |
| Songs scoring 4.0-4.4 | 17 (33%) |
| Songs scoring below 4.0 | 4 (8%)  -  flagged for revision |
| Lines with context annotations | 78% of all translated lines |
| Slang dictionary entries | 124 terms |

---

## Community Corrections

| Metric | Value |
|---|---|
| Total corrections submitted | 147 |
| Corrections merged (improved translation) | 89 (61%) |
| Corrections declined (preference, not accuracy) | 42 (29%) |
| Corrections pending review | 16 (11%) |
| Unique contributors | 34 |
| Top contributor submissions | 19 corrections (12 merged) |

**Pattern**: The most valuable corrections come from Puerto Rican users who catch regional slang nuances. Second most valuable: users who are bilingual but primarily English-speaking  -  they're great at flagging translations that are accurate but don't "sound right" in English.

---

## Session Deep Dive

### What users do in a session

| Action | % of Sessions |
|---|---|
| Play a song and read synced translations | 100% |
| Tap a line for context notes | 64% |
| Listen to 2+ songs | 72% |
| Listen to 3+ songs | 41% |
| Browse slang dictionary | 23% |
| Submit a correction | 4% |
| Share a translated lyric | 11% |

### Session duration by entry point

| How They Found Us | Avg Session Duration |
|---|---|
| Twitter | 9.3 min |
| Reddit | 14.1 min |
| Direct / word of mouth | 12.7 min |
| TikTok | 7.2 min |

Reddit users stay the longest. Makes sense  -  they're already in "deep dive" mode when they click through.

---

## User Feedback Highlights

Collected via in-app feedback form and Reddit/Twitter comments.

> "I've been listening to Bad Bunny for 4 years and I just found out half the songs I thought were love songs are actually breakup songs."  -  Reddit user

> "The slang explanations are my favorite part. I'm learning actual Puerto Rican Spanish, not textbook Spanish."  -  In-app feedback

> "I made my whole friend group download this before the concert. We finally knew what we were screaming."  -  Twitter DM

> "This is what Spotify should have built. The fact that a college student did it first is both impressive and embarrassing for Spotify."  -  r/spotify comment

> "I cried during 'El Apagon' when I finally understood what it was about. I've listened to that song maybe 200 times."  -  In-app feedback

> "Showed this to my abuela and she was so happy that my friends actually want to understand the music she grew up with."  -  Twitter reply

---

## Infrastructure & Performance

| Metric | Value |
|---|---|
| API response time (p50) | 45ms |
| API response time (p95) | 120ms |
| Translation cache hit rate | 94.7% |
| Spotify API errors (rate limits) | 0.3% of requests |
| Uptime (since launch) | 99.8% |
| Monthly infrastructure cost | $0 (free tiers) |

---

## What the Numbers Tell Us

1. **The product works.** 47% week-1 retention and 11-minute average sessions for a music companion tool is strong. People aren't just curious  -  they're coming back.

2. **Context notes are the differentiator.** 64% of sessions include at least one context note tap. Users don't just want translations  -  they want understanding.

3. **Community corrections scale quality.** 61% merge rate means the community is genuinely improving the product, not just nitpicking.

4. **Growth is organic.** Week 4 was the biggest growth week with zero marketing. The product spreads because people share translated lyrics with friends who then want the full experience.

5. **$0 infrastructure** at 2K users. The free tier era is real. The only cost is time  -  mine and my reviewers'.

---

*Metrics maintained by Tanya Hemdev | Updated weekly*
