import Phaser from 'phaser';
import { STAGE_LEFT, STAGE_RIGHT, SUBPIXEL, VIEW_H, VIEW_W } from '@core/index';

/**
 * 马林梵多（顶上战争）程序化舞台：3 层视差 + 灰烬粒子。
 * 全部用 Graphics 绘制，无素材依赖；将来可用 stages/marineford/atlas 替换每一层。
 *
 * 视差系数：远景 0.15，中景 0.45，近景（地面）1.0。世界 x → 屏幕 x：VIEW_W/2 + (x - camera*k)。
 */
export class Marineford {
  private readonly gfx: Phaser.GameObjects.Graphics;
  /** 灰烬：固定种子伪随机的初始位置，随时间下落 */
  private readonly ash: { x: number; y: number; s: number; v: number }[] = [];

  constructor(scene: Phaser.Scene, private readonly groundY: number) {
    this.gfx = scene.add.graphics().setDepth(-10);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 40; i++) this.ash.push({ x: rnd() * 1400 - 700, y: rnd() * groundY, s: 1 + rnd() * 1.5, v: 0.2 + rnd() * 0.5 });
  }

  draw(cameraX: number, frame: number): void {
    const g = this.gfx;
    g.clear();
    const cam = cameraX / SUBPIXEL;
    const gy = this.groundY;

    // ---- 天空：夕阳渐变（顶上战争黄昏色调）----
    const bands = [0x1b2a49, 0x2b3a5c, 0x4a3a5a, 0x7a3e4a, 0xa8503f];
    const bandH = gy / bands.length;
    bands.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, i * bandH, VIEW_W, bandH + 1));
    // 太阳
    g.fillStyle(0xffb703, 0.9).fillCircle(VIEW_W * 0.72 - cam * 0.05, gy * 0.62, 16);
    g.fillStyle(0xffd60a, 0.25).fillCircle(VIEW_W * 0.72 - cam * 0.05, gy * 0.62, 26);

    // ---- 远景：海面 + 海军本部建筑群（视差 0.15）----
    const far = (x: number) => VIEW_W / 2 + x - cam * 0.15;
    g.fillStyle(0x2f4858, 1).fillRect(0, gy * 0.7, VIEW_W, gy * 0.3);
    const buildings = [
      [-420, 40, 60], [-340, 62, 40], [-280, 50, 70], [-190, 78, 50], [-120, 56, 90],
      [0, 96, 60], [90, 68, 80], [200, 84, 44], [270, 54, 70], [360, 72, 50], [440, 46, 60],
    ];
    for (const [bx, bh, bw] of buildings) {
      const sx = far(bx!);
      g.fillStyle(0x1d2b3a, 1).fillRect(sx, gy * 0.7 - bh!, bw!, bh!);
      g.fillStyle(0x0f1a24, 1).fillRect(sx + 4, gy * 0.7 - bh! + 6, bw! - 8, 3);
      // 窗（稀疏）
      for (let wy = gy * 0.7 - bh! + 12; wy < gy * 0.7 - 6; wy += 10) {
        for (let wx = sx + 6; wx < sx + bw! - 6; wx += 11) {
          if (((wx * 7 + wy * 13) | 0) % 5 === 0) g.fillStyle(0xffb703, 0.45).fillRect(wx, wy, 2, 2);
        }
      }
    }
    // 海军旗（远景两侧）
    for (const fx of [-470, 480]) {
      const sx = far(fx);
      g.fillStyle(0xcfd8dc, 1).fillRect(sx, gy * 0.7 - 120, 2, 120);
      g.fillStyle(0x1565c0, 1).fillRect(sx + 2, gy * 0.7 - 118, 22, 14);
    }

    // ---- 中景：处刑台（视差 0.45），位于舞台中央上方 ----
    const mid = (x: number) => VIEW_W / 2 + x - cam * 0.45;
    const px0 = mid(0);
    g.fillStyle(0x3b3b4f, 1).fillRect(px0 - 90, gy * 0.7 - 12, 180, gy * 0.3 + 12); // 台基
    g.fillStyle(0x4b4b63, 1).fillRect(px0 - 18, gy * 0.7 - 96, 36, 84); // 高台柱
    g.fillStyle(0x5c5c78, 1).fillRect(px0 - 54, gy * 0.7 - 106, 108, 12); // 台面
    g.fillStyle(0x2e2e3e, 1).fillRect(px0 - 5, gy * 0.7 - 136, 10, 32); // 刑架
    g.fillStyle(0x2e2e3e, 1).fillRect(px0 - 32, gy * 0.7 - 136, 64, 6);
    // 广场人群剪影
    for (let i = -14; i <= 14; i++) {
      const cx = mid(i * 34 + ((i * 7) % 5) * 3);
      const h = 10 + ((i * 13) % 6);
      g.fillStyle(0x23233a, 1).fillRect(cx, gy - 12 - h, 8, h);
      g.fillStyle(0x23233a, 1).fillCircle(cx + 4, gy - 14 - h, 4);
    }

    // ---- 近景：广场地面（视差 1.0），碎冰裂缝 ----
    const near = (x: number) => VIEW_W / 2 + x - cam;
    g.fillStyle(0x3d405b, 1).fillRect(0, gy, VIEW_W, VIEW_H - gy);
    g.fillStyle(0x5c6784, 1).fillRect(0, gy, VIEW_W, 3);
    const left = near(STAGE_LEFT / SUBPIXEL);
    const right = near(STAGE_RIGHT / SUBPIXEL);
    for (let x = Math.floor(STAGE_LEFT / SUBPIXEL / 48) * 48; x < STAGE_RIGHT / SUBPIXEL; x += 48) {
      const sx = near(x);
      g.lineStyle(1, 0x2b2d42, 0.8).lineBetween(sx, gy + 3, sx + 10, VIEW_H);
      g.lineStyle(1, 0x2b2d42, 0.5).lineBetween(sx + 20, gy + 8, sx + 40, gy + 22);
    }
    // 舞台两侧墙
    g.fillStyle(0x8d99ae, 0.35).fillRect(left - 6, 0, 6, gy);
    g.fillStyle(0x8d99ae, 0.35).fillRect(right, 0, 6, gy);

    // ---- 灰烬 / 火星粒子 ----
    for (const a of this.ash) {
      const y = (a.y + frame * a.v) % gy;
      const x = near(a.x) + Math.sin((frame + a.x) * 0.02) * 6;
      if (x < -4 || x > VIEW_W + 4) continue;
      g.fillStyle(a.s > 2 ? 0xff9f1c : 0xcfd8dc, 0.55).fillRect(x, y, a.s, a.s);
    }
  }
}
