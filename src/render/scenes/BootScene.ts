import Phaser from 'phaser';
import { characters } from '@characters/index';
import type { FightSceneData, GameMode } from './FightScene';

/** 解析 URL 参数（?p1=luffy&p2=akainu&mode=training），进入 Preload。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const q = new URLSearchParams(window.location.search);
    const pick = (v: string | null, fallback: string) => (v && characters[v] ? v : fallback);
    const mode: GameMode = q.get('mode') === 'training' ? 'training' : 'versus';
    const data: FightSceneData = { p1: pick(q.get('p1'), 'luffy'), p2: pick(q.get('p2'), 'akainu'), mode };
    this.scene.start('Preload', data);
  }
}
