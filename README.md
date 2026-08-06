# LyricSync 

**Real-time synced lyric translations for non-English music on Spotify.**

---

<img width="799" height="601" alt="Screenshot 2026-08-05 at 8 19 13 PM" src="https://github.com/user-attachments/assets/4e34cef0-4619-4b0e-a998-c1077998ec80" />


128.2 million people watched Bad Bunny perform at Super Bowl LX. The first artist to ever do the halftime show entirely in Spanish. 4.157 billion views globally in the first 24 hours. The whole stadium was on their feet.

And I'm sitting there watching with my friends  -  all of us screaming every word  -  and I couldn't help but wonder: **how many of those 128 million people had absolutely no idea what he was saying?**

He has 103 million monthly Spotify listeners. 77 million of them are in the US. Most don't speak Spanish. They're in the car belting "Titi Me Pregunto" and have no clue what they're singing. They're at the concert losing their minds during "Dakiti"  -  vibing on pure phonetics and energy. The music hits. The meaning doesn't.

That night I started building LyricSync. Real-time, synced translations that actually capture what the artist *meant*  -  not what Google Translate thinks they said. Poetry stays poetry. Slang stays slang. Double meanings get explained, not flattened.

50+ songs. 4 albums. 2,000+ users. Built because after watching 128 million people fall in love with music they couldn't understand, I figured somebody should fix that.

---

## How It Works

```
Spotify Playback -> Timestamp Sync -> Contextual Translation Engine -> Side-by-Side Display
```

1. **Connect Spotify**  -  OAuth login, grant playback access
2. **Play any supported song**  -  LyricSync detects the track automatically
3. **Watch translations appear in real time**  -  synced line-by-line to the music
4. **Tap any line** for cultural context notes, slang breakdowns, and alternate meanings

<!-- Screenshot: side-by-side view during playback -->
![Side-by-side translation view](assets/screenshots/side-by-side.png)

<!-- Screenshot: cultural context popup -->
![Cultural context notes](assets/screenshots/context-notes.png)

<!-- Screenshot: song selection / album browser -->
![Album browser](assets/screenshots/album-browser.png)

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React | Component-based UI, fast re-renders for real-time sync |
| Playback Sync | Spotify Web API | OAuth + playback state polling at 100ms intervals |
| Translation Engine | Custom NLP Pipeline | Context-aware translation that preserves meaning over literalness |
| Backend | Node.js + Express | Lightweight, handles WebSocket connections for live sync |
| Database | MongoDB | Flexible schema for translations, annotations, and user data |
| Caching | Redis | Sub-50ms translation lookups for previously seen tracks |

---

## Project Structure

```
lyric-sync/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Player/        # Spotify playback controls + progress bar
│   │   │   ├── LyricDisplay/  # Side-by-side original + translation
│   │   │   ├── ContextPanel/  # Cultural notes, slang dictionary
│   │   │   └── AlbumBrowser/  # Browse supported albums/songs
│   │   ├── hooks/
│   │   │   ├── useSpotifySync.js    # Playback state polling + timestamp sync
│   │   │   └── useTranslation.js    # Fetches translations keyed to timestamps
│   │   ├── services/
│   │   │   └── spotifyApi.js        # Spotify Web API wrapper
│   │   └── App.js
│   └── package.json
├── server/                    # Node.js backend
│   ├── routes/
│   │   ├── auth.js            # Spotify OAuth flow
│   │   ├── tracks.js          # Track lookup + translation retrieval
│   │   └── translations.js   # Translation CRUD + community corrections
│   ├── services/
│   │   ├── translationEngine.js   # Custom NLP pipeline
│   │   ├── contextAnalyzer.js     # Slang detection, cultural references
│   │   └── timestampSync.js       # Maps translations to song timestamps
│   ├── models/
│   │   ├── Translation.js
│   │   ├── Track.js
│   │   └── User.js
│   └── server.js
├── scripts/
│   ├── seedTranslations.js    # Load curated translations into DB
│   └── qualityCheck.js        # Score translations against quality rubric
├── docs/
│   ├── PRD.md
│   ├── USER_RESEARCH.md
│   ├── ARCHITECTURE.md
│   ├── SPRINT_LOG.md
│   └── METRICS.md
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or a cloud instance
- **Spotify Developer Account**  -  you'll need a Client ID and Client Secret from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

### Setup

```bash
# Clone the repo
git clone https://github.com/tanhemdev/lyric-sync.git
cd lyric-sync

# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cp .env.example .env
# Add your Spotify Client ID, Client Secret, and MongoDB URI

# Seed the translation database
cd ../server && npm run seed

# Start the app
npm run dev    # Starts both client (port 3000) and server (port 8080)
```

Open `http://localhost:3000`, connect your Spotify account, play a supported song, and watch.

---

## Supported Albums & Songs

| Album | Songs Covered | Status |
|---|---|---|
| *Un Verano Sin Ti* (2022) | 18/23 | Active |
| *YHLQMDLG* (2020) | 14/20 | Active |
| *El Ultimo Tour Del Mundo* (2020) | 11/16 | Active |
| *X 100PRE* (2018) | 9/13 | Active |

**50+ songs** with full contextual translations. Each translation includes:
- Line-by-line Spanish -> English mapping synced to playback timestamps
- Cultural context annotations (references to Puerto Rican slang, reggaeton culture, specific events)
- Slang dictionary entries for informal/regional language
- Alternate meaning notes where lyrics carry double entendres

---

## What Makes This Different

**Google Translate** gives you: *"Uncle asked me"* for "Titi Me Pregunto."

**LyricSync** gives you: *"My auntie's asking about me"*  -  plus a note that "titi" is Puerto Rican slang for auntie, not a formal uncle, and that the song is about Bad Bunny's love life being the subject of family gossip.

That's the difference between translation and *understanding*.

---

## Documentation

| Doc | What's Inside |
|---|---|
| [PRD](docs/PRD.md) | Product requirements, market sizing, personas, feature prioritization |
| [User Research](docs/USER_RESEARCH.md) | Interviews, surveys, key insights from non-Spanish-speaking fans |
| [Architecture](docs/ARCHITECTURE.md) | System design, Spotify integration, translation pipeline deep dive |
| [Sprint Log](docs/SPRINT_LOG.md) | 5 sprints of building, breaking, and shipping |
| [Metrics](docs/METRICS.md) | Growth, engagement, translation coverage, user feedback |

---

## Contributing

Want to help translate more songs or improve existing translations? Check out the [contribution guide](CONTRIBUTING.md) or open an issue.

Community-submitted translation corrections go through a quality review before being merged  -  we take accuracy seriously, but we also know native speakers catch things algorithms miss.

---

## License

MIT

---

*Built by [Tanya Hemdev](https://github.com/tanhemdev)  -  PM/builder at UC Berkeley. Because music shouldn't need a language requirement.*
