import type Phaser from 'phaser';
import type { FighterState, HitEvent, MoveData } from '@core/index';
import type { AttachmentPoint } from '../animations';

/** User-requested game interpretation; this does not certify canon Haki coating. */
export const SANJI_HAKI_PRESENTATION = {
  characterId: 'sanji', moveId: 'ult_ifrit_finale', label: '霸王色爆发',
  chargeTicks: 5, contactTicks: 12, maximumContacts: 12,
  red: 0xb91643, dark: 0x190b24, light: 0xffded4,
} as const;

export interface SanjiHakiPhase { stage: 'charge' | 'release'; age: number; duration: number }

/** Derive the final real active segment without changing any simulation frame. */
export function sanjiHakiPhase(characterId: string, state: string, stateFrame: number,
  move: MoveData | null): SanjiHakiPhase | null {
  if (characterId !== SANJI_HAKI_PRESENTATION.characterId || state !== 'attack'
    || move?.id !== SANJI_HAKI_PRESENTATION.moveId || !Number.isSafeInteger(stateFrame)) return null;
  let elapsed = 0, finalStart = -1, finalDuration = 0;
  for (const frame of move.frames) {
    if (frame.hitboxes?.length) { finalStart = elapsed; finalDuration = frame.duration; }
    elapsed += frame.duration;
  }
  if (finalStart < 0) return null;
  const chargeStart = Math.max(0, finalStart - SANJI_HAKI_PRESENTATION.chargeTicks);
  if (stateFrame >= chargeStart && stateFrame < finalStart) {
    return { stage: 'charge', age: stateFrame - chargeStart, duration: finalStart - chargeStart };
  }
  return stateFrame >= finalStart && stateFrame < finalStart + finalDuration
    ? { stage: 'release', age: stateFrame - finalStart, duration: finalDuration } : null;
}

/** A local impact needs a real final-segment hit, never a block or inferred combo count. */
export function sanjiHakiContact(hit: HitEvent, fighter: FighterState): boolean {
  if (hit.kind !== 'hit' || hit.projectile || hit.moveId !== SANJI_HAKI_PRESENTATION.moveId) return false;
  const move = fighter.def.moves.find(item => item.id === hit.moveId) ?? null;
  return fighter.moveId === hit.moveId
    && sanjiHakiPhase(fighter.def.id, fighter.state, fighter.stateFrame, move)?.stage === 'release';
}

/** Draw only non-character material. Optional eye coordinates must come from real art. */
export function drawSanjiHakiWave(graphics: Phaser.GameObjects.Graphics, root: AttachmentPoint,
  phase: SanjiHakiPhase, facing: number, scale: number, eye?: AttachmentPoint | null): void {
  const progress = (phase.age + 1) / Math.max(1, phase.duration);
  const radius = (phase.stage === 'charge' ? 14 + progress * 15 : 28 + progress * 20) * scale;
  const alpha = phase.stage === 'charge' ? 0.28 + progress * 0.24 : 0.68 * (1 - progress * 0.65);
  graphics.lineStyle(1.8 * scale, SANJI_HAKI_PRESENTATION.dark, alpha);
  graphics.strokeEllipse(root.x, root.y - 2 * scale, radius * 2, radius * 0.42);
  graphics.lineStyle(0.8 * scale, SANJI_HAKI_PRESENTATION.red, alpha);
  graphics.strokeEllipse(root.x, root.y - 2 * scale, radius * 1.84, radius * 0.36);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const x = root.x + Math.cos(angle) * radius * 0.72 * facing;
    const y = root.y - 2 * scale + Math.sin(angle) * radius * 0.15;
    const dx = Math.cos(angle) * 8 * scale * facing;
    const dy = Math.sin(angle) * 4 * scale;
    graphics.lineBetween(x, y, x + dx * 0.45 - facing * 2 * scale, y + dy - 3 * scale);
    graphics.lineBetween(x + dx * 0.45 - facing * 2 * scale, y + dy - 3 * scale, x + dx, y + dy * 1.25);
  }
  if (eye && phase.stage === 'charge' && phase.age < 3) {
    graphics.fillStyle(SANJI_HAKI_PRESENTATION.light, 0.72);
    graphics.fillCircle(eye.x, eye.y, 0.9 * scale);
    graphics.lineStyle(0.55 * scale, SANJI_HAKI_PRESENTATION.red, 0.75);
    graphics.lineBetween(eye.x - 3 * scale, eye.y, eye.x + 3 * scale, eye.y);
  }
}

export function drawSanjiHakiImpact(graphics: Phaser.GameObjects.Graphics, center: AttachmentPoint,
  life: number, scale: number, facing: number): void {
  const progress = 1 - Math.max(0, life) / SANJI_HAKI_PRESENTATION.contactTicks;
  const radius = (8 + progress * 22) * scale, alpha = (1 - progress) * 0.78;
  graphics.lineStyle(1.5 * scale, SANJI_HAKI_PRESENTATION.dark, alpha);
  graphics.strokeCircle(center.x, center.y, radius);
  graphics.lineStyle(0.7 * scale, SANJI_HAKI_PRESENTATION.red, alpha);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = center.x + Math.cos(angle) * radius * 0.5 * facing;
    const y = center.y + Math.sin(angle) * radius * 0.5;
    const dx = Math.cos(angle) * radius * facing, dy = Math.sin(angle) * radius;
    graphics.lineBetween(x, y, x + dx * 0.45, y + dy * 0.3 - 2 * scale);
    graphics.lineBetween(x + dx * 0.45, y + dy * 0.3 - 2 * scale, x + dx, y + dy);
  }
}
