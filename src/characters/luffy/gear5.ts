import { attack, P, type MoveData } from '@core/index';

/** Entity-aligned geometry1017; real gameplay/art acceptance remains separate. See docs/design/五档三新招几何校准1017.md. */
const candidates: MoveData[] = [
  attack({ id: 'g5_elastic_rush', name: '五档·弹性连拳', button: P, motion: '236', stance: 'stand',
    segments: [{ startup: 8, active: 3, hitbox: [16, -74, 70, 14] }, { startup: 4, active: 3, hitbox: [16, -62, 67, 13] }, { startup: 4, active: 3, hitbox: [16, -83, 86, 15] }],
    recovery: 24, damage: 38, guard: 'mid', hitstun: 22, blockstun: 14, hitstop: 7,
    knockback: { x: 2.5, y: 0 }, activeStepX: 1, meterCost: 0 }),
  attack({ id: 'g5_bounce_slam', name: '五档·弹性重砸', button: P, motion: '214', stance: 'stand',
    segments: [{ startup: 22, active: 5, hitbox: [42, -42, 43, 41] }], recovery: 32,
    damage: 150, guard: 'high', hitstun: 30, blockstun: 20, hitstop: 14,
    knockback: { x: 8, y: -5 }, knockdown: true, meterCost: 0 }),
  attack({ id: 'g5_rising_whip', name: '五档·弹性上挑', button: P, motion: '623', stance: 'stand',
    segments: [{ startup: 10, active: 5, hitbox: [25, -116, 75, 68] }], recovery: 28,
    damage: 100, guard: 'mid', hitstun: 26, blockstun: 18, hitstop: 12,
    knockback: { x: 4, y: -8 }, meterCost: 0 }),
];
function freezeMove(move: MoveData): MoveData {
  for (const frame of move.frames) {
    for (const box of frame.hitboxes ?? []) Object.freeze(box);
    if (frame.hitboxes) Object.freeze(frame.hitboxes);
    if (frame.velocity) Object.freeze(frame.velocity);
    Object.freeze(frame);
  }
  Object.freeze(move.frames); Object.freeze(move.input); Object.freeze(move.knockback);
  return Object.freeze(move);
}
export const gear5Moves: readonly MoveData[] = Object.freeze(candidates.map(freezeMove));
export const gear5Awakening: MoveData = freezeMove({
  id: 'g5_awakening', name: '五档觉醒', type: 'special', input: { stance: 'stand', button: 0 },
  damage: 0, guard: 'mid', hitstun: 0, blockstun: 0, hitstop: 0, knockback: { x: 0, y: 0 },
  meterCost: 300, frames: [{ sprite: 0, duration: 24 }, { sprite: 1, duration: 12 }],
});
export const luffyGear5 = Object.freeze({ awakening: gear5Awakening, moves: gear5Moves,
  replacements: Object.freeze({ sp_gatling: 'g5_elastic_rush', sp_bazooka: 'g5_bounce_slam', sp_rifle: 'g5_rising_whip' }) });
