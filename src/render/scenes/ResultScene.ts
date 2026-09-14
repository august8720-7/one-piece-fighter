import Phaser from 'phaser';
import { sfx } from '../../audio/Sfx';
import { characters } from '@characters/index';
import { getInputHub } from '@input/InputHub';
import { spriteFrame } from '../assets';
import { FixedStep } from '../FixedStep';
import { SCREEN_H, SCREEN_W, font, ui } from '../screen';
import { MenuList, UI, drawPanel } from '../ui/MenuList';
import type { FightSceneData } from './FightScene';
import { adoptPresentation, readPresentation } from '../presentation';

export interface ResultData extends FightSceneData {
  winner: 0 | 1;
  wins: readonly [number, number];
}

export class ResultScene extends Phaser.Scene {
  private step = new FixedStep();
  private menu!: MenuList;
  private data_!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.data_ = { ...data, ...adoptPresentation(this.registry, data) };
  }

  create(): void {
    this.step = new FixedStep();
    const d = this.data_;
    sfx().resume(); sfx().playMusic(d.mode === 'cpu' && d.winner === 1 ? 'defeat' : 'victory');
    const winnerId = d.winner === 0 ? d.p1 : d.p2;
    const name = characters[winnerId]?.name ?? winnerId;
    const who = d.mode === 'cpu' && d.winner === 1 ? 'CPU' : `P${d.winner + 1}`;
    drawPanel(this, 'RESULT');
    const art = spriteFrame(this, winnerId, 'win');
    if (art) {
      const pose = this.add.sprite(SCREEN_W - ui(200), SCREEN_H - ui(16), art.key, art.frame).setOrigin(0.5, 1).setFlipX(d.winner === 1);
      pose.setScale(ui(320) / pose.height);
    } else if (readPresentation(this.registry).art === 'anime') {
      this.add.text(SCREEN_W - ui(200), SCREEN_H / 2, '胜利动作资源不可用', { fontFamily: UI.font, fontSize: font(16), color: UI.dim }).setOrigin(0.5);
    }
    const quotes = characters[winnerId]?.quotes ?? [];
    const quote = quotes[Math.floor(Math.random() * quotes.length)] ?? '';
    this.add
      .text(ui(110), ui(150), `${who}  ${name}  WINS`, { fontFamily: UI.font, fontSize: font(32), color: d.winner === 0 ? UI.p1 : UI.p2, fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setStroke('#2a1c12', ui(5));
    const difficultyLabel = { easy: '简单', normal: '普通', hard: '困难' }[d.difficulty ?? 'normal'];
    const modeLabel = d.mode === 'cpu' ? `人机 · ${difficultyLabel}` : d.mode === 'training' ? '训练' : '双人';
    this.add.text(ui(110), ui(198), `${d.wins[0]} - ${d.wins[1]}    ${modeLabel}`, { fontFamily: UI.font, fontSize: font(24), color: UI.text }).setOrigin(0, 0.5);
    if (quote) this.add.text(ui(110), ui(236), `“${quote}”`, { fontFamily: UI.font, fontSize: font(16), color: UI.accent }).setOrigin(0, 0.5);
    this.menu = new MenuList(this, ui(130), ui(290), [{ label: '再来一局  REMATCH' }, { label: '重新选人  CHARACTER SELECT' }, { label: '回标题  TITLE' }], 36, '20px');
    getInputHub().flush();
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      const action = this.menu.update(hub.edges());
      if (action === 'select') {
        const d = this.data_;
        const diff = d.difficulty ? { difficulty: d.difficulty } : {};
        const profile = readPresentation(this.registry);
        if (this.menu.index === 0) this.scene.start('Preload', { p1: d.p1, p2: d.p2, mode: d.mode, ...diff, ...profile } satisfies FightSceneData);
        else if (this.menu.index === 1) this.scene.start('CharacterSelect', { mode: d.mode, ...diff, ...profile });
        else this.scene.start('Title', profile);
        return;
      }
      if (action === 'back') {
        this.scene.start('CharacterSelect', { mode: this.data_.mode, difficulty: this.data_.difficulty, ...readPresentation(this.registry) });
        return;
      }
    }
  }
}
