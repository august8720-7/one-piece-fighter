import type { FighterDef } from '@core/index';
import { luffyGear5 } from '@characters/luffy/gear5';
import { animeAtlasPages, DEFAULT_ANIMS, HELD_REACTION_ANIMS, isAnimeRuntimeManifest, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../animations';

export const GEAR5_ASSET_BASE = 'assets/characters/luffy/forms/gear5/';
export const gear5ResourceKey = (characterId: string): string => `${characterId}:gear5`;

export function validateGear5BaseRuntime(value: AnimeRuntimeManifest, def: FighterDef): string[] {
  const issues = validateAnimeRuntimeManifest(value, [...def.moves, luffyGear5.awakening]);
  if (value.formId || value.characterId !== 'luffy' || !value.anims.g5_awakening) issues.push('常态路飞缺少独立觉醒启动动作');
  return issues;
}

/** Runtime evidence is a provenance receipt, not a substitute for human art review. */
export function validateGear5Runtime(value: unknown, def: FighterDef): string[] {
  const moves = [...def.moves.filter(move => move.id !== 'sp_gear2' && !Object.hasOwn(luffyGear5.replacements, move.id)),
    ...luffyGear5.moves, luffyGear5.awakening];
  const issues = validateAnimeRuntimeManifest(value, moves);
  if (typeof value !== 'object' || value === null) return issues;
  const runtime = value as AnimeRuntimeManifest;
  if (runtime.characterId !== 'luffy' || def.id !== 'luffy' || runtime.formId !== 'gear5') issues.push('五档资源身份必须为 luffy/gear5');
  const evidence = runtime.formEvidence;
  const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
  if (!evidence || evidence.review !== 'full-coverage-accepted' || !hash(evidence.authorManifestSha256)
    || !evidence.sourceHashes || !Object.keys(evidence.sourceHashes).length || !Object.values(evidence.sourceHashes).every(hash)
    || !evidence.frameSources || typeof evidence.frameSources !== 'object') issues.push('五档缺少完整原画审查及来源哈希凭据');
  const required = [...Object.keys(DEFAULT_ANIMS).filter(id => id !== 'portrait'), ...HELD_REACTION_ANIMS, ...moves.map(move => move.id)];
  for (const id of required) if (!runtime.anims?.[id]) issues.push(`五档缺少动作：${id}`);
  for (const frame of Object.keys(runtime.attachments ?? {})) {
    const source = evidence?.frameSources?.[frame];
    if (!source || !hash(evidence?.sourceHashes?.[source])) issues.push(`五档帧缺少原图来源：${frame}`);
  }
  if (isAnimeRuntimeManifest(value)) for (const page of animeAtlasPages(value)) {
    if (![page.image, page.data].every(file => hash(evidence?.atlasHashes?.[file]))) issues.push(`五档图集缺少文件哈希：${page.id}`);
  }
  return [...new Set(issues)];
}
