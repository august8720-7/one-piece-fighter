import type { FighterState, MoveData } from '@core/index';

export interface MovePresentation {
  body: string;
  impact: string;
  charged?: boolean;
  /** Terrain, vapor and translucent motion trails remain separate from the character's limbs. */
  independentBody?: boolean;
  bodyAlpha?: number;
}
export const MOVE_PRESENTATIONS: Readonly<Record<string, Readonly<Record<string, MovePresentation>>>> = {
  akainu: {
    sp_daifunka: { body: 'magma_fist', impact: 'eruption', charged: true },
    sp_daifunka_ren: { body: 'magma_fist', impact: 'eruption', charged: true },
    sp_meigou: { body: 'pierce', impact: 'eruption' },
    ult_meigou_end: { body: 'pierce', impact: 'eruption', charged: true },
    sp_ground_split: { body: 'fissure', impact: 'eruption', independentBody: true },
    sp_inugami: { body: 'dog', impact: 'eruption' },
    sp_meteor: { body: 'meteor', impact: 'eruption', charged: true },
    sp_meteor_rain: { body: 'meteor', impact: 'eruption', charged: true },
    sp_magma_body: { body: 'melt', impact: 'smoke', independentBody: true },
  },
  luffy: {
    sp_gatling: { body: 'gatling', impact: 'impact', independentBody: true, bodyAlpha: 0.46 },
    sp_storm: { body: 'gatling', impact: 'impact', independentBody: true, bodyAlpha: 0.46 },
    sp_bazooka: { body: 'wind', impact: 'shockwave', independentBody: true, bodyAlpha: 0.45 },
    sp_rifle: { body: 'rubber_fist', impact: 'shockwave' },
    sp_rocket: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.45 },
    sp_gigant_pistol: { body: 'giant_fist', impact: 'shockwave', charged: true },
    ult_red_hawk: { body: 'red_hawk', impact: 'impact', charged: true },
    sp_balloon: { body: 'rebound', impact: 'rebound', independentBody: true, bodyAlpha: 0.45 },
    sp_gear2: { body: 'steam', impact: 'steam', independentBody: true },
  },
};

/** A segment key follows actual frame data, including install startup skips. */
export function activeSegment(f: FighterState, move: MoveData | null): string | null {
  if (!move || f.state !== 'attack') return null;
  let elapsed = 0;
  for (let i = 0; i < move.frames.length; i++) {
    const frame = move.frames[i]!;
    if (f.stateFrame < elapsed + frame.duration) return frame.hitboxes?.length ? `${f.moveInstance}:${i}` : null;
    elapsed += frame.duration;
  }
  return null;
}
