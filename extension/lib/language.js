// Works out what language a song is sung in, from its lyrics.
//   1. Script: Hangul means Korean, Devanagari means Hindi, and so on.
//   2. For Latin-script songs, Chrome's built-in language detector, when it's
//      ready to use.
//   3. Otherwise, a vote on very common words, enough to tell the main
//      Latin-script languages apart.

const SCRIPTS = [
  ['ko', /\p{Script=Hangul}/u],
  ['ja', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ['zh', /\p{Script=Han}/u],
  ['hi', /\p{Script=Devanagari}/u],
  ['pa', /\p{Script=Gurmukhi}/u],
  ['bn', /\p{Script=Bengali}/u],
  ['ta', /\p{Script=Tamil}/u],
  ['te', /\p{Script=Telugu}/u],
  ['ru', /\p{Script=Cyrillic}/u],
  ['ar', /\p{Script=Arabic}/u],
  ['he', /\p{Script=Hebrew}/u],
  ['el', /\p{Script=Greek}/u],
  ['th', /\p{Script=Thai}/u],
];

// Lines in a song's own script, for languages that have one. A line without
// any of it is sung in another language (often an English hook in a K-pop or
// Bollywood song), so there's nothing to translate.
export const OWN_SCRIPT = Object.fromEntries(SCRIPTS);

export function scriptLanguage(text) {
  const letters = String(text ?? '').match(/\p{L}/gu) ?? [];
  if (!letters.length) return null;
  const counts = new Map();
  for (const ch of letters) {
    for (const [lang, re] of SCRIPTS) {
      if (re.test(ch)) {
        counts.set(lang, (counts.get(lang) ?? 0) + 1);
        break;
      }
    }
  }
  // Japanese mixes kana with kanji, which on their own look like Chinese.
  if (counts.get('ja')) counts.set('ja', counts.get('ja') + (counts.get('zh') ?? 0));
  let best = null;
  for (const [lang, n] of counts) if (n / letters.length >= 0.2 && (!best || n > counts.get(best))) best = lang;
  return best;
}

const COMMON = {
  en: 'the you and i me my to it is in that your we on be all love oh baby what',
  es: 'que el la de y mi tu no yo me te lo con por para una es un pero como si mas quiero',
  pt: 'que o a de e eu você voce não nao meu com pra um uma se te é mais quando',
  fr: 'je tu le la les et pas moi toi de un une que mon ton est dans pour sur',
  it: 'che il la di e non mi ti io tu un una per con sei come amore',
  de: 'ich du und die der das nicht mir dich ist ein eine mein wir zu',
};
const WORDS = Object.fromEntries(Object.entries(COMMON).map(([k, v]) => [k, new Set(v.split(' '))]));

export function wordLanguage(text) {
  const tokens = String(text ?? '').toLowerCase().match(/\p{L}+/gu) ?? [];
  if (tokens.length < 8) return null;
  let best = null;
  let bestScore = 0;
  for (const [lang, set] of Object.entries(WORDS)) {
    const score = tokens.filter((t) => set.has(t)).length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  return bestScore / tokens.length >= 0.08 ? best : null;
}

// `detector` is an instance of Chrome's LanguageDetector, or null.
export async function detectLanguage(texts, { detector = null } = {}) {
  const text = texts.filter(Boolean).join('\n');
  const byScript = scriptLanguage(text);
  if (byScript) return byScript;
  if (detector) {
    try {
      const [top] = await detector.detect(text);
      if (top && top.detectedLanguage !== 'und' && top.confidence >= 0.5) return top.detectedLanguage.split('-')[0];
    } catch {
      // fall through to the word vote
    }
  }
  return wordLanguage(text);
}

const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;

export function languageName(code) {
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
}
