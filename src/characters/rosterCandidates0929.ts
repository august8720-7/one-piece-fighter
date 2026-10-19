/** Authoring-only candidates. Importing this module never changes the playable registry. */
import type { FighterDef } from '@core/index';
import type { AnimTable } from '@render/animations';
import type { AiProfile } from '../ai/types';
import { aokijiDef } from './aokiji/def';
import { aokijiAnims } from './aokiji/animations';
import { aokijiAi } from './aokiji/ai';
import { kizaruDef } from './kizaru/def';
import { kizaruAnims } from './kizaru/animations';
import { kizaruAi } from './kizaru/ai';
import { fujitoraDef } from './fujitora/def';
import { fujitoraAnims } from './fujitora/animations';
import { fujitoraAi } from './fujitora/ai';
import { ryokugyuDef } from './ryokugyu/def';
import { ryokugyuAnims } from './ryokugyu/animations';
import { ryokugyuAi } from './ryokugyu/ai';
import { garpDef } from './garp/def';
import { garpAnims } from './garp/animations';
import { garpAi } from './garp/ai';
import { sengokuDef } from './sengoku/def';
import { sengokuAnims } from './sengoku/animations';
import { sengokuAi } from './sengoku/ai';
import { shanksDef } from './shanks/def';
import { shanksAnims } from './shanks/animations';
import { shanksAi } from './shanks/ai';
import { zoroDef } from './zoro/def';
import { zoroAnims } from './zoro/animations';
import { zoroAi } from './zoro/ai';
import { sanjiDef } from './sanji/def';
import { sanjiAnims } from './sanji/animations';
import { sanjiAi } from './sanji/ai';
import { whitebeardDef } from './whitebeard/def';
import { whitebeardAnims } from './whitebeard/animations';
import { whitebeardAi } from './whitebeard/ai';
import { bigmomDef } from './bigmom/def';
import { bigmomAnims } from './bigmom/animations';
import { bigmomAi } from './bigmom/ai';
import { kaidoDef } from './kaido/def';
import { kaidoAnims } from './kaido/animations';
import { kaidoAi } from './kaido/ai';

import { blackbeardDef } from './blackbeard/def';
import { blackbeardAnims } from './blackbeard/animations';
import { blackbeardAi } from './blackbeard/ai';
import { rogerDef } from './roger/def';
import { rogerAnims } from './roger/animations';
import { rogerAi } from './roger/ai';
import { rocksDef } from './rocks/def';
import { rocksAnims } from './rocks/animations';
import { rocksAi } from './rocks/ai';
import { shikiDef } from './shiki/def';
import { shikiAnims } from './shiki/animations';
import { shikiAi } from './shiki/ai';
import { rayleighDef } from './rayleigh/def';
import { rayleighAnims } from './rayleigh/animations';
import { rayleighAi } from './rayleigh/ai';
import { gabanDef } from './gaban/def';
import { gabanAnims } from './gaban/animations';
import { gabanAi } from './gaban/ai';
import { beckmanDef } from './beckman/def';
import { beckmanAnims } from './beckman/animations';
import { beckmanAi } from './beckman/ai';

export interface RosterCandidate {
  def: FighterDef;
  anims: AnimTable;
  ai: AiProfile;
}

export const rosterCandidates0929: readonly RosterCandidate[] = [
  { def: aokijiDef, anims: aokijiAnims, ai: aokijiAi },
  { def: kizaruDef, anims: kizaruAnims, ai: kizaruAi },
  { def: fujitoraDef, anims: fujitoraAnims, ai: fujitoraAi },
  { def: ryokugyuDef, anims: ryokugyuAnims, ai: ryokugyuAi },
  { def: garpDef, anims: garpAnims, ai: garpAi },
  { def: shanksDef, anims: shanksAnims, ai: shanksAi },
  { def: zoroDef, anims: zoroAnims, ai: zoroAi },
  { def: sanjiDef, anims: sanjiAnims, ai: sanjiAi },
  { def: whitebeardDef, anims: whitebeardAnims, ai: whitebeardAi },
  { def: bigmomDef, anims: bigmomAnims, ai: bigmomAi },
  { def: kaidoDef, anims: kaidoAnims, ai: kaidoAi },
  { def: sengokuDef, anims: sengokuAnims, ai: sengokuAi },
  { def: blackbeardDef, anims: blackbeardAnims, ai: blackbeardAi },
  { def: rogerDef, anims: rogerAnims, ai: rogerAi },
  { def: rocksDef, anims: rocksAnims, ai: rocksAi },
  { def: shikiDef, anims: shikiAnims, ai: shikiAi },
  { def: rayleighDef, anims: rayleighAnims, ai: rayleighAi },
  { def: gabanDef, anims: gabanAnims, ai: gabanAi },
  { def: beckmanDef, anims: beckmanAnims, ai: beckmanAi },
];
