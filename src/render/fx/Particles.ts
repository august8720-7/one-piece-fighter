import Phaser from 'phaser';

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  gravity: number;
  /** 线形火花（沿速度方向拉长） */
  streak: boolean;
}

/**
 * Graphics 粒子池：打击火花、防御火花、尘土、灼烧火星。
 * 屏幕坐标；每逻辑帧 tick 一次，每渲染帧 draw 一次。
 */
export class Particles {
  private readonly pool: Particle[] = [];
  private readonly gfx: Phaser.GameObjects.Graphics;
  private seed = 12345;

  constructor(scene: Phaser.Scene, capacity = 256) {
    this.gfx = scene.add.graphics().setDepth(60);
    for (let i = 0; i < capacity; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: 0xffffff, gravity: 0, streak: false });
    }
  }

  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private spawn(p: Partial<Particle> & { x: number; y: number }): void {
    const slot = this.pool.find((q) => !q.alive) ?? this.pool[0]!;
    Object.assign(slot, { alive: true, vx: 0, vy: 0, life: 20, maxLife: 20, size: 2, color: 0xffffff, gravity: 0, streak: false }, p);
    slot.maxLife = slot.life;
  }

  /** 命中火花：向四周放射的线形火花 + 中心闪光 */
  hitSpark(x: number, y: number, power: number, color = 0xffd60a, dir: 1 | -1 = 1): void {
    const n = 8 + Math.min(12, Math.floor(power / 12));
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2;
      const sp = 2 + this.rnd() * (3 + power / 40);
      this.spawn({ x, y, vx: Math.cos(a) * sp + dir * 1.5, vy: Math.sin(a) * sp, life: 10 + Math.floor(this.rnd() * 8), size: 1 + this.rnd() * 2, color: i % 3 === 0 ? 0xffffff : color, streak: true, gravity: 0.15 });
    }
    this.spawn({ x, y, life: 4, size: 10 + power / 10, color: 0xffffff });
  }

  /** 防御火花：短促、偏蓝、朝防御方后侧 */
  blockSpark(x: number, y: number, dir: 1 | -1): void {
    for (let i = 0; i < 7; i++) {
      const a = (this.rnd() - 0.5) * 1.6;
      const sp = 2 + this.rnd() * 2;
      this.spawn({ x, y, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, life: 8 + Math.floor(this.rnd() * 6), size: 1.5, color: i % 2 ? 0x48cae4 : 0xcaf0f8, streak: true });
    }
  }

  /** 尘土：落地 / 倒地 */
  dust(x: number, y: number, amount = 8): void {
    for (let i = 0; i < amount; i++) {
      this.spawn({ x: x + (this.rnd() - 0.5) * 20, y, vx: (this.rnd() - 0.5) * 2.5, vy: -0.6 - this.rnd() * 1.2, life: 14 + Math.floor(this.rnd() * 10), size: 2 + this.rnd() * 2, color: 0x8d99ae, gravity: 0.03 });
    }
  }

  /** 灼烧火星：持续小量上飘 */
  ember(x: number, y: number): void {
    this.spawn({ x: x + (this.rnd() - 0.5) * 16, y, vx: (this.rnd() - 0.5) * 0.6, vy: -0.8 - this.rnd(), life: 12 + Math.floor(this.rnd() * 8), size: 1.5, color: this.rnd() > 0.5 ? 0xff9f1c : 0xff3860 });
  }

  /** KO：大量白金火花 */
  koBurst(x: number, y: number): void {
    for (let i = 0; i < 40; i++) {
      const a = this.rnd() * Math.PI * 2;
      const sp = 3 + this.rnd() * 6;
      this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 20 + Math.floor(this.rnd() * 20), size: 2 + this.rnd() * 2, color: i % 2 ? 0xffd60a : 0xffffff, streak: true, gravity: 0.1 });
    }
  }

  tick(): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      if (--p.life <= 0) p.alive = false;
    }
  }

  draw(): void {
    const g = this.gfx;
    g.clear();
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      if (p.streak) {
        g.lineStyle(p.size, p.color, t).lineBetween(p.x, p.y, p.x - p.vx * 2, p.y - p.vy * 2);
      } else {
        g.fillStyle(p.color, t * 0.9).fillCircle(p.x, p.y, p.size * (0.5 + t * 0.5));
      }
    }
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
    this.gfx.clear();
  }
}
