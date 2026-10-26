// Builds app/www from the web game in the repo root, so the app and the website share one source.
// - copies index.html and its assets (cards, icons, fonts, PeerJS)
// - drops the service worker (the app already ships every file)
// - bundles src/native.js (haptics, status bar, back button, keep-awake) and loads it in the page
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(app, '..');
const www = join(app, 'www');

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const dir of ['carte', 'icone', 'fonts', 'vendor']) await cp(join(root, dir), join(www, dir), { recursive: true });

let html = await readFile(join(root, 'index.html'), 'utf8');
const sw = /<script>if \('serviceWorker' in navigator\)[^<]*<\/script>\n?/;
if (!sw.test(html)) throw new Error('Service worker registration not found in index.html');
html = html.replace(sw, '');
// After the viewport meta, so the opening animation measures the real screen size.
const viewport = /<meta name="viewport"[^>]*>/;
if (!viewport.test(html)) throw new Error('viewport meta not found in index.html');
html = html.replace(viewport, m => m + '\n<script src="native.js"></script>');
await writeFile(join(www, 'index.html'), html);

await build({
  entryPoints: [join(app, 'src/native.js')],
  outfile: join(www, 'native.js'),
  bundle: true, minify: true, format: 'iife', target: ['safari15', 'chrome100'],
  logLevel: 'warning',
});
console.log('www pronta:', www);
