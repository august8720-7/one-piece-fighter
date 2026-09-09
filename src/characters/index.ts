import type { FighterDef, MoveData } from '@core/index';
import type { AnimTable } from '@render/animations';
import { akainuAnims } from './akainu/animations';
import { akainuDef } from './akainu/def';
import { luffyAnims } from './luffy/animations';
import { luffyDef } from './luffy/def';

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

/** 每个招式需要的精灵帧数 = 最大 sprite 索引 + 1 */
export function moveFrameCounts(def: FighterDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of def.moves) out[m.id] = maxSprite(m) + 1;
  return out;
}

function maxSprite(m: MoveData): number {
  return m.frames.reduce((n, f) => Math.max(n, f.sprite), 0);
}

export { luffyDef, akainuDef };
