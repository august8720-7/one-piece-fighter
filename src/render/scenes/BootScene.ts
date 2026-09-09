import Phaser from 'phaser';
import { characters } from '@characters/index';
import type { FightSceneData, GameMode } from './FightScene';

/**
 * 启动：默认进标题；带 URL 参数时直达战斗（开发 / 冒烟测试用）：
 * ?mode=versus|cpu|training&p1=luffy&p2=akainu
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const q = new URLSearchParams(window.location.search);
    const modeParam = q.get('mode');
    if (!modeParam) {
      this.scene.start('Title');
      return;
    }
    const pick = (v: string | null, fallback: string) => (v && characters[v] ? v : fallback);
    const mode: GameMode = modeParam === 'training' ? 'training' : modeParam === 'cpu' ? 'cpu' : 'versus';
    const data: FightSceneData = { p1: pick(q.get('p1'), 'luffy'), p2: pick(q.get('p2'), 'akainu'), mode };
    this.scene.start('Preload', data);
  }
}
