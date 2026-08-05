# LyricSync  -  Sprint Log

---

## Sprint 1: "Can we even do this?" (Oct 1-14, 2025)

**Goal**: Prove that Spotify playback sync + real-time translation display is technically feasible.

### What happened

Started with the simplest possible version: connect to Spotify, detect what's playing, show hardcoded English text at the right time. No translation engine, no database, no fancy UI. Just: does syncing text to a song work?

**The answer**: kind of.

First attempt at polling Spotify's API was at 1-second intervals. Translations appeared noticeably late  -  like bad dubbing on a foreign film. Dropped to 500ms. Better, but still off. Dropped to 200ms and added client-side interpolation between polls. Now we're talking.

Spent the last 3 days of the sprint manually translating "Titi Me Pregunto" line by line and timestamping every line by hand (play, pause, note the millisecond, repeat). Tedious. Worth it. When I played the song and saw the translations scroll in time with Bad Bunny's voice for the first time... yeah. This is a real thing.

### Shipped
- Spotify OAuth flow (authorization code grant)
- Playback state polling at 200ms
- Client-side position interpolation
- Hardcoded translations for 1 song displayed in sync
- Ugly but functional React UI

### Learned
- Spotify's `progress_ms` field has ~100-200ms of inherent jitter. Interpolation is mandatory.
- Manually timestamping lyrics is not scalable. Need to find or build lyric timing data.
- The emotional reaction to seeing synced translations is immediate. Every person I showed this to wanted it for their favorite song.

---

## Sprint 2: "Google Translate is the enemy" (Oct 15-28, 2025)

**Goal**: Build the translation pipeline. Figure out what "good" translation means for song lyrics.

### What happened

This is the sprint that changed the entire product direction.

Started by running all of "Un Verano Sin Ti" through Google Translate to see what we'd get as a baseline. The results were... technically correct and completely wrong. "Titi Me Pregunto" became "Uncle I Wonder." "Bellaqueo" was either untranslated or became "bellyaching." Every line that was playful in Spanish read as sterile in English. The poetry was gone.

Showed the Google Translate versions to three bilingual friends. They laughed. Not in a good way. One said: "This is technically what the words mean but it's not what the song means at all."

**That was the breakthrough.** Word-for-word translation kills the poetry. The product isn't about translation  -  it's about *comprehension*. What does the artist *mean*? What does a native speaker *feel* when they hear this line?

Spent the rest of the sprint building the contextual translation approach:
1. Start with the literal meaning
2. Adjust for tone and register (is this line aggressive? tender? funny?)
3. Handle slang by finding English equivalents that carry the same energy
4. Add context notes for anything a non-Spanish speaker wouldn't catch
5. Have a native speaker review for accuracy and feel

This is slower than MT. Way slower. But the output is incomparably better.

### Shipped
- Translation data model with context annotations
- Slang dictionary (started with ~80 terms common in reggaeton)
- Context note system (cultural references, double meanings)
- Contextual translations for 8 songs from Un Verano Sin Ti
- Quality scoring rubric (1-5 scale)

### Learned
- The gap between literal and contextual translation is the entire value proposition. This isn't a nice-to-have  -  it's the product.
- Slang is the hardest part. Regional Puerto Rican Spanish has terms that don't exist in any translation dictionary.
- Double entendres are everywhere in reggaeton. Translating only the surface meaning is lying to the user.
- Native speaker review catches things no algorithm will. One reviewer flagged 23 nuance issues in our first batch of 8 songs.

---

## Sprint 3: "Make it real" (Oct 29 - Nov 11, 2025)

**Goal**: Build the actual product. Database, API, proper UI, multiple album support.

### What happened

Heads-down building sprint. Less existential discovery, more engineering. Set up MongoDB for translations, built the Express API, redesigned the React frontend from "developer demo" to "thing a human would use."

The big technical challenge was the side-by-side display. Showing original + translation synced to playback sounds simple until you realize:
- Lines have different lengths in Spanish vs. English
- Some Spanish lines require 2 English lines to capture the meaning
- Context notes need to be accessible without disrupting the flow
- The currently-playing line needs to be visually distinct without the whole UI jumping around

Went through 4 iterations of the lyric display component. The winner: original on the left, translation on the right, current line highlighted with a subtle glow, tap-to-expand for context notes. Clean. Doesn't fight the music.

Also started covering YHLQMDLG and El Ultimo Tour Del Mundo. Developed a workflow: I draft translations using the NLP pipeline for a first pass, then Carlos (a friend from Puerto Rico who knows every Bad Bunny lyric by heart) reviews and corrects. Takes about 2 hours per song to get right.

### Shipped
- MongoDB schema + seed scripts
- Express API (auth, tracks, translations endpoints)
- Redesigned side-by-side lyric display
- Context panel (tap a line for cultural notes + slang breakdown)
- Album browser with coverage status
- 32 songs translated across 3 albums
- Redis caching for translation lookups

