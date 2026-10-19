import type { FighterState, MoveData, ProjectileEndEvent, ProjectileState, WorldState } from '@core/index';
import { availableRosterFx } from './rosterFxCandidates1003';

export interface MovePresentation {
  /** An actual atlas frame or an explicitly loaded FX runtime animation name. */
  body: string;
  impact: string;
  charged?: boolean;
  /** Terrain, vapor and translucent motion trails remain separate from the character's limbs. */
  independentBody?: boolean;
  bodyAlpha?: number;
  chargeFrame?: string;
  /** Multi-page contracts default to one union of actual hitboxes; legacy stays per-hitbox. */
  bodyLayout?: 'hitboxes' | 'bounds' | 'aura';
  /** Explicit contracts may start their clip at each real active segment. */
  bodyClock?: 'move' | 'active';
  /** Different real cuts may reference different clips, in active-segment order. */
  segmentBodies?: readonly string[];
  /** Form/dissolve drawings are real frames; neither adds an attack rectangle. */
  chargeLayout?: 'bounds';
  recoverFrame?: string;
}
export const MOVE_PRESENTATIONS: Readonly<Record<string, Readonly<Record<string, MovePresentation>>>> = {
  ...Object.fromEntries(availableRosterFx().map(([id, entry]) => [id, entry.moves])),
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
    // Reuse accepted material-only trails; the form atlas supplies every real limb.
    g5_elastic_rush: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.35, bodyClock: 'active' },
    g5_bounce_slam: { body: 'wind', impact: 'shockwave', independentBody: true, bodyAlpha: 0.35 },
    g5_rising_whip: { body: 'wind', impact: 'shockwave', independentBody: true, bodyAlpha: 0.35 },
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
  labubu: {
    sp_pounce_rush: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.45 },
    sp_prank_flurry: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.40 },
    sp_flip_upper: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.45 },
    sp_low_slide: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.40 },
    sp_leg_flip: { body: 'wind', impact: 'impact' },
    sp_mischief_drive: { body: 'charge', impact: 'impact', independentBody: true, chargeFrame: 'charge' },
    sp_tumble_riot: { body: 'wind', impact: 'impact', independentBody: true, bodyAlpha: 0.45 },
    sp_monster_charge: { body: 'wind', impact: 'impact', charged: true, chargeFrame: 'charge', independentBody: true, bodyAlpha: 0.50 },
    ult_monster_mayhem: { body: 'wind', impact: 'impact', charged: true, chargeFrame: 'charge', independentBody: true, bodyAlpha: 0.50 },
  },
  twinkle: {
    sp_tiny_star: { body: 'star', impact: 'impact' },
    sp_starlight_push: { body: 'wave', impact: 'impact', independentBody: true, bodyAlpha: 0.75 },
    sp_upward_spark: { body: 'star', impact: 'spark' },
    sp_falling_star: { body: 'star', impact: 'spark', charged: true, chargeFrame: 'spark' },
    sp_star_reflect: { body: 'shield', impact: 'spark', independentBody: true, bodyAlpha: 0.65 },
    sp_blink_dodge: { body: 'spark', impact: 'spark', independentBody: true },
    sp_star_rain: { body: 'star', impact: 'spark', charged: true, chargeFrame: 'spark' },
    sp_shining_wave: { body: 'wave', impact: 'impact', charged: true, chargeFrame: 'spark' },
    ult_star_symphony: { body: 'star', impact: 'spark', charged: true, chargeFrame: 'spark' },
  },
};

