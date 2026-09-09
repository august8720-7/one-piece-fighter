import Phaser from 'phaser';
import { VIEW_W } from '@core/index';
import { characters } from '@characters/index';
import { getInputHub } from '@input/InputHub';
import { FixedStep } from '../FixedStep';
import { MenuList, UI, drawPanel } from '../ui/MenuList';
import type { FightSceneData } from './FightScene';

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
    this.data_ = data;
  }

  create(): void {
    const d = this.data_;
    const winnerId = d.winner === 0 ? d.p1 : d.p2;
    const name = characters[winnerId]?.name ?? winnerId;
    const who = d.mode === 'cpu' && d.winner === 1 ? 'CPU' : `P${d.winner + 1}`;
    drawPanel(this, 'RESULT');
    this.add
      .text(VIEW_W / 2, 74, `${who}  ${name}  WINS`, { fontFamily: UI.font, fontSize: '18px', color: d.winner === 0 ? UI.p1 : UI.p2, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 98, `${d.wins[0]} - ${d.wins[1]}`, { fontFamily: UI.font, fontSize: '14px', color: UI.text })
      .setOrigin(0.5);
    this.menu = new MenuList(this, VIEW_W / 2 - 60, 132, [{ label: '再来一局  REMATCH' }, { label: '重新选人  CHARACTER SELECT' }, { label: '回标题  TITLE' }], 20, '11px');
    getInputHub().flush();
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      const action = this.menu.update(hub.edges());
      if (action === 'select') {
        const d = this.data_;
        if (this.menu.index === 0) this.scene.start('Preload', { p1: d.p1, p2: d.p2, mode: d.mode } satisfies FightSceneData);
        else if (this.menu.index === 1) this.scene.start('CharacterSelect', { mode: d.mode });
        else this.scene.start('Title');
        return;
      }
      if (action === 'back') {
        this.scene.start('CharacterSelect', { mode: this.data_.mode });
        return;
      }
    }
  }
}
