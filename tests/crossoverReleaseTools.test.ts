import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFile, mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

const run = promisify(execFile);
const children: ChildProcess[] = [];
afterEach(() => { for (const child of children.splice(0)) child.kill(); });
const hash = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

async function write(root: string, relative: string, data: string | Buffer): Promise<void> {
  const file = resolve(root, relative);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
}

async function verifiedSnapshot(root: string, files: Record<string, string>): Promise<void> {
  const inventory = [];
  for (const [file, data] of Object.entries(files)) {
    await write(root, file, data);
    inventory.push({ file, bytes: Buffer.byteLength(data), sha256: hash(data) });
  }
  await writeFile(`${root}-verified.json`, JSON.stringify({ verified: true, destination: root, files: inventory }));
}

async function packageFixture(delivered = true) {
  const root = await mkdtemp(resolve(tmpdir(), 'opf-crossover-package-'));
  await mkdir(resolve(root, 'scripts'));
  await copyFile(resolve('scripts/packagePages.mjs'), resolve(root, 'scripts/packagePages.mjs'));
  const source = resolve(root, 'candidate');
  const output = resolve(root, 'output');
  await write(source, 'index.html', '<html>\n    <script type="module" src="./assets/app.js"></script>\n</html>');
  await write(source, 'assets/app.js', 'console.log("candidate")');
  if (delivered) await write(source, 'delivery-build.json', JSON.stringify({ version: 'delivery-test' }));
  await write(source, 'assets/audio/music/CREDITS.txt', 'credits');
  for (const id of ['luffy', 'akainu']) for (const name of ['atlas.png', 'atlas.json', 'placeholder.png', 'placeholder.json']) {
    await write(source, `assets/characters/${id}/${name}`, `${id}:${name}`);
  }
  const logical = {
    'assets/characters/hero/anime/runtime.json': ['assets/delivery/hero-runtime.json', '{"characterId":"hero"}'],
    'assets/characters/hero/anime/ui.png': ['assets/delivery/hero-ui.webp', 'hero-ui'],
    'assets/fx/hero/atlas.json': ['assets/delivery/hero-fx.json', '{"frames":{}}'],
    'assets/fx/hero/atlas.png': ['assets/delivery/hero-fx.webp', 'hero-fx'],
    'assets/fx/common/atlas.json': ['assets/delivery/common-fx.json', '{"frames":{}}'],
    'assets/fx/common/atlas.png': ['assets/delivery/common-fx.webp', 'common-fx'],
  } as const;
  const records: Record<string, unknown> = {};
  for (const [url, [file, data]] of Object.entries(logical)) {
    await write(source, file, data);
    records[url] = { file, bytes: Buffer.byteLength(data), sha256: hash(data), contentType: 'application/octet-stream', source: url, sourceSha256: hash(`source:${url}`) };
  }
  await write(root, 'src/render/anime/uiArtManifest.json', JSON.stringify({ characters: { hero: { image: 'assets/characters/hero/anime/ui.png', pcRosterAccepted: true } } }));
  await write(root, 'src/render/deliveryManifest.json', JSON.stringify({ version: 'delivery-test', records }));
  await write(root, 'src/audio/sampleManifest.json', JSON.stringify({ cues: {} }));
  await write(root, 'src/audio/semanticDialogue1017.json', JSON.stringify({ schemaVersion: 1, cues: {}, lines: [], fileChecks: {} }));
  await write(root, 'src/audio/musicManifest.json', JSON.stringify({ tracks: {} }));
  if (!delivered) {
    for (const [logicalPath, [, data]] of Object.entries(logical)) await write(source, logicalPath, data);
    await write(source, 'assets/characters/hero/anime/runtime.json', JSON.stringify({ characterId: 'hero', textureDensity: 2, pages: [{ image: 'atlas.png', data: 'atlas.json' }] }));
    await write(source, 'assets/characters/hero/anime/atlas.png', 'body');
    await write(source, 'assets/characters/hero/anime/atlas.json', '{}');
    for (const name of ['backdrop', 'floor']) await write(source, `assets/stages/marineford/${name}.webp`, name);
  }
  return { root, source, output };
}


