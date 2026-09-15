import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Offline packaging only. Publishing remains an explicit, separate Git operation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(root, process.argv[2] ?? '.local-releases/candidate-0913');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputRoot = path.resolve(process.argv[3] ?? path.join(root, '.local-releases', '公开部署-0914'));
const release = path.join(outputRoot, stamp);
const site = path.join(release, 'site');
const files = new Set(['index.html']);
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const safePath = (base, relative) => {
  if (!relative || relative.includes('\\') || relative.split('/').includes('..') || path.isAbsolute(relative)) throw new Error(`Unsafe path: ${relative}`);
  const resolved = path.resolve(base, relative);
  if (!resolved.startsWith(`${base}${path.sep}`)) throw new Error(`Path outside package: ${relative}`);
  return resolved;
};
const add = relative => { safePath(source, relative); files.add(relative); };
const html = readFileSync(path.join(source, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/(assets\/[^"?#]+\.(?:js|css))"/g)) add(match[1]);
// Resolve only local compiled module dependencies, never old hashes or source maps.
for (const file of files) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  const text = readFileSync(safePath(source, file), 'utf8');
  for (const match of text.matchAll(/["']\.\/([^"'?#]+\.(?:js|css))["']/g)) add(path.posix.join(path.posix.dirname(file), match[1]));
}
const ui = readJson(path.join(root, 'src/render/anime/uiArtManifest.json'));
const deliveryBuild = existsSync(path.join(source, 'delivery-build.json')) ? readJson(path.join(source, 'delivery-build.json')) : null;
if (deliveryBuild) {
  const delivery = readJson(path.join(root, 'src/render/deliveryManifest.json'));
  if (deliveryBuild.version !== delivery.version) throw new Error('Delivery build version differs from packaging manifest');
  add('delivery-build.json');
  for (const record of Object.values(delivery.records)) {
    const bytes = readFileSync(safePath(source, record.file));
    if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw new Error(`Delivery content mismatch: ${record.file}`);
    add(record.file);
  }
}
for (const id of ['luffy', 'akainu']) {
  const base = `assets/characters/${id}`;
  for (const name of ['atlas.png', 'atlas.json', 'placeholder.png', 'placeholder.json']) add(`${base}/${name}`);
  if (deliveryBuild) continue;
  const runtimeFile = `${base}/anime/runtime.json`;
  const runtime = readJson(safePath(source, runtimeFile));
  if (runtime.characterId !== id || runtime.textureDensity !== 2 || !runtime.pages?.length) throw new Error(`Invalid anime bundle: ${id}`);
  add(runtimeFile);
  for (const page of runtime.pages) {
    add(`${base}/anime/${page.image}`);
    add(`${base}/anime/${page.data}`);
  }
  add(ui.characters[id].image);
  for (const name of ['atlas.png', 'atlas.json', 'placeholder.png', 'placeholder.json']) add(`${base}/${name}`);
  add(`assets/fx/${id}.png`);
  add(`assets/fx/${id}.json`);
}
if (!deliveryBuild) for (const name of ['backdrop', 'floor']) add(`assets/stages/marineford/${name}.webp`);
const samples = readJson(path.join(root, 'src/audio/sampleManifest.json'));
if (!deliveryBuild) for (const cue of Object.values(samples.cues)) for (const file of cue.files) add(file);
const music = readJson(path.join(root, 'src/audio/musicManifest.json'));
if (!deliveryBuild) for (const track of Object.values(music.tracks)) add(track.file);
add('assets/audio/music/CREDITS.txt');

const manifest = [...files].sort().map(file => {
  const data = readFileSync(safePath(source, file));
  if (data.length > 100 * 1024 * 1024) throw new Error(`GitHub file limit: ${file}`);
  return { file, bytes: data.length, sha256: hash(data) };
});
// Keep each attempt intact, and write the full inventory before copying anything.
if (existsSync(release)) throw new Error(`Release already exists: ${release}`);
mkdirSync(release, { recursive: true });
writeFileSync(path.join(release, 'copy-before.json'), JSON.stringify({ source, files: manifest }, null, 2));
for (const entry of manifest) {
  const destination = safePath(site, entry.file);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(safePath(source, entry.file), destination);
  if (hash(readFileSync(destination)) !== entry.sha256) throw new Error(`Copy mismatch: ${entry.file}`);
}

// This runs synchronously before Vite modules read the presentation and canvas size.
const defaults = `    <script>
      (() => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('art')) {
          url.searchParams.set('art', 'anime');
          if (!url.searchParams.has('scope')) url.searchParams.set('scope', 'full');
          if (!url.searchParams.has('quality')) url.searchParams.set('quality', 'high');
          window.history.replaceState(null, '', url);
        }
      })();
    </script>\n`;
if (!html.includes('    <script type="module"')) throw new Error('Missing module entry');
writeFileSync(path.join(site, 'index.html'), html.replace('    <script type="module"', `${defaults}    <script type="module"`));
writeFileSync(path.join(site, '.nojekyll'), '');
writeFileSync(path.join(site, '.gitattributes'), '* -text\n');
const published = [...files, '.nojekyll', '.gitattributes'].sort().map(file => {
  const bytes = readFileSync(safePath(site, file));
  return { file, bytes: bytes.length, sha256: hash(bytes) };
});
const report = {
  createdAt: new Date().toISOString(), source, site,
  defaultPresentation: { art: 'anime', scope: 'full', quality: 'high' },
  gameCodeUnchanged: true,
  fileCount: published.length,
  totalBytes: published.reduce((total, item) => total + item.bytes, 0),
  files: published,
};
writeFileSync(path.join(release, 'package-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ release, site, fileCount: report.fileCount, totalBytes: report.totalBytes }, null, 2));