export interface ProjectilePresentation {
  character: string;
  frame: string;
  widthScale: number;
  heightScale: number;
  offsetX: number;
  offsetY: number;
  groundFrame?: string;
  fadeFrame: string;
  /** Keep a brief visual of a real contact even when the projectile dies in its birth step. */
  contactBody?: boolean;
}
const star = (frame = 'star', groundFrame?: string): ProjectilePresentation => ({
  character: 'twinkle', frame, widthScale: 1.12, heightScale: 1.12, offsetX: 0, offsetY: 0, fadeFrame: 'spark',
  ...(groundFrame ? { groundFrame } : {}),
});
/** Material follows the declared kind, including after ownership changes on reflect. */
export const PROJECTILE_PRESENTATIONS: Readonly<Record<string, ProjectilePresentation>> = {
  ...Object.assign({}, ...availableRosterFx().map(([, entry]) => entry.projectiles)) as Record<string, ProjectilePresentation>,
  dog: { character: 'akainu', frame: 'dog', widthScale: 1.24, heightScale: 1, offsetX: -0.12, offsetY: 0, fadeFrame: 'smoke' },
  meteor: { character: 'akainu', frame: 'meteor', widthScale: 1, heightScale: 2.15, offsetX: 0, offsetY: -0.575, groundFrame: 'eruption', fadeFrame: 'smoke' },
  twinkle_tiny_star: star(), twinkle_upward_star: star(),
  twinkle_falling_star: star('star', 'spark'), twinkle_star_rain: star('star', 'spark'),
  twinkle_shining_wave: { ...star('wave'), contactBody: true }, twinkle_symphony_star: star(),
};
const PROJECTILE_MOVE_MATERIAL: Readonly<Record<string, string>> = {
  ...Object.fromEntries(availableRosterFx().flatMap(([id, entry]) => Object.keys(entry.moves).map(move => [move, id]))),
  sp_inugami: 'akainu', sp_meteor: 'akainu', sp_meteor_rain: 'akainu',
  sp_tiny_star: 'twinkle', sp_upward_spark: 'twinkle', sp_falling_star: 'twinkle',
  sp_star_rain: 'twinkle', sp_shining_wave: 'twinkle', ult_star_symphony: 'twinkle',
};
export const projectileMaterial = (kind: string): string | undefined => PROJECTILE_PRESENTATIONS[kind]?.character;
export const projectileMoveMaterial = (moveId: string): string | undefined => PROJECTILE_MOVE_MATERIAL[moveId];

export type ProjectileVisualPose = Pick<ProjectileState, 'box' | 'facing' | 'reflected'> & { animationAge?: number | null };

/** TTL ticks in core, including reflected projectiles; first visible birth step is age 0. */
export function projectileAnimationAge(projectile: ProjectileState, sourceMoves: readonly MoveData[]): number | null {
  const lifetimes = new Set(sourceMoves.find(move => move.id === projectile.moveId)?.projectiles
    ?.filter(spawn => spawn.kind === projectile.kind).map(spawn => spawn.ttl) ?? []);
  if (lifetimes.size !== 1) return null;
  const initial = lifetimes.values().next().value as number;
  return Number.isSafeInteger(initial) && initial > 0 && Number.isSafeInteger(projectile.ttl)
    && projectile.ttl >= 0 && projectile.ttl <= initial ? Math.max(0, initial - projectile.ttl - 1) : null;
}

/** End events retain the true position. Recover only the shape/direction needed to draw it. */
export function endedProjectileVisual(event: ProjectileEndEvent, world: WorldState, sourceMoves: readonly MoveData[], previous?: ProjectileState): ProjectileVisualPose | undefined {
  if (previous) {
    const changedOwner = previous.owner !== event.owner;
    const age = projectileAnimationAge(previous, sourceMoves);
    return { box: previous.box, facing: changedOwner ? previous.facing === 1 ? -1 : 1 : previous.facing, reflected: previous.reflected || changedOwner,
      animationAge: age === null ? null : age + 1 };
  }
  // No previous live sample means it was created and consumed in this real logic step.
  const spawn = sourceMoves.find(move => move.id === event.moveId)?.projectiles?.find(item => item.kind === event.kind);
  return spawn ? { box: spawn.box, facing: world.fighters[event.owner].facing, reflected: false, animationAge: 0 } : undefined;
}

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

/** Rendering clock only; this never advances or edits the fighter simulation. */
export function moveBodyVisual(f: Pick<FighterState, 'state' | 'stateFrame'>, move: MoveData,
  art: MovePresentation): { reference: string; age: number } {
  if (f.state !== 'attack' || art.bodyClock !== 'active') return { reference: art.body, age: f.stateFrame };
  let elapsed = 0, segment = -1;
  for (const frame of move.frames) {
    const active = !!frame.hitboxes?.length;
    if (active) segment++;
    if (f.stateFrame < elapsed + frame.duration) {
      return { reference: active ? art.segmentBodies?.[segment] ?? art.body : art.body,
        age: active ? Math.max(0, f.stateFrame - elapsed) : f.stateFrame };
    }
    elapsed += frame.duration;
  }
  return { reference: art.body, age: f.stateFrame };
}