async function semanticPackageFixture(delivered: boolean) {
  const fixture = await packageFixture(delivered);
  const file = 'assets/audio/voice/hero/named1017.wav', unselected = 'assets/audio/voice/not_selected/private1017.wav';
  const raw = 'explicit meaningful audio fixture', payload = 'encoded-fixture';
  const overlay = { schemaVersion: 1, cues: {
    'voice.hero.sp_named': { files: [file], group: 'voice', characterId: 'hero' },
    'voice.not_selected.intro': { files: [unselected], group: 'voice', characterId: 'not_selected' },
  }, lines: [file, unselected].map(file => ({ file, transcriptVerified: true, translation: '测试句子' })),
    fileChecks: Object.fromEntries([file, unselected].map(file => [file, { bytes: Buffer.byteLength(raw), sha256: hash(raw) }])) };
  await write(fixture.root, 'src/audio/semanticDialogue1017.json', JSON.stringify(overlay));
  await write(fixture.root, 'public/' + file, raw);
  if (delivered) {
    const manifestPath = resolve(fixture.root, 'src/render/deliveryManifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.records[file] = { file: 'assets/delivery/semantic-hero.bin', bytes: Buffer.byteLength(payload), sha256: hash(payload),
      source: file, sourceSha256: hash(raw), contentType: 'audio/ogg', slice: { offset: 0, length: Buffer.byteLength(payload) } };
    await writeFile(manifestPath, JSON.stringify(manifest));
    await write(fixture.source, 'assets/delivery/semantic-hero.bin', payload);
    await write(fixture.source, 'delivery-build.json', JSON.stringify({ version: 'delivery-test', semanticDialogue: {
      sha256: hash(JSON.stringify(overlay)), baseSha256: hash(await readFile(resolve(fixture.root, 'src/audio/sampleManifest.json'))),
    } }));
  } else await write(fixture.source, file, raw);
  return { ...fixture, file, raw, overlay };
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  await new Promise<void>(done => server.close(() => done()));
  return address.port;
}

function launch(script: string, release: string, port: number, crossoverRoot: string) {
  const child = spawn(process.execPath, [script, '--release', release, '--full', '--no-open', '--port', String(port)], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, OPF_CROSSOVER_ROOT: crossoverRoot },
  });
  children.push(child);
  let output = '';
  child.stdout?.on('data', data => { output += String(data); });
  child.stderr?.on('data', data => { output += String(data); });
  return { child, output: () => output };
}

