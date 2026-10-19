import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { menuPreloadFiles } from './scripts/menuPreload';
import { resolveDeliveryRecords, type DeliveryDefinition } from './src/render/deliveryFormats';

interface AudioCueRecord { files: string[]; characterId?: string; group?: string }
interface SemanticCheck { sha256: string; bytes: number }
interface SemanticOverlay {
  schemaVersion: number;
  cues: Record<string, AudioCueRecord>;
  fileChecks: Record<string, SemanticCheck>;
  lines: Array<{ file: string; transcriptVerified: boolean; translation: string }>;
}

/** Build-time validation shares the runtime's explicit override order, never directory scans. */
export function semanticAudioCatalog(samples: unknown, overlay: unknown, selected: readonly string[], readAudio: (file: string) => Uint8Array) {
  const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  if (!object(samples) || !object(samples.cues) || !object(overlay) || overlay.schemaVersion !== 1 || !object(overlay.cues) || !object(overlay.fileChecks) || !Array.isArray(overlay.lines)) throw new Error('Invalid semantic dialogue schema/cues/fileChecks/lines');
  const value = overlay as unknown as SemanticOverlay;
  const checks: Record<string, SemanticCheck> = {};
  for (const [id, cue] of Object.entries(value.cues)) {
    const match = /^voice\.([a-z0-9_]+)\.([a-z0-9_]+)$/.exec(id);
    if (!match || !object(cue) || cue.group !== 'voice' || cue.characterId !== match[1] || !Array.isArray(cue.files) || !cue.files.length) throw new Error(`Invalid semantic dialogue cue: ${id}`);
    for (const file of cue.files) {
      if (typeof file !== 'string' || !new RegExp(`^assets/audio/voice/${match[1]}/[a-zA-Z0-9_.-]+\\.(wav|mp3|ogg)$`).test(file) || file.includes('..')) throw new Error(`Unsafe semantic dialogue file: ${file}`);
      const check = value.fileChecks[file];
      if (!check || !/^[a-f0-9]{64}$/i.test(check.sha256 ?? '') || !Number.isSafeInteger(check.bytes) || check.bytes <= 0) throw new Error(`Missing semantic dialogue integrity: ${file}`);
      if (!value.lines.some(line => line?.file === file && line.transcriptVerified === true && typeof line.translation === 'string' && line.translation.trim())) throw new Error(`Unverified semantic dialogue line: ${file}`);
      if (!selected.includes(match[1]!)) continue;
      const bytes = readAudio(file);
      if (bytes.byteLength !== check.bytes || createHash('sha256').update(bytes).digest('hex') !== check.sha256.toLowerCase()) throw new Error(`Semantic dialogue exact audio mismatch: ${file}`);
      checks[file] = { sha256: check.sha256.toLowerCase(), bytes: check.bytes };
    }
  }
  const cues = Object.fromEntries(Object.entries({ ...samples.cues, ...value.cues } as Record<string, AudioCueRecord>).filter(([id, cue]) => {
    const owner = cue.characterId ?? (id.startsWith('voice.') ? id.split('.')[1] : undefined);
    return !owner || selected.includes(owner);
  }));
  return { cues, checks };
}

export function verifySemanticDeliveryRecords(records: Readonly<Record<string, DeliveryDefinition>>, checks: Readonly<Record<string, SemanticCheck>>): void {
  for (const [file, expected] of Object.entries(checks)) {
    const record = records[file];
    if (!record || record.source !== file || record.sourceSha256 !== expected.sha256) throw new Error(`Missing or stale semantic dialogue delivery: ${file}`);
    const slice = record.slice;
    if (slice && (!Number.isSafeInteger(slice.offset) || slice.offset < 0 || !Number.isSafeInteger(slice.length) || slice.length <= 0 || slice.offset + slice.length > record.bytes)) throw new Error(`Invalid semantic dialogue slice: ${file}`);
  }
}

export function readBuildAudio(root: URL, selected: readonly string[]) {
  const baseRaw = readFileSync(new URL('src/audio/sampleManifest.json', root));
  const semanticRaw = readFileSync(new URL('src/audio/semanticDialogue1017.json', root));
  return { ...semanticAudioCatalog(JSON.parse(baseRaw.toString()), JSON.parse(semanticRaw.toString()), selected,
    file => readFileSync(new URL('public/' + file, root))),
    sha256: createHash('sha256').update(semanticRaw).digest('hex'), baseSha256: createHash('sha256').update(baseRaw).digest('hex') };
}

