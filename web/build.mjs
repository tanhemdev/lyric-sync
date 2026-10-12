// Bundles the app into web/dist with esbuild.
//   node build.mjs           production build
//   node build.mjs --watch   rebuild on change
//
// config.json tells the app how to reach Spotify and the translation
// endpoint. It is written from environment variables when they are set
// (for example on Vercel), otherwise public/config.json is used as is.
import { build, context } from 'esbuild';
import { cp, mkdir, copyFile, writeFile } from 'node:fs/promises';

const dist = new URL('./dist/', import.meta.url);
await mkdir(dist, { recursive: true });
const watch = process.argv.includes('--watch');
const options = {
  entryPoints: { app: 'src/main.jsx' },
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  minify: !watch,
  sourcemap: true,
  target: ['es2020'],
  outdir: 'dist',
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  logLevel: 'info',
};

await copyFile(new URL('./index.html', import.meta.url), new URL('./index.html', dist));
await cp(new URL('./public/', import.meta.url), dist, { recursive: true });
await copyFile(new URL('./src/styles.css', import.meta.url), new URL('./app.css', dist));

const { LYRICSYNC_SPOTIFY_CLIENT_ID: clientId, LYRICSYNC_TRANSLATE_URL: translateUrl } = process.env;
if (clientId || translateUrl) {
  await writeFile(new URL('./config.json', dist), JSON.stringify({ spotifyClientId: clientId ?? '', translateUrl: translateUrl ?? '/api/translate' }, null, 2) + '\n');
}

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}