### Learned
- 2 hours per song for quality translations is the reality. Trying to shortcut this produces Google Translate-quality output.
- The side-by-side display is where users spend 95% of their time. Every pixel matters.
- Album art and song metadata from Spotify's API make the browse experience feel polished with minimal effort.

---

## Sprint 4: "Ship it" (Nov 12-25, 2025)

**Goal**: Get LyricSync in front of real users. Polish, deploy, share.

### What happened

Deployment was surprisingly smooth  -  Vercel for the React app, Railway for the Node server + Redis, MongoDB Atlas for the database. Free tiers across the board. Total infrastructure cost: $0.

The hard part was the last-mile polish. Error states (what happens when you play an unsupported song?), loading states (translations should feel instant), edge cases (what if someone has Spotify open on two devices?), and the OAuth flow (which needs to feel trustworthy because you're asking people to connect their Spotify account).

Wrote the README. Built a simple landing page. Recorded a 30-second demo video showing the sync in action.

Then shipped it. Posted on Twitter with the demo video and a simple caption: "77 million Americans listen to Bad Bunny every month. Most don't speak Spanish. So I built this."

The tweet did numbers. Not viral-viral, but real engagement  -  200+ likes, 80 retweets, a bunch of QRTs from people tagging friends. "Send this to that friend who sings Bad Bunny phonetically" became a thing for about 48 hours.

Posted on r/BadBunny and r/spotify. The Reddit response was even better  -  people were leaving comments like "I've been waiting for something like this to exist" and "I just spent an hour re-listening to songs I thought I knew."

### Shipped
- Production deployment (Vercel + Railway + Atlas)
- Unsupported song graceful fallback
- Loading/error states throughout
- Demo video
- Landing page
- Launched on Twitter and Reddit
- 500 users in the first week

### Learned
- The demo video was the single most effective growth driver. People need to *see* the sync to understand why this is different from a lyrics website.
- "Tag your friend who sings Bad Bunny without understanding" is an incredibly effective viral mechanic.
- r/BadBunny was more engaged than r/spotify. Niche communities > general audiences for initial launch.
- Infrastructure costs at small scale are genuinely $0 in 2025. No excuse not to ship.

---

## Sprint 5: "Grow it" (Nov 26 - Dec 9, 2025)

**Goal**: Respond to user feedback, expand coverage, build community features.

### What happened

The most rewarding sprint. Users were actually using the thing, and their feedback was shaping the product in real time.

Top user requests:
1. **More songs** (duh)  -  prioritized X 100PRE to complete the Bad Bunny catalog coverage
2. **Better context notes**  -  users wanted more slang explanations, not fewer. Added ~40 new terms to the dictionary.
3. **Community corrections**  -  bilingual users wanted to suggest improvements. Built a simple submission flow.
4. **Offline support**  -  people wanted translations cached for subway listening. Implemented IndexedDB caching.

The community corrections feature was the best decision of the sprint. Within the first week, we received 47 correction suggestions. About 60% were genuine improvements  -  native speakers catching nuances we'd missed. The other 40% were preference differences (equally valid translations, just different style). We merged the clear improvements and started a process for evaluating style differences.

Hit 2,000 users by the end of the sprint. Session duration averaged 11 minutes  -  people were listening to 2-3 songs per session, which is higher than we expected. The translations were making people listen *longer*, not just differently.

### Shipped
- X 100PRE translations (9 songs)  -  50+ total songs across 4 albums
- Community corrections system (submit, review, merge flow)
- IndexedDB client-side caching for offline access
- Expanded slang dictionary (120+ terms)
- User feedback form
- Translation quality improvements based on community input
- 2,000+ total users

### Learned
- Community corrections are a scaling mechanism. Native speakers will do translation quality work for free if you make it easy and acknowledge their contributions.
- Session duration is the metric that matters most. People listening longer = the product is working.
- 50 songs feels like a real catalog. Users stopped saying "you should add X song" and started saying "I spent an hour in here."
- The hardest part of building a product isn't the code  -  it's knowing when the translation is *right*. That's a human judgment call every time.

---

## What's Next

- **Artist expansion**: Karol G is the most-requested artist. Her music has different translation challenges (more pop, different slang register)  -  excited to figure it out.
- **Mobile optimization**: Most users are on mobile (listening on Spotify mobile). The side-by-side display needs work on small screens.
- **Learning mode**: Several users asked for flashcards or quizzes based on vocabulary from songs they've listened to. Cool intersection of music and language learning.
- **Translation API**: If the contextual translation pipeline proves robust enough, there might be something here beyond just lyrics.

---

*Sprint log maintained by Tanya Hemdev*
