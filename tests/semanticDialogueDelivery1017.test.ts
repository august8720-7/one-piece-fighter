import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { semanticAudioCatalog, readBuildAudio, verifySemanticDeliveryRecords } from '../vite.config';
import { menuPreloadFiles } from '../scripts/menuPreload';

const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const file = 'assets/audio/voice/luffy/named1017.wav';
const other = 'assets/audio/voice/akainu/other1017.wav';
const bytes = new TextEncoder().encode('explicit accepted fixture');
function fixture() {
  return { schemaVersion: 1, cues: {
    'voice.luffy.select': { files: [file], group: 'voice', characterId: 'luffy' },
    'voice.luffy.intro': { files: [file], group: 'voice', characterId: 'luffy' },
    'voice.akainu.intro': { files: [other], group: 'voice', characterId: 'akainu' },
  }, lines: [file, other].map(file => ({ file, transcriptVerified: true, translation: '测试句子' })),
  fileChecks: Object.fromEntries([file, other].map(file => [file, { sha256: hash(bytes), bytes: bytes.byteLength }])) };
}
function invoke(script: string, ...args: string[]) {
  const source = ['import json,sys', `sys.path.insert(0,${JSON.stringify(resolve('scripts'))})`, 'import build_delivery_assets as d', script].join('\n');
  return JSON.parse(execFileSync(process.env.OPF_PYTHON ?? 'python', ['-c', source, ...args], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })) as unknown;
}
function write(root: string, name: string, value: string | Uint8Array) {
  const target = resolve(root, name); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, value);
}
describe('explicit semantic dialogue delivery1017', () => {
  it('overrides the same cue, retains other base cues, and reads only selected semantic source bytes', () => {
    const read: string[] = [];
    const result = semanticAudioCatalog({ cues: { 'voice.luffy.select': { files: ['old.wav'] }, common: { files: ['common.wav'] }, 'voice.akainu.attack': { files: ['excluded.wav'] } } }, fixture(), ['luffy'],
      file => { read.push(file); return bytes; });
    expect(result.cues['voice.luffy.select']?.files).toEqual([file]);
    expect(result.cues.common?.files).toEqual(['common.wav']);
    expect(result.cues['voice.akainu.intro']).toBeUndefined(); expect(result.cues['voice.akainu.attack']).toBeUndefined();
    expect(new Set(read)).toEqual(new Set([file])); expect(Object.keys(result.checks)).toEqual([file]);
  });
  it('rejects malformed/unverified tables and exact byte changes', () => {
    const bad = fixture(); bad.lines[0]!.transcriptVerified = false;
    expect(() => semanticAudioCatalog({ cues: {} }, bad, ['luffy'], () => bytes)).toThrow('Unverified');
    expect(() => semanticAudioCatalog({ cues: {} }, { ...fixture(), schemaVersion: 2 }, ['luffy'], () => bytes)).toThrow('schema');
    expect(() => semanticAudioCatalog({ cues: {} }, fixture(), ['luffy'], () => new Uint8Array([1]))).toThrow('exact audio mismatch');
    const unsafe = fixture(); unsafe.cues['voice.luffy.select'].files = ['assets/audio/voice/luffy/../candidate.wav'];
    expect(() => semanticAudioCatalog({ cues: {} }, unsafe, ['luffy'], () => bytes)).toThrow('Unsafe');
  });
  it('menu preloading follows overridden selection only, never distinct intro or battle clips', () => {
    const data = fixture();
    data.cues['voice.luffy.intro'].files = ['assets/audio/voice/luffy/intro1017.wav'];
    data.lines.push({ file: 'assets/audio/voice/luffy/intro1017.wav', transcriptVerified: true, translation: '开场测试' });
    data.fileChecks['assets/audio/voice/luffy/intro1017.wav'] = { sha256: hash(bytes), bytes: bytes.byteLength };
    const { cues } = semanticAudioCatalog({ cues: {} }, data, ['luffy'], () => bytes);
    const selections = Object.entries(cues).filter(([id]) => id.endsWith('.select')).flatMap(([, cue]) => cue.files);
    expect(menuPreloadFiles({
      'assets/stages/marineford/backdrop.webp': { file: 'back.webp' }, a: { file: 'a.webp' }, b: { file: 'b.webp' },
      [file]: { file: 'small-menu.bin' }, 'assets/audio/voice/luffy/intro1017.wav': { file: 'battle.bin' },
    }, { labubu: { image: 'a' }, twinkle: { image: 'b' } }, selections)).toEqual(['back.webp', 'a.webp', 'b.webp', 'small-menu.bin']);
  });
  it('requires new logical records with the exact original identity and valid bank bounds', () => {
    const expected = { [file]: { sha256: hash(bytes), bytes: bytes.byteLength } };
    expect(() => verifySemanticDeliveryRecords({}, expected)).toThrow('Missing or stale');
    const record = { file: 'assets/delivery/fixture.bin', source: file, sourceSha256: hash(bytes), bytes: 8, sha256: hash('encoded'), contentType: 'audio/ogg', slice: { offset: 1, length: 7 } };
    expect(() => verifySemanticDeliveryRecords({ [file]: record }, expected)).not.toThrow();
    expect(() => verifySemanticDeliveryRecords({ [file]: { ...record, sourceSha256: '0'.repeat(64) } }, expected)).toThrow('stale');
    expect(() => verifySemanticDeliveryRecords({ [file]: { ...record, slice: { offset: 1, length: 8 } } }, expected)).toThrow('slice');
  });
  it('Python validates the same explicit schema, selected hashes and merge order without encoding', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'opf-dialogue-parser-'));
    write(root, 'public/' + file, bytes);
    write(root, 'src/audio/sampleManifest.json', JSON.stringify({ cues: { 'voice.luffy.select': { files: ['old.wav'] }, common: { files: ['base.wav'] } } }));
    write(root, 'src/audio/semanticDialogue1017.json', JSON.stringify(fixture()));
    const result = invoke('c,r=d.load_semantic_audio_catalog(["luffy"],sys.argv[1],sys.argv[1]+"/public"); print(json.dumps({"cues":c,"banks":d.audio_banks(c,["luffy"]),"receipt":r}))', root) as { cues: Record<string, { files: string[] }>; banks: Record<string, string[]>; receipt: { sha256: string } };
    expect(result.cues['voice.luffy.select']?.files).toEqual([file]); expect(result.cues['voice.akainu.intro']).toBeUndefined();
    expect(result.banks.menu).toEqual([file]); expect(result.receipt.sha256).toBe(hash(readFileSync(resolve(root, 'src/audio/semanticDialogue1017.json'))));
    write(root, 'public/' + file, 'changed');
    expect(() => invoke('d.load_semantic_audio_catalog(["luffy"],sys.argv[1],sys.argv[1]+"/public"); print("{}")', root)).toThrow('exact audio mismatch');
  });
  it('Python refuses an overlay edited after it parsed the reported snapshot', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'opf-dialogue-snapshot-'));
    write(root, 'public/' + file, bytes); write(root, 'src/audio/sampleManifest.json', '{"cues":{}}');
    write(root, 'src/audio/semanticDialogue1017.json', JSON.stringify(fixture()));
    const result = invoke('from pathlib import Path\nc,r=d.load_semantic_audio_catalog(["luffy"],sys.argv[1],sys.argv[1]+"/public"); Path(r["file"]).write_text("{}");\ntry: d.verify_audio_manifest_snapshot(r)\nexcept ValueError as e: print(json.dumps({"error":str(e)}))', root) as { error: string };
    expect(result.error).toContain('changed during encoding');
  });
  it('accepts the current real adopted table and hashes, without claiming new audio/game acceptance', () => {
    const selected = ['luffy', 'akainu', 'labubu', 'twinkle', 'aokiji', 'shanks'];
    const result = readBuildAudio(new URL('../', import.meta.url), selected);
    expect(Object.keys(result.checks).length).toBeGreaterThan(0);
    expect(result.cues['voice.akainu.select']?.files).toContain('assets/audio/voice/akainu/daily-idle-2-0914.wav');
    const real = invoke('c,r=d.load_semantic_audio_catalog(json.loads(sys.argv[1])); print(json.dumps({"files":sorted(r["selectedFiles"]),"sha":r["sha256"]}))', JSON.stringify(selected)) as { files: string[]; sha: string };
    expect(real.files).toEqual(Object.keys(result.checks).sort()); expect(real.sha).toBe(result.sha256);
  });
});
