# LyricSync  -  Architecture

## System Overview

```
+-------------+     +------------------+     +---------------------+
|   React UI  |---->|  Node.js Server  |---->|  Spotify Web API    |
|  (Client)   |<----|  (Express)       |<----|  (OAuth + Playback) |
+-------------+     +------------------+     +---------------------+
                           |    ^
                           v    |
                    +------------------+
                    |  MongoDB         |
                    |  (Translations,  |
                    |   Tracks, Users) |
                    +------------------+
                           |
                    +------------------+
                    |  Redis Cache     |
                    |  (Hot translations|
                    |   + playback     |
                    |   state)         |
                    +------------------+
```

---

## 1. Spotify Web API Integration

### Authentication Flow

```
User clicks "Connect Spotify"
       |
       v
Redirect to Spotify OAuth (Authorization Code Flow)
       |
       v
User grants scopes: user-read-playback-state, user-read-currently-playing
       |
       v
Callback receives auth code -> exchange for access + refresh tokens
       |
       v
Store tokens server-side (encrypted), set session cookie
```

**Scopes requested**:
- `user-read-playback-state`  -  know what song is playing and where they are in it
- `user-read-currently-playing`  -  detect track changes
- `user-read-email`  -  account identification (optional, for user preferences)

**Token management**: Access tokens expire every 60 minutes. Server-side refresh using stored refresh tokens. Client never sees raw tokens.

### Playback State Polling

The core sync mechanism polls the Spotify API for the current playback state.

```javascript
// Simplified polling logic
const POLL_INTERVAL_MS = 200;    // Default polling rate
const FAST_POLL_MS = 100;        // During active translation display
const DRIFT_THRESHOLD_MS = 500;  // Re-sync if drift exceeds this

async function pollPlaybackState() {
  const state = await spotifyApi.getMyCurrentPlaybackState();

  if (!state.is_playing) return;

  const serverTimestamp = state.timestamp;
  const progressMs = state.progress_ms;
  const trackId = state.item.id;

  // Detect track change
  if (trackId !== currentTrackId) {
    await loadTranslationsForTrack(trackId);
    currentTrackId = trackId;
  }

  // Calculate estimated position with drift correction
  const estimatedPosition = progressMs + (Date.now() - serverTimestamp);
  const drift = Math.abs(estimatedPosition - localPosition);

  if (drift > DRIFT_THRESHOLD_MS) {
    resyncToPosition(estimatedPosition);
  }
}
```

**Why polling instead of WebSocket?** Spotify doesn't offer real-time playback events via WebSocket. Their Connect API is REST-based. We poll at 200ms by default and increase to 100ms when translations are actively displaying. This gives us sub-300ms sync accuracy in practice.

**Rate limit management**: Spotify's rate limit is approximately 30 requests/second per user. At 100ms polling, we're at 10 req/s  -  well within limits. We also implement exponential backoff on 429 responses and predictive position interpolation to reduce unnecessary polls.

---

## 2. Translation Pipeline

### Why Not Google Translate

This is the question everyone asks, so let's address it head-on.

Google Translate (and DeepL, and other MT services) optimize for **semantic accuracy**  -  conveying the literal meaning of words from one language to another. For song lyrics, this fails in several specific, predictable ways:

| Problem | Example | Google Translate Output | What It Should Be |
|---|---|---|---|
| **Regional slang** | "titi" (PR slang for aunt) | "titi" (untranslated) or "uncle" | "auntie" + context note |
| **Register/tone** | "bellaqueo" (flirtatious/sexual vibe) | "bellyaching" or untranslated | "getting freaky" + cultural note |
| **Double entendres** | Many Bad Bunny lines | Only the surface meaning | Both meanings, flagged |
| **Poetic compression** | Lines that compress emotion into few words | Grammatically correct but flat | Preserves emotional weight |
| **Cultural references** | Mentions of specific brands, places, events | Literal translation of words | Contextual explanation |

### Our Pipeline

```
Raw Spanish Lyrics
       |
       v
1. Tokenization & Phrase Detection
   Split into lines, identify phrases
   Detect idioms, slang, compound expressions
       |
       v
2. Context Analysis
   Flag: slang, double meanings, cultural refs
   Tag register: playful, aggressive, tender, etc.
       |
       v
3. Base Translation
   Generate initial translation using our
   fine-tuned model + human-curated dictionary
       |
       v
4. Style Matching
   Adjust tone, register, line length
   Preserve rhythm where possible
       |
       v
5. Human Review
   Native speaker review for accuracy
   Bilingual music fan review for feel
       |
       v
6. Annotation Layer
   Add context notes, slang definitions,
   alternate meanings, cultural references
       |
       v
Timestamped Translation Object (stored in MongoDB)
```

