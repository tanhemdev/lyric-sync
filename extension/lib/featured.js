// Three songs to try, one each in Spanish, Korean and Hindi. Only facts about
// each song live here (title, artist, language, which LRCLIB entry to use).
// Lyrics are fetched from LRCLIB on the listener's computer when they play or
// preview a song, so no lyrics are stored in this repository.

export const FEATURED = [
  {
    id: 'dtmf',
    title: 'DtMF',
    artist: 'Bad Bunny',
    year: 2025,
    lang: 'es',
    lrclibId: 36840990,
  },
  {
    id: 'fake-love',
    title: 'FAKE LOVE',
    artist: 'BTS',
    year: 2018,
    lang: 'ko',
    lrclibId: 36804898,
  },
  {
    id: 'tum-hi-ho',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    year: 2013,
    lang: 'hi',
    // This entry is in Devanagari. Romanized entries exist too, but a Hindi
    // translator can't read Hindi written in Latin letters.
    lrclibId: 32902512,
  },
];

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// The featured song this track is, if any. Players credit co-writers too
// ("Mithoon, Arijit Singh") and add "(From ...)" to titles, so the match
// ignores anything in brackets and accepts any credited artist. A remix or
// live version has its own title, so it doesn't match.
export function matchFeatured(track) {
  const title = norm(track?.title);
  const artists = ` ${norm(track?.artist)} `;
  return FEATURED.find((s) => title === norm(s.title) && artists.includes(` ${norm(s.artist)} `)) ?? null;
}

export const spotifySearchUrl = (song) => `https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`;

export const appleMusicSearchUrl = (song) =>
  `https://music.apple.com/us/search?term=${encodeURIComponent(`${song.title} ${song.artist}`)}`;
