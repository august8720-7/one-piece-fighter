import type { MoveData } from '@core/index';
import type { MovePresentation, ProjectilePresentation } from './movePresentation';
import { releasedPcRosterIds } from '../../characters/rosterAvailability1004';

/** Paths/frames are an authoring contract, never evidence that the files exist. */
export interface RosterFxCandidate {
  image: string;
  atlas: string;
  frames: readonly string[];
  /** Set only after an actual schema 2 pack exists; never inferred from a folder. */
  runtime?: string;
  moves: Readonly<Record<string, MovePresentation>>;
  projectiles: Readonly<Record<string, ProjectilePresentation>>;
}

export function rosterFxPreviewEnabled(
  dev = import.meta.env.DEV,
  search = typeof window === 'undefined' ? '' : window.location.search,
): boolean {
  return dev && new URLSearchParams(search).get('rosterPreview') === '0929';
}

export const ROSTER_FX_CANDIDATES: Readonly<Record<string, RosterFxCandidate>> = {
  aokiji: {
    image: 'assets/fx/aokiji/atlas.png', atlas: 'assets/fx/aokiji/atlas.json',
    runtime: 'assets/fx/aokiji/fx-runtime.json',
    frames: ['ice_lance', 'ice_impact', 'spike_start', 'spike_live', 'spike_break',
      'mirror_start', 'mirror_live', 'mirror_break', 'bird_break', 'vapor_start', 'vapor_live', 'vapor_end',
      'uplift_start', 'uplift_live', 'uplift_break', 'blade_start', 'blade_live', 'blade_break',
      'field_start', 'field_live', 'field_break', 'bird_up', 'bird_down'],
    moves: {
      sp_ice_lance: { body: 'ice_lance', impact: 'ice_impact' },
      sp_ice_blade: { body: 'ice_blade_cut', impact: 'ice_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.42 },
      sp_ice_uplift: { body: 'ice_uplift', impact: 'ice_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.52 },
      sp_ice_spike: { body: 'ice_spike', impact: 'ice_impact' },
      sp_glacier_line: { body: 'ice_spike', impact: 'ice_impact' },
      sp_ice_mirror: { body: 'ice_mirror', impact: 'mirror_break', independentBody: true,
        bodyLayout: 'bounds', bodyClock: 'active', bodyAlpha: 0.65, charged: true,
        chargeFrame: 'mirror_start', chargeLayout: 'bounds', recoverFrame: 'mirror_break' },
      sp_ice_body: { body: 'ice_vapor', impact: 'ice_impact', independentBody: true,
        bodyLayout: 'aura', bodyAlpha: 0.45 },
      sp_ice_pheasant: { body: 'ice_pheasant', impact: 'ice_impact' },
      ult_ice_age: { body: 'ice_field_first', impact: 'ice_impact', independentBody: true,
        bodyClock: 'active', bodyLayout: 'bounds', segmentBodies: ['ice_field_first', 'ice_field_second'], bodyAlpha: 0.70 },
    },
    projectiles: {
      aokiji_ice_lance: { character: 'aokiji', frame: 'ice_lance', fadeFrame: 'ice_impact',
        widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, contactBody: true },
      aokiji_ice_spike: { character: 'aokiji', frame: 'ice_spike', fadeFrame: 'ice_spike_fade',
        widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, contactBody: true },
      aokiji_ice_pheasant: { character: 'aokiji', frame: 'ice_pheasant', fadeFrame: 'ice_bird_fade',
        widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, contactBody: true },
    },
  },
  shanks: {
    image: 'assets/fx/shanks/atlas.png', atlas: 'assets/fx/shanks/atlas.json',
    runtime: 'assets/fx/shanks/fx-runtime.json',
    frames: ['haki_wave', 'haki_impact', 'r_start', 'r_live', 'r_end', 'f_start', 'f_live', 'f_end',
      'g_start', 'g_live', 'g_end', 'z_start', 'z_live', 'z_end',
      'x_start', 'x_live', 'x_end', 'v_start', 'v_live', 'v_end', 'c_horizontal', 'c_down', 'c_final'],
    moves: {
      sp_haki_slash: { body: 'haki_wave', impact: 'haki_impact' },
      sp_single_arm_cut: { body: 'c_horizontal', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', segmentBodies: ['c_horizontal', 'c_down'], bodyAlpha: 0.45 },
      sp_rising_guard: { body: 'shanks_rise', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.45 },
      sp_step_thrust: { body: 'shanks_thrust', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.45 },
      sp_low_cut: { body: 'shanks_low', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.45 },
      sp_sidestep: { body: 'shanks_dodge', impact: 'haki_impact', independentBody: true,
        bodyLayout: 'aura', bodyAlpha: 0.45 },
      sp_divine_departure: { body: 'shanks_divine', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.50 },
      sp_emperor_cuts: { body: 'shanks_emperor_first', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', segmentBodies: ['shanks_emperor_first', 'shanks_emperor_second', 'shanks_emperor_third'], bodyAlpha: 0.45 },
      ult_red_hair_finale: { body: 'shanks_finale', impact: 'haki_impact', independentBody: true,
        bodyClock: 'active', bodyAlpha: 0.60 },
    },
    projectiles: {
      // The source MoveData kind is shanks_haki_slash; the drawing is haki_wave.
      shanks_haki_slash: { character: 'shanks', frame: 'haki_wave', fadeFrame: 'haki_impact',
        widthScale: 1, heightScale: 1, offsetX: 0, offsetY: 0, contactBody: true },
    },
  },
};

/** Accepted fighters use these same verified contracts without a DEV parameter. */
export function rosterFxAvailable(characterId: string): boolean {
  return releasedPcRosterIds().includes(characterId) || rosterFxPreviewEnabled();
}

export function availableRosterFx(): Array<[string, RosterFxCandidate]> {
  return Object.entries(ROSTER_FX_CANDIDATES).filter(([id]) => rosterFxAvailable(id));
}

const RELEASE_CHARACTERS = new Set(['luffy', 'akainu', 'labubu', 'twinkle']);
export type FxFrameAvailable = (key: string, frame: string) => boolean;

/** Only the current move's actual art is mandatory; other skills load independently. */
export function rosterMoveFxReferences(characterId: string, move: MoveData): readonly string[] {
  const entry = ROSTER_FX_CANDIDATES[characterId], art = entry?.moves[move.id];
  if (!art) return [];
  const refs = new Set([art.body, art.impact, ...(art.segmentBodies ?? [])]);
  if (art.chargeFrame) refs.add(art.chargeFrame);
  if (art.recoverFrame) refs.add(art.recoverFrame);
  for (const spawn of move.projectiles ?? []) {
    const style = entry?.projectiles[spawn.kind];
    if (!style) continue;
    refs.add(style.frame); refs.add(style.fadeFrame);
    if (style.groundFrame) refs.add(style.groundFrame);
  }
  return [...refs];
}

/** New detached projectiles require an explicit mapping and actual loaded frames. */
export function rosterMoveFxIssues(characterId: string, move: MoveData, hasFrame?: FxFrameAvailable): string[] {
  const candidate = ROSTER_FX_CANDIDATES[characterId];
  if (RELEASE_CHARACTERS.has(characterId) || (!move.projectiles?.length && !candidate?.moves[move.id])) return [];
  if (!rosterFxAvailable(characterId)) return ['候选道具特效仅在开发预览开放'];
  if (!candidate?.moves[move.id]) return [`未声明道具特效 ${characterId}/${move.id}`];
  const issues: string[] = [];
  for (const projectile of move.projectiles ?? []) {
    const style = candidate.projectiles[projectile.kind];
    if (!style) { issues.push(`未声明道具类型特效 ${projectile.kind}`); continue; }
  }
  for (const frame of rosterMoveFxReferences(characterId, move)) {
    if (!hasFrame?.(`fx-${characterId}`, frame)) issues.push(`缺少实际特效 fx-${characterId}/${frame}`);
  }
  return issues;
}
