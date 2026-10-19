import type Phaser from 'phaser';
import type { AttachmentPoint } from '../animations';

export type Gear5Material = 'fire' | 'wind';

/** Material only: never selects a limb texture or changes combat geometry. */
export function gear5MaterialFor(characterId: string, form: 'gear5' | null, moveId: string | null,
  state: string, active: boolean): Gear5Material | null {
  if (characterId !== 'luffy' || form !== 'gear5' || state !== 'attack' || !active) return null;
  if (moveId === 'ult_red_hawk') return 'fire';
  if (moveId === 'sp_storm') return 'wind';
  return null;
}

/** Points and scale are in the same pre-camera Phaser layer pixels as the real sprite. */
export function drawGear5Material(graphics: Phaser.GameObjects.Graphics, kind: Gear5Material,
  palm: AttachmentPoint, wrist: AttachmentPoint, age: number, facing: number, scale: number): void {
  const distance = Math.hypot(palm.x - wrist.x, palm.y - wrist.y);
  const dx = distance > 0.01 ? (palm.x - wrist.x) / distance : facing;
  const dy = distance > 0.01 ? (palm.y - wrist.y) / distance : 0;
  const nx = -dy, ny = dx;
  const radius = Math.max(3, Math.min(5.5, distance / scale * 1.3)) * scale;
  if (kind === 'wind') {
    graphics.lineStyle(0.65 * scale, 0xc3f5ff, 0.74);
    graphics.strokeEllipse(palm.x, palm.y, radius * 2.7, radius * 1.65);
    for (let i = -1; i <= 1; i++) {
      const drift = ((age + i + 4) % 4) * 0.6 * scale;
      const x = palm.x - dx * (radius + drift) + nx * i * radius * 0.65;
      const y = palm.y - dy * (radius + drift) + ny * i * radius * 0.65;
      graphics.lineBetween(x, y, x - dx * 7 * scale, y - dy * 7 * scale);
    }
    return;
  }
  graphics.fillStyle(0xff5c20, 0.31);
  graphics.fillEllipse(palm.x, palm.y, radius * 2.8, radius * 2.0);
  for (let i = -2; i <= 2; i++) {
    const flicker = 0.75 + (Math.sin(age * 1.7 + i * 2.2) + 1) * 0.15;
    const x = palm.x + nx * i * radius * 0.36;
    const y = palm.y + ny * i * radius * 0.36;
    const tail = (8 + (2 - Math.abs(i)) * 2) * scale * flicker;
    graphics.fillStyle(i % 2 === 0 ? 0xff7e24 : 0xffcc53, 0.62);
    graphics.fillTriangle(x + nx * radius * 0.28, y + ny * radius * 0.28,
      x - nx * radius * 0.28, y - ny * radius * 0.28,
      x - dx * tail + nx * Math.sin(age + i) * scale,
      y - dy * tail - 2 * scale + ny * Math.sin(age + i) * scale);
  }
  graphics.fillStyle(0xffef9b, 0.46);
  graphics.fillCircle(palm.x, palm.y, radius * 0.42);
}
