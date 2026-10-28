// Language detection and on-device translation helpers. All text is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptLanguage, wordLanguage, detectLanguage, languageName } from '../../extension/lib/language.js';
import { dedupe, needsTranslation, translateLines, untranslated, hasTranslator, translatorStatus } from '../../extension/lib/ondevice.js';

test('tells languages with their own script apart', () => {
  assert.equal(scriptLanguage('테스트 가사 첫 줄\noh oh test'), 'ko');
  assert.equal(scriptLanguage('यह परीक्षण की पहली पंक्ति है'), 'hi');
  assert.equal(scriptLanguage('テストの歌詞です'), 'ja');
  assert.equal(scriptLanguage('测试歌词'), 'zh');
  assert.equal(scriptLanguage('ਇਹ ਟੈਸਟ ਹੈ'), 'pa');
  assert.equal(scriptLanguage('una línea de prueba'), null);
  assert.equal(scriptLanguage(''), null);
});

test('votes on common words for Latin-script songs', () => {
  assert.equal(wordLanguage('yo no sé qué decir pero te quiero con mi vida y la noche es para ti'), 'es');
  assert.equal(wordLanguage('oh baby you and me tonight all the love is in the air for us'), 'en');
  assert.equal(wordLanguage('too short'), null);
});

test("uses Chrome's detector for Latin-script songs when it's confident", async () => {
  const detector = (lang, confidence) => ({ detect: async () => [{ detectedLanguage: lang, confidence }] });
  const lines = ['eu não sei o que fazer', 'com você aqui'];
  assert.equal(await detectLanguage(lines, { detector: detector('pt-BR', 0.9) }), 'pt');
  // Not confident, or no answer: fall back to the word vote.
  assert.equal(await detectLanguage(['yo no sé qué decir pero te quiero con mi vida y la noche'], { detector: detector('it', 0.2) }), 'es');
  assert.equal(await detectLanguage(['테스트 줄'], { detector: detector('en', 0.99) }), 'ko');
  assert.equal(await detectLanguage(['yo no sé qué decir pero te quiero con mi vida'], { detector: { detect: async () => { throw new Error('x'); } } }), 'es');
});

test('names languages in English', () => {
  assert.equal(languageName('es'), 'Spanish');
  assert.equal(languageName('ko'), 'Korean');
});

test('translates each distinct line once and maps choruses back', () => {
  const { unique, map } = dedupe(['coro', '', 'verso', 'coro ']);
  assert.deepEqual(unique, ['coro', 'verso']);
  assert.deepEqual(map, [0, -1, 1, 0]);
});

test('skips lines sung in another language inside a K-pop or Bollywood song', () => {
  assert.equal(needsTranslation('테스트 줄', 'ko'), true);
  assert.equal(needsTranslation('oh oh test hook', 'ko'), false);
  assert.equal(needsTranslation('una línea', 'es'), true);
  assert.equal(needsTranslation('   ', 'es'), false);
});

test('translates progressively, keeps gaps, and marks lines that stay the same', async () => {
  const calls = [];
  const translator = { translate: async (t) => (calls.push(t), t === 'hola' ? 'Hola' : `EN ${t}`) };
  const updates = [];
  const out = await translateLines(translator, ['línea uno', '', 'hola', 'línea uno'], 'es', { onUpdate: (a) => updates.push(a) });
  assert.deepEqual(calls, ['línea uno', 'hola']);
  assert.deepEqual(out, [{ text: 'EN línea uno', same: false }, null, { text: 'Hola', same: true }, { text: 'EN línea uno', same: false }]);
  // The first update arrives before the second line is done.
  assert.equal(updates[0][2], undefined);
  assert.equal(updates.length, 2);
});

test('stops when the song or language changes', async () => {
  let go = true;
  const translator = { translate: async (t) => ((go = false), t.toUpperCase()) };
  assert.equal(await translateLines(translator, ['uno', 'dos'], 'es', { shouldContinue: () => go }), null);
});

test('leaves songs already in your language alone', () => {
  assert.deepEqual(untranslated(['hello', '']), [{ text: 'hello', same: true }, null]);
});

test('reports whether the built-in translator exists and what it can do', async () => {
  assert.equal(hasTranslator({}), false);
  assert.equal(await translatorStatus('es', 'en', {}), 'unavailable');
  const scope = { Translator: { create() {}, availability: async ({ sourceLanguage }) => (sourceLanguage === 'es' ? 'available' : 'downloadable') } };
  assert.equal(hasTranslator(scope), true);
  assert.equal(await translatorStatus('es', 'en', scope), 'available');
  assert.equal(await translatorStatus('ko', 'en', scope), 'downloadable');
  const broken = { Translator: { create() {}, availability: async () => { throw new Error('nope'); } } };
  assert.equal(await translatorStatus('es', 'en', broken), 'unavailable');
});
