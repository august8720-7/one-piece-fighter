import type { FighterDef } from '@core/index';
import { akainuDef } from './akainu/def';
import { luffyDef } from './luffy/def';

export const characters: Record<string, FighterDef> = {
  luffy: luffyDef,
  akainu: akainuDef,
};

export { luffyDef, akainuDef };
