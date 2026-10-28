// Free, private translation with the translator built into Chrome on desktop
// (https://developer.chrome.com/docs/ai/translator-api). The model runs on the
// listener's computer: no API key, no server, no cost, and the lyrics never
// leave the device. The first use of a language pair downloads a small model,
// which Chrome only allows right after a click.

import { OWN_SCRIPT } from './language.js';

export function hasTranslator(scope = globalThis) {
  return typeof scope.Translator?.create === 'function' && typeof scope.Translator?.availability === 'function';
}

// 'available' | 'downloadable' | 'downloading' | 'unavailable'
export async function translatorStatus(source, target, scope = globalThis) {
  if (!hasTranslator(scope)) return 'unavailable';
  try {
    return await scope.Translator.availability({ sourceLanguage: source, targetLanguage: target });
  } catch {
    return 'unavailable';
  }
}

// Call straight from a click handler, before any other await, when the
// language pack still needs downloading: Chrome requires the click.
export function createTranslator(source, target, { onProgress, scope = globalThis } = {}) {
  return scope.Translator.create({
    sourceLanguage: source,
    targetLanguage: target,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded));
    },
  });
}

// Unique, non-empty lines in first-seen order, plus where each line maps, so a
// chorus is translated once.
export function dedupe(texts) {
  const unique = [];
  const seen = new Map();
  const map = texts.map((text) => {
    const key = String(text ?? '').trim();
    if (!key) return -1;
    if (!seen.has(key)) {
      seen.set(key, unique.length);
      unique.push(key);
    }
    return seen.get(key);
  });
  return { unique, map };
}

export function needsTranslation(text, source) {
  if (!text || !String(text).trim()) return false;
  const re = OWN_SCRIPT[source];
  return re ? re.test(text) : true;
}

const simplify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// Translates each distinct line once, in order. Returns an array aligned with
// `texts`: { text, same } per sung line, null for gaps. `same` marks lines
// that don't change (already in the listener's language). onUpdate gets the
// aligned array so far (undefined for lines still to come), so lines appear
// as they're translated; returning false from shouldContinue stops early
// (the song or the language changed).
export async function translateLines(translator, texts, source, { onUpdate, shouldContinue = () => true } = {}) {
  const { unique, map } = dedupe(texts);
  const done = Array.from({ length: unique.length }, () => undefined);
  const aligned = () => map.map((i) => (i < 0 ? null : done[i]));
  for (let i = 0; i < unique.length; i++) {
    if (!shouldContinue()) return null;
    const line = unique[i];
    if (!needsTranslation(line, source)) {
      done[i] = { text: line, same: true };
    } else {
      const out = String(await translator.translate(line)).trim();
      done[i] = { text: out, same: simplify(out) === simplify(line) };
    }
    onUpdate?.(aligned());
  }
  return aligned();
}

// A song already in the listener's language: every line stays as it is.
export const untranslated = (texts) => texts.map((t) => (t && String(t).trim() ? { text: String(t).trim(), same: true } : null));
