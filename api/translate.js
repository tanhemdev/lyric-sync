// POST /api/translate  { title, artist, lang, lines: string[] }
//   -> { lines: [{ meaning, note }] }   one entry per input line
//
// A Vercel serverless function. The Anthropic API key stays here on the
// server; the browser app never sees it.
// Env: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional),
//      ALLOWED_ORIGINS (comma-separated, for cross-origin callers such as
//      GitHub Pages; same-origin calls on Vercel need nothing).

import Anthropic from '@anthropic-ai/sdk';
import { validateRequest, corsHeaders } from './_lib/validate.js';
import { systemPrompt, userMessage } from './_lib/prompt.js';
import { parseTranslation } from './_lib/parse.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export async function translate(input, client) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt(input.lang),
    messages: [{ role: 'user', content: userMessage(input) }],
  });
  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return parseTranslation(text, input.lines.length);
}

export default async function handler(req, res, { client } = {}) {
  for (const [k, v] of Object.entries(corsHeaders(req.headers?.origin, process.env.ALLOWED_ORIGINS))) res.setHeader(k, v);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const checked = validateRequest(req.body);
  if (!checked.ok) return res.status(400).json({ error: checked.error });

  if (!client && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'This deployment has no ANTHROPIC_API_KEY set.' });
  }
  try {
    const result = await translate(checked.value, client ?? new Anthropic());
    if (!result.ok) return res.status(502).json({ error: result.error });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ lines: result.lines, missing: result.missing });
  } catch (err) {
    console.error('translate failed', err);
    return res.status(502).json({ error: 'Translation service error. Try again in a moment.' });
  }
}