### Translation Data Model

```javascript
{
  trackId: "spotify:track:4LRPiXqCikLlN15c3yImP7",
  trackName: "Titi Me Pregunto",
  album: "Un Verano Sin Ti",
  lines: [
    {
      index: 0,
      startMs: 15230,
      endMs: 18450,
      original: "Titi me pregunto si tengo muchas novias",
      translation: "My auntie's asking if I've got a bunch of girlfriends",
      context: {
        slang: [
          { term: "titi", definition: "Puerto Rican slang for 'auntie'  -  not standard Spanish" }
        ],
        culturalNote: "In Puerto Rican culture, family (especially aunties and grandmothers) being all up in your love life is a universal experience.",
        register: "playful",
        alternateReadings: []
      },
      qualityScore: 4.7,
      reviewedBy: "native_reviewer_03",
      communityCorrections: []
    }
  ],
  metadata: {
    totalLines: 64,
    avgQualityScore: 4.5,
    lastUpdated: "2026-03-15",
    translators: ["tanya", "carlos_review", "community"]
  }
}
```

---

## 3. Timestamp Synchronization

### The Problem

Spotify gives us the current playback position in milliseconds. Our translations are keyed to timestamp ranges (startMs, endMs). The challenge: these need to feel perfectly synced despite network latency, polling intervals, and the imprecision of Spotify's own timestamp reporting.

### Our Approach

```
Client-Side Sync:

1. Receive server timestamp + progress_ms from Spotify
2. Start local interpolation timer
3. Advance local position at 1x playback speed
4. On next poll, calculate drift:
   drift = |interpolated_position - actual_position|
5. If drift < 500ms: smooth correction (ease toward)
   If drift > 500ms: hard re-sync (snap to position)
6. Translation display triggers at line.startMs - 50ms
   (slight pre-fire for perceived sync)
```

**Key insight**: We pre-fire translations by 50ms. This accounts for rendering time and feels more synced than mathematically perfect alignment. Humans perceive audio-visual sync as "correct" when visual slightly leads audio.

### Edge Cases

| Scenario | Handling |
|---|---|
| User seeks forward/backward | Poll detects position jump > 2s, hard re-sync |
| Song paused | Stop interpolation, resume on play |
| Track change | Clear current translations, load new set |
| Network dropout | Continue interpolation for up to 10s, re-sync on reconnection |
| Spotify Connect switch (phone -> desktop) | New device detected, re-poll and re-sync |

---

## 4. Translation Quality Scoring

Every translation line gets a quality score (1-5) based on:

| Factor | Weight | How It's Measured |
|---|---|---|
| Semantic accuracy | 30% | Does it convey the correct meaning? (reviewer assessment) |
| Tone preservation | 25% | Does it feel like the original? (reviewer assessment) |
| Slang handling | 20% | Are informal terms translated naturally, not literally? |
| Readability | 15% | Can someone read it at song speed? (character count ratio) |
| Context completeness | 10% | Are cultural refs annotated? Double meanings flagged? |

**Threshold**: Lines scoring below 3.5 are flagged for re-translation. The overall track average must be 4.0+ before we mark it as "supported."

---

## 5. Caching Strategy

### Server-Side (Redis)

```
Translation cache:
  Key: track:{spotifyTrackId}:translations
  Value: Full translation object (JSON)
  TTL: 24 hours (refreshed on access)
  Hit rate: ~95% (users listen to the same popular songs)

Playback state cache:
  Key: user:{userId}:playback
  Value: Last known playback state
  TTL: 30 seconds
  Purpose: Reduce Spotify API calls when multiple clients poll
```

### Client-Side

- **IndexedDB**: Full translation objects for songs the user has listened to in the past 7 days
- **Memory cache**: Currently active translation in React state for zero-latency line transitions
- **Preloading**: When a user plays track N on an album, preload translations for tracks N+1 and N+2

### Cache Invalidation

Translations are versioned. When a translation is updated (community correction merged, quality review changes a line), the version increments. Client checks version on load and refetches if stale.

---

## Infrastructure

### Current (MVP / small scale)

- **Server**: Single Node.js instance on Railway
- **Database**: MongoDB Atlas (free tier, M0)
- **Cache**: Redis on Railway
- **Client**: React app on Vercel
- **Cost**: ~$0/month (free tiers)

### Scaling Path (if needed)

- Horizontal scaling of Node.js behind a load balancer
- MongoDB Atlas upgrade for larger translation corpus
- CDN for static translation data (translations don't change often  -  treat them like static assets)
- WebSocket upgrade for sync (if Spotify ever supports it)

---

*Last updated: Sprint 5 | Author: Tanya Hemdev*