describe('crossover release tools', () => {
  it.each([false, true])('semantic explicit new files enter only their selected runtime whitelist (delivery=%s)', async delivered => {
    const f = await semanticPackageFixture(delivered);
    const { stdout } = await run(process.execPath, [resolve(f.root, 'scripts/packagePages.mjs'), f.source, f.output]);
    const result = JSON.parse(stdout) as { site: string; release: string };
    const report = JSON.parse(await readFile(resolve(result.release, 'package-report.json'), 'utf8'));
    expect(report.semanticDialogue.selectedFiles).toEqual([f.file]);
    const expected = delivered ? 'assets/delivery/semantic-hero.bin' : f.file;
    expect(report.files.some((item: { file: string }) => item.file === expected)).toBe(true);
    expect(report.files.some((item: { file: string }) => item.file.includes('not_selected') || item.file.includes('sources/'))).toBe(false);
    expect(await readFile(resolve(result.site, expected), 'utf8')).toBe(delivered ? 'encoded-fixture' : f.raw);
  });

  it('semantic stale source identity and invalid bank bounds stop before copying', async () => {
    for (const field of ['sourceSha256', 'slice'] as const) {
      const f = await semanticPackageFixture(true), path = resolve(f.root, 'src/render/deliveryManifest.json');
      const manifest = JSON.parse(await readFile(path, 'utf8'));
      if (field === 'slice') manifest.records[f.file].slice = { offset: 1, length: 9999 };
      else manifest.records[f.file].sourceSha256 = '0'.repeat(64);
      await writeFile(path, JSON.stringify(manifest));
      await expect(run(process.execPath, [resolve(f.root, 'scripts/packagePages.mjs'), f.source, f.output]))
        .rejects.toMatchObject({ stderr: expect.stringContaining(field === 'slice' ? 'Invalid semantic dialogue slice' : 'stale semantic dialogue delivery') });
      await expect(stat(f.output)).rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('semantic raw bytes and the compiled overlay snapshot cannot drift silently', async () => {
    const f = await semanticPackageFixture(true);
    await write(f.root, 'public/' + f.file, 'tampered');
    await expect(run(process.execPath, [resolve(f.root, 'scripts/packagePages.mjs'), f.source, f.output]))
      .rejects.toMatchObject({ stderr: expect.stringContaining('Semantic dialogue exact audio mismatch') });
    await write(f.root, 'public/' + f.file, f.raw);
    await write(f.source, 'delivery-build.json', JSON.stringify({ version: 'delivery-test', semanticDialogue: { sha256: '0'.repeat(64), baseSha256: '0'.repeat(64) } }));
    await expect(run(process.execPath, [resolve(f.root, 'scripts/packagePages.mjs'), f.source, f.output]))
      .rejects.toMatchObject({ stderr: expect.stringContaining('snapshot differs') });
  });

  it.each([false, true])('checks both atlas formats before copying (corrupt alternate=%s)', async corrupt => {
    const fixture = await packageFixture();
    const manifestPath = resolve(fixture.root, 'src/render/deliveryManifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const logical = 'assets/characters/hero/anime/atlas.webp';
    const source = 'assets/characters/hero/anime/atlas.png';
    const record = { file: 'assets/delivery/hero-atlas.webp', bytes: 4, sha256: hash('webp'), contentType: 'image/webp', source, sourceSha256: hash('original') };
    const alternate = { ...record, file: 'assets/delivery/hero-atlas.avif', sha256: hash('avif'), contentType: 'image/avif' };
    manifest.records[logical] = { ...record, avif: alternate };
    await writeFile(manifestPath, JSON.stringify(manifest));
    await write(fixture.source, record.file, 'webp');
    await write(fixture.source, alternate.file, corrupt ? 'bad!' : 'avif');
    const operation = run(process.execPath, [resolve(fixture.root, 'scripts/packagePages.mjs'), fixture.source, fixture.output]);
    if (corrupt) {
      await expect(operation).rejects.toMatchObject({ stderr: expect.stringContaining('Delivery content mismatch: assets/delivery/hero-atlas.avif') });
      await expect(stat(fixture.output)).rejects.toMatchObject({ code: 'ENOENT' });
    } else {
      const result = JSON.parse((await operation).stdout) as { site: string };
      expect(await readFile(resolve(result.site, record.file), 'utf8')).toBe('webp');
      expect(await readFile(resolve(result.site, alternate.file), 'utf8')).toBe('avif');
    }
  });

  it('copies verified v1 and nested v2/v1 snapshots byte-for-byte', async () => {
    const fixture = await packageFixture();
    const v1 = resolve(fixture.root, 'frozen-v1');
    const v2 = resolve(fixture.root, 'frozen-v2');
    await verifiedSnapshot(v1, { 'index.html': '<h1>frozen 1</h1>' });
    await verifiedSnapshot(v2, { 'index.html': '<h1>frozen 2</h1>', 'v1/index.html': '<h1>nested frozen 1</h1>' });
    const result = await run(process.execPath, [resolve(fixture.root, 'scripts/packagePages.mjs'), fixture.source, fixture.output, '--v1', v1, '--v2', v2]);
    const summary = JSON.parse(result.stdout) as { site: string };
    expect(await readFile(resolve(summary.site, 'v1/index.html'), 'utf8')).toBe('<h1>frozen 1</h1>');
    expect(await readFile(resolve(summary.site, 'v2/index.html'), 'utf8')).toBe('<h1>frozen 2</h1>');
    expect(await readFile(resolve(summary.site, 'v2/v1/index.html'), 'utf8')).toBe('<h1>nested frozen 1</h1>');
    expect(await readFile(resolve(summary.site, 'assets/delivery/hero-runtime.json'), 'utf8')).toBe('{"characterId":"hero"}');
  });

  it('rejects a changed file inside the nested frozen v1 inventory', async () => {
    const fixture = await packageFixture();
    const v2 = resolve(fixture.root, 'frozen-v2');
    await verifiedSnapshot(v2, { 'index.html': '<h1>frozen 2</h1>', 'v1/index.html': '<h1>nested frozen 1</h1>' });
    await write(v2, 'v1/index.html', 'tampered');
    await expect(run(process.execPath, [resolve(fixture.root, 'scripts/packagePages.mjs'), fixture.source, fixture.output, '--v2', v2]))
      .rejects.toMatchObject({ stderr: expect.stringContaining('Frozen v2 changed: v1/index.html') });
  });

  it('rejects non-runtime files even when a v2 inventory marks them verified', async () => {
    const fixture = await packageFixture();
    const v2 = resolve(fixture.root, 'frozen-v2');
    await verifiedSnapshot(v2, { 'index.html': '<h1>frozen 2</h1>', 'v1/private.exe': 'not runtime' });
    await expect(run(process.execPath, [resolve(fixture.root, 'scripts/packagePages.mjs'), fixture.source, fixture.output, '--v2', v2]))
      .rejects.toMatchObject({ stderr: expect.stringContaining('Not a runtime v2 file: v1/private.exe') });
  });

  it('stops before creating an output when any declared character art is disabled', async () => {
    const fixture = await packageFixture();
    await write(fixture.root, 'src/render/anime/uiArtManifest.json', JSON.stringify({
      characters: { hero: { image: 'assets/characters/hero/anime/ui.png', enabled: false, reviewStatus: 'blocked-user-review' } },
    }));
    await expect(run(process.execPath, [resolve(fixture.root, 'scripts/packagePages.mjs'), fixture.source, fixture.output]))
      .rejects.toMatchObject({ stderr: expect.stringContaining('Disabled character art cannot enter a formal runtime package: hero (blocked-user-review)') });
    await expect(stat(fixture.output)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('maps the crossover candidate and frozen 2.0 to separate verified roots', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'opf-crossover-launch-'));
    await mkdir(resolve(root, 'scripts'));
    for (const name of ['playCandidate.mjs', 'openLocalUrl.mjs']) await copyFile(resolve('scripts', name), resolve(root, 'scripts', name));
    const crossover = resolve(root, 'external');
    await write(crossover, 'playable/index.html', '<h1>crossover</h1>');
    await write(crossover, 'baseline/v2/index.html', '<h1>frozen 2</h1>');
    await write(crossover, 'baseline/v2/v1/index.html', '<h1>frozen 1</h1>');
    const script = resolve(root, 'scripts/playCandidate.mjs');
    const candidatePort = await freePort();
    const candidate = launch(script, 'candidate-crossover-0922', candidatePort, crossover);
    await expect.poll(candidate.output, { timeout: 5000 }).toContain('完整动漫候选');
    expect(await (await fetch(`http://127.0.0.1:${candidatePort}/`)).text()).toBe('<h1>crossover</h1>');
    const classicPort = await freePort();
    const classic = launch(script, 'classic-2', classicPort, crossover);
    await expect.poll(classic.output, { timeout: 5000 }).toContain('冻结2.0完整动漫版');
    expect(await (await fetch(`http://127.0.0.1:${classicPort}/`)).text()).toBe('<h1>frozen 2</h1>');
    expect(await (await fetch(`http://127.0.0.1:${classicPort}/v1/`)).text()).toBe('<h1>frozen 1</h1>');
  }, 15000);
});
