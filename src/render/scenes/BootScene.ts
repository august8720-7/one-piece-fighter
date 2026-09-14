import Phaser from 'phaser';
import { characters } from '@characters/index';
import { loadCharacterAtlases } from '../assets';
import { SCREEN_H, SCREEN_W, font } from '../screen';
import { UI } from '../ui/MenuList';
import type { FightSceneData, GameMode } from './FightScene';
import { adoptPresentation, presentationFromQuery } from '../presentation';

/**
 * 启动：加载全部角色图集（菜单 / 选人 / 结算也要用），然后进标题；
 * 带 URL 参数时直达战斗（开发 / 冒烟测试用）：?mode=versus|cpu|training&p1=luffy&p2=akainu&difficulty=easy|normal|hard
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x0b1220).setOrigin(0);
    this.add.text(SCREEN_W / 2, SCREEN_H / 2, 'LOADING', { fontFamily: UI.font, fontSize: font(22), color: UI.dim }).setOrigin(0.5);
    const profile = adoptPresentation(this.registry, presentationFromQuery(new URLSearchParams(window.location.search)));
    if (profile.art === 'anime') this.route();
    else void loadCharacterAtlases(this, Object.keys(characters)).then(() => { if (this.scene.isActive()) this.route(); });
  }

  private route(): void {
    const q = new URLSearchParams(window.location.search);
    const profile = adoptPresentation(this.registry, presentationFromQuery(q));
    const modeParam = q.get('mode');
    if (!modeParam) {
      if (profile.art === 'anime') this.scene.start('Preload', { p1: 'luffy', p2: 'akainu', mode: 'cpu', destination: 'Title', ...profile });
      else this.scene.start('Title', profile);
      return;
    }
    const pick = (v: string | null, fallback: string) => (v && characters[v] ? v : fallback);
    const mode: GameMode = modeParam === 'training' ? 'training' : modeParam === 'cpu' ? 'cpu' : 'versus';
    const diff = q.get('difficulty');
    const data: FightSceneData = {
      p1: pick(q.get('p1'), 'luffy'),
      p2: pick(q.get('p2'), 'akainu'),
      mode,
      difficulty: diff === 'easy' || diff === 'hard' ? diff : 'normal',
      tutorial: q.get('tutorial') === '1',
      ...profile,
    };
    this.scene.start('Preload', data);
  }
}
