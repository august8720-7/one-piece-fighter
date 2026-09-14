import type { FighterDef, MoveData } from '@core/index';
import type { AnimTable } from '@render/animations';
import type { AiProfile } from '../ai/types';
import { akainuAi } from './akainu/ai';
import { akainuAnims } from './akainu/animations';
import { akainuDef } from './akainu/def';
import { luffyAi } from './luffy/ai';
import { luffyAnims } from './luffy/animations';
import { luffyDef } from './luffy/def';

export const characterAi: Record<string, AiProfile> = {
  luffy: luffyAi,
  akainu: akainuAi,
};

export interface CharacterEntry {
  def: FighterDef;
  anims: AnimTable;
}

export const characters: Record<string, FighterDef> = {
  luffy: luffyDef,
  akainu: akainuDef,
};

export const characterAnims: Record<string, AnimTable> = {
  luffy: luffyAnims,
  akainu: akainuAnims,
};

/** 同时覆盖逻辑 sprite 和显式连续视觉序列，保证占位回退完整。 */
export function moveFrameCounts(def: FighterDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of def.moves) out[m.id] = Math.max(maxSprite(m) + 1, characterAnims[def.id]?.[m.id]?.frames ?? 0);
  return out;
}

function maxSprite(m: MoveData): number {
  return m.frames.reduce((n, f) => Math.max(n, f.sprite), 0);
}

export { luffyDef, akainuDef };
