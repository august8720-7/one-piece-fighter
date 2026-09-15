import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: mode === 'delivery' ? false : 'public',
  plugins: mode === 'delivery' ? [{
    name: 'verified-delivery-assets',
    generateBundle() {
      const root = new URL('./', import.meta.url);
      const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
      const delivery = readJson('src/render/deliveryManifest.json') as { version: string; records: Record<string, { file: string; bytes: number; sha256: string }> };
      const files = new Set<string>();
      for (const record of Object.values(delivery.records)) {
        if (!/^assets\/delivery\/[a-z0-9-]+\.(webp|json|bin|ogg)$/.test(record.file)) throw new Error('Unsafe delivery path');
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
      this.emitFile({ type: 'asset', fileName: 'delivery-build.json', source: JSON.stringify({ version: delivery.version, files: [...files].sort() }) });
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
}));
