# LyricSync: User Research

## Goal

Understand how people who don't speak Spanish experience Spanish-language music: what they understand, what they do when they want to know more, and whether meaning-first translations in time with the music would change how they listen.

## Who we heard from

Fans who listen to Spanish-language music without speaking Spanish. The notes below are themes, not statistics.

## What we heard

### 1. People want what the artist meant, not the words

When people saw literal translations, the reaction was disappointment: the song "felt deeper than that." Translations that kept the tone and explained the slang landed completely differently. People recognized lines they'd been singing for years.

**Implication:** translation quality is the product. A flat translation is worse than none, because it makes the song feel smaller.

### 2. Everyone has tried a workaround, and most gave up

- Pasting lyrics into a translation tool: confusing, often wrong on slang.
- Annotation sites: helpful when they exist, but not synced to the song and patchy for newer tracks.
- Asking bilingual friends: the most trusted method, but only when someone's around.
- Short explainer videos: good for one line, fragmented for a whole song.
- Most of the time: just vibing and not looking anything up.

**Implication:** the demand is there, and the friction is what stops people. The translation has to show up where they already are: on the line that's playing.

### 3. Context is the "aha," not the translation itself

The moments people reacted to most were the explanations: why a word is slang in Puerto Rico, a reference to a place, a line that means two things at once.

**Implication:** notes are a core feature, and they should be selective. Explaining every line would bury the good ones.

### 4. Reading has to keep up with listening

A line is on screen for a few seconds. Long translations get skipped.

**Implication:** translations should be about as long as the original line, with anything longer moved to a note.

## How this shaped v1

| Finding | Decision in the product |
|---|---|
| Meaning over words | Prompt asks for meaning and tone; the demo's word-for-word toggle shows the difference |
| Workarounds are too much friction | Follows Spotify automatically; no copying or searching |
| Context is the aha | Notes on slang, references and double meanings, shown on tap, marked with a dot |
| Reading must keep pace | Translations sized to the line; notes kept to one or two sentences |

## Next round

Once Spotify mode is deployed for a small group: watch five listeners use it on their own playlists, and collect per-line "this is wrong" feedback to see where translations miss.
