import Phaser from 'phaser';
import type { FightSim, FighterState } from '@core/index';
import { currentAnimation, frameName, type AnimTable } from './animations';

/**
 * 角色精灵视图：每帧根据逻辑状态直接设置帧名（不用 Phaser 计时动画，保证与 60Hz 逻辑同步）。
 * 图集里缺某一帧时返回 false，由场景回退到色块绘制。
 */
export class FighterView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private missing = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private readonly textureKey: string,
    private readonly charId: string,
    private readonly anims: AnimTable,
  ) {
    this.sprite = scene.add.sprite(0, 0, textureKey).setOrigin(0.5, 1).setDepth(10).setVisible(false);
  }

  /** 返回是否成功用精灵表现了该帧 */
  update(sim: FightSim, f: FighterState, screenX: number, screenY: number, tint: number | null, alpha: number): boolean {
    const { anim, index } = currentAnimation(sim, f, this.anims);
    const name = frameName(this.charId, anim, index);
    if (!this.sprite.texture.has(name)) {
      if (!this.missing.has(name)) this.missing.add(name);
      this.sprite.setVisible(false);
      return false;
    }
    // 出招 / 投技中的一方画在上层；否则 P1 在上
    const acting = f.state === 'attack' || f.state === 'throw';
    this.sprite
      .setFrame(name)
      .setPosition(Math.round(screenX), Math.round(screenY))
      .setFlipX(f.facing === -1)
      .setVisible(true)
      .setAlpha(alpha)
      .setDepth(acting ? 12 : f.player === 0 ? 11 : 10);
    if (tint === null) this.sprite.clearTint();
    else this.sprite.setTint(tint);
    return true;
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  /** 缺失帧列表（调试面板显示） */
  get missingFrames(): readonly string[] {
    return [...this.missing];
  }

  get key(): string {
    return this.textureKey;
  }
}