export default defineConfig(({ mode }) => {
  let audioSnapshot: ReturnType<typeof readBuildAudio> | null = null;
  const buildAudio = (root: URL, ids: string[]) => {
    if (!audioSnapshot) audioSnapshot = readBuildAudio(root, ids);
    const current = (file: string) => createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex');
    if (current('src/audio/semanticDialogue1017.json') !== audioSnapshot.sha256 || current('src/audio/sampleManifest.json') !== audioSnapshot.baseSha256) throw new Error('Audio manifest changed during build; retry from a stable snapshot');
    return audioSnapshot;
  };
  return ({
  base: './',
  publicDir: mode === 'delivery' ? false : 'public',
  plugins: mode === 'delivery' ? [{
    name: 'verified-delivery-assets',
    buildStart() {
      const root = new URL('./', import.meta.url);
      const ui = JSON.parse(readFileSync(new URL('src/render/anime/uiArtManifest.json', root), 'utf8'));
      // Freeze before Rollup reads the imported JSON, not only when HTML is emitted.
      buildAudio(root, Object.keys(ui.characters));
    },
    transformIndexHtml() {
      const root = new URL('./', import.meta.url);
      const delivery = JSON.parse(readFileSync(new URL('src/render/deliveryManifest.json', root), 'utf8'));
      const ui = JSON.parse(readFileSync(new URL('src/render/anime/uiArtManifest.json', root), 'utf8'));
      const audio = buildAudio(root, Object.keys(ui.characters));
      const menuRoster = new Set(Object.keys(ui.characters));
      const menuAudio = Object.entries(audio.cues).filter(([id]) => id === 'menu_move' || id === 'menu_confirm'
        || (id.startsWith('voice.') && id.endsWith('.select') && menuRoster.has(id.split('.')[1]!))).flatMap(([, cue]) => cue.files);
      return menuPreloadFiles(delivery.records, ui.characters, menuAudio).map(file => ({
        tag: 'link',
        // Match AssetDownloads.fetch's CORS/credentials mode so the browser can reuse the request.
        attrs: { rel: 'preload', as: 'fetch', href: `./${file}`, crossorigin: 'anonymous', fetchpriority: 'low' },
        injectTo: 'head' as const,
      }));
    },
    generateBundle() {
      const root = new URL('./', import.meta.url);
      const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
      const delivery = readJson('src/render/deliveryManifest.json') as { version: string; records: Record<string, DeliveryDefinition> };
      resolveDeliveryRecords(delivery.records, 'webp');
      const ui = readJson('src/render/anime/uiArtManifest.json');
      const audio = buildAudio(root, Object.keys(ui.characters));
      verifySemanticDeliveryRecords(delivery.records, audio.checks);
      const files = new Set<string>();
      for (const record of Object.values(delivery.records).flatMap(item => item.avif ? [item, item.avif] : [item])) {
        if (!/^assets\/delivery\/[a-z0-9-]+\.(webp|avif|json|bin|ogg)$/.test(record.file)) throw new Error('Unsafe delivery path');
        const source = readFileSync(new URL(`public/${record.file}`, root));
        if (source.length !== record.bytes || createHash('sha256').update(source).digest('hex') !== record.sha256) throw new Error(`Delivery asset changed: ${record.file}`);
        if (!files.has(record.file)) this.emitFile({ type: 'asset', fileName: record.file, source });
        files.add(record.file);
      }
      const legacy = ['luffy', 'akainu'].flatMap(id => ['atlas.png', 'atlas.json', 'placeholder.png', 'placeholder.json'].map(name => `assets/characters/${id}/${name}`));
      for (const file of [...legacy, 'assets/audio/music/CREDITS.txt']) {
        if (!/^assets\/[a-zA-Z0-9_./-]+$/.test(file) || file.split('/').includes('..')) throw new Error('Unsafe public path');
        if (!files.has(file)) this.emitFile({ type: 'asset', fileName: file, source: readFileSync(new URL(`public/${file}`, root)) });
        files.add(file);
      }
      buildAudio(root, Object.keys(ui.characters));
      this.emitFile({ type: 'asset', fileName: 'delivery-build.json', source: JSON.stringify({ version: delivery.version, files: [...files].sort(), semanticDialogue: { sha256: audio.sha256, baseSha256: audio.baseSha256 } }) });
    },
  }] : [],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@input': fileURLToPath(new URL('./src/input', import.meta.url)),
      '@characters': fileURLToPath(new URL('./src/characters', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1600, // phaser 单独成块约 1.5 MB，属预期
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
});
