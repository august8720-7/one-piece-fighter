/** Fresh, read-only character inventory. Writes one exclusive audit file, never runtime. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { kizaruDef } from '../src/characters/kizaru/def';
import { DEFAULT_ANIMS } from '../src/render/animations';

const root = resolve('.');
const run = new Date().toISOString().replace(/[:.]/g, '-');
const output = `D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/kizaru/kizaru-status1013-${run}.json`;
const runtimePath = 'public/assets/characters/kizaru/anime/runtime.json';
const authorPath = 'scripts/roster_kizaru_manifest0929.json';
interface Source { file: string; sha256: string; unitScale: number }
interface AuthorFrame { source: string; crop: number[]; root: [number, number]; sockets: { hand_front: [number, number] } }
interface Author { scale: number; textureDensity: number; sources: Record<string, Source>; frames: { st_a_active: AuthorFrame } }
const runtime = JSON.parse(readFileSync(runtimePath, 'utf8')) as { anims: Record<string, unknown>; framePages: Record<string, string> };
const author = (JSON.parse(readFileSync(authorPath, 'utf8')) as { characters: { kizaru: Author } }).characters.kizaru;
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const existing = Object.keys(runtime.anims);
const states = Object.keys(DEFAULT_ANIMS).filter(key => key !== 'portrait');
const moves = kizaruDef.moves.map(move => move.id);
const conditional = ['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw'];
const sourceDirectory = 'public/assets/generated/source';
const sourceFiles = readdirSync(sourceDirectory).filter(name => name.includes('kizaru')).map(name => ({
  file: `${sourceDirectory}/${name}`, sha256: sha(`${sourceDirectory}/${name}`),
  usedByAuthorManifest: Object.values(author.sources).some(entry => entry.file === `${sourceDirectory}/${name}`),
}));
const sourceHashChecks = Object.entries(author.sources).map(([id, value]) => ({
  id, file: value.file, expected: value.sha256, actual: sha(value.file),
}));
if (sourceHashChecks.some(item => item.actual !== item.expected)) throw new Error('Source SHA mismatch.');
const fist = author.frames.st_a_active;
const fistSource = author.sources[fist.source]!;
const factor = author.scale / author.textureDensity * fistSource.unitScale;
const fistWorld = fist.sockets.hand_front.map((value, axis) => (value - fist.root[axis]!) * factor);
const stA = kizaruDef.moves.find(move => move.id === 'st_a')!;
const stAHitbox = stA.frames.find(frame => frame.hitboxes?.length)?.hitboxes?.[0];
const body = {
  date: '2026-10-13', characterId: 'kizaru', inventoryType: 'fresh-local-read',
  runtime: { file: runtimePath, sha256: sha(runtimePath), mappedFrames: Object.keys(runtime.framePages).length, animations: existing },
  sources: sourceFiles, sourceHashChecks,
  missing: {
    states: states.filter(id => !existing.includes(id)),
    moves: moves.filter(id => !existing.includes(id)),
    skills: kizaruDef.skillSlots!.filter(id => !existing.includes(id)),
    conditionalReactions: conditional.filter(id => !existing.includes(id)),
  },
  interfaceCandidate: {
    file: 'public/assets/characters/kizaru/anime/ui-roster-0929.png',
    exists: existsSync('public/assets/characters/kizaru/anime/ui-roster-0929.png'),
    acceptedPublicCharacter: false,
  },
  stAContactDiagnostic: {
    source: fist.source, sourceSha256: fistSource.sha256,
    crop: fist.crop, root: fist.root, handFront: fist.sockets.hand_front,
    worldUnitsPerSourcePixel: factor, handFrontWorld: fistWorld, currentHitbox: stAHitbox,
    note: 'Author socket maps the genuine fist center above the current st_a box; needs source-grounded calibration and normal-speed browser check, not root displacement.',
    runtimeModified: false,
  },
  requirements: kizaruDef.moves.map(move => ({
    id: move.id, name: move.name, type: move.type,
    totalTicks: move.frames.reduce((sum, frame) => sum + frame.duration, 0),
    phases: move.frames.map(frame => ({ ticks: frame.duration, sprite: frame.sprite,
      ...(frame.hitboxes ? { hitboxes: frame.hitboxes } : {}),
      ...(frame.velocity ? { velocity: frame.velocity } : {}),
    })),
    ...(move.throwData ? { throwData: move.throwData } : {}),
    ...(move.projectiles ? { projectiles: move.projectiles } : {}),
  })),
  nextImage: {
    sessionUrl: 'https://chatgpt.com/c/6abbd7c3-ab58-83e8-bc9d-5433cd330260',
    prompt: 'docs/assets/kizaru-walk-opposite-contact-prompt1003.txt',
    promptSha256: sha('docs/assets/kizaru-walk-opposite-contact-prompt1003.txt'),
    pendingResult: true,
    requestOwner: 'root',
  },
  acceptance: { basicPlayableSample: false, fullMoves: false, fullSkillsFx: false, throws: false,
    japaneseAudioAuditoryReview: false, fullMatch: false, publicRelease: false },
  repoRoot: root,
};
writeFileSync(output, JSON.stringify(body, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
process.stdout.write(JSON.stringify({ output, mappedFrames: body.runtime.mappedFrames, animationCount: existing.length,
  missingStates: body.missing.states.length, missingMoves: body.missing.moves.length, missingSkills: body.missing.skills.length,
  conditionalMissing: body.missing.conditionalReactions.length, sourceHashChecks: sourceHashChecks.length,
  stAContactDiagnostic: body.stAContactDiagnostic,
}) + '\n');
