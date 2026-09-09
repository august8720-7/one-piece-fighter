import Phaser from 'phaser';
import { Btn, VIEW_H, VIEW_W, type InputFrame } from '@core/index';
import { characters } from '@characters/index';
import { getInputHub } from '@input/InputHub';
import { FixedStep } from '../FixedStep';
import { UI, drawPanel } from '../ui/MenuList';
import type { Difficulty } from '../../ai/types';
import type { FightSceneData, GameMode } from './FightScene';

interface Data {
  mode: GameMode;
  difficulty?: Difficulty;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const DIFF_LABEL: Record<Difficulty, string> = { easy: '简单 EASY', normal: '普通 NORMAL', hard: '困难 HARD' };

const IDS = Object.keys(characters);
const CARD_W = 120;
const CARD_H = 130;
const CARD_Y = 78;

/**
 * 选人：P1 / P2 各一个光标。人机与训练模式由 P1 先选自己再选对手。
 * 左右移动，A 确认，B 取消 / 返回。
 */
export class CharacterSelectScene extends Phaser.Scene {
  private step = new FixedStep();
  private mode: GameMode = 'versus';
  private cursor: [number, number] = [0, 1];
  private locked: [boolean, boolean] = [false, false];
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private cursorGfx!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private tags: [Phaser.GameObjects.Text, Phaser.GameObjects.Text] | null = null;
  private countdown = -1;
  private difficulty: Difficulty = 'normal';
  private diffText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('CharacterSelect');
  }

  init(data: Data): void {
    this.mode = data?.mode ?? 'versus';
    this.difficulty = data?.difficulty ?? 'normal';
    this.cursor = [0, Math.min(1, IDS.length - 1)];
    this.locked = [false, false];
    this.countdown = -1;
    this.diffText = null;
  }

  create(): void {
    const sub =
      this.mode === 'versus'
        ? 'P1 / P2 各自选择   ←→ 移动   A 确认   B 取消'
        : this.mode === 'cpu'
          ? 'P1 先选自己，再选对手   ←→ 移动   A 确认   B 取消   ↑↓ 难度'
          : 'P1 先选自己，再选对手   ←→ 移动   A 确认   B 取消';
    drawPanel(this, 'CHARACTER SELECT', sub);
    if (this.mode === 'cpu') {
      this.diffText = this.add
        .text(VIEW_W / 2, CARD_Y + CARD_H + 10, '', { fontFamily: UI.font, fontSize: '10px', color: UI.title })
        .setOrigin(0.5, 0);
    }
    const total = IDS.length * (CARD_W + 20) - 20;
    const x0 = (VIEW_W - total) / 2;
    IDS.forEach((id, i) => {
      const def = characters[id]!;
      const x = x0 + i * (CARD_W + 20);
      const card = this.add.rectangle(x, CARD_Y, CARD_W, CARD_H, 0x14213d).setOrigin(0).setStrokeStyle(1, 0x3a3a5a);
      this.cards.push(card);
      // 占位立绘：色块人形
      this.add.rectangle(x + CARD_W / 2, CARD_Y + 86, def.pushboxStand[2] * 1.3, def.pushboxStand[3] * 0.9, def.color).setOrigin(0.5, 1);
      this.add.rectangle(x + CARD_W / 2, CARD_Y + 86 - def.pushboxStand[3] * 0.9 - 2, 18, 14, 0xffe8d6).setOrigin(0.5, 1);
      this.add
        .text(x + CARD_W / 2, CARD_Y + CARD_H - 22, def.name, { fontFamily: UI.font, fontSize: '14px', color: UI.text, fontStyle: 'bold' })
        .setOrigin(0.5, 0);
      this.add
        .text(x + CARD_W / 2, CARD_Y + 6, id === 'luffy' ? '速攻 · 连段 · 二档' : '压制 · 霸体 · 灼烧', {
          fontFamily: UI.font,
          fontSize: '7px',
          color: UI.dim,
        })
        .setOrigin(0.5, 0);
    });
    this.cursorGfx = this.add.graphics().setDepth(5);
    this.status = this.add.text(VIEW_W / 2, VIEW_H - 30, '', { fontFamily: UI.font, fontSize: '10px', color: UI.accent }).setOrigin(0.5);
    const tagStyle = { fontFamily: UI.font, fontSize: '8px', color: '#000000', fontStyle: 'bold' };
    this.tags = [
      this.add.text(0, 0, 'P1', tagStyle).setOrigin(0.5).setDepth(6),
      this.add.text(0, 0, this.mode === 'versus' ? 'P2' : this.mode === 'cpu' ? 'CPU' : 'DUMMY', tagStyle).setOrigin(0.5).setDepth(6),
    ];
    getInputHub().flush();
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      const e = hub.edges();
      if (this.countdown >= 0) {
        if (--this.countdown === 0) {
          this.start();
          return;
        }
        continue;
      }
      // 什么都没锁定时按 B：返回菜单（在处理解锁之前判断，避免同帧解锁又退出）
      if (!this.locked[0] && !this.locked[1] && (e.p1 | e.p2) & Btn.B) {
        this.scene.start('Menu');
        return;
      }
      if (this.mode === 'versus') this.handleVersus(e);
      else this.handleSolo(e);
    }
    this.draw();
  }

  private handleVersus(e: InputFrame): void {
    for (const p of [0, 1] as const) {
      const bits = p === 0 ? e.p1 : e.p2;
      if (this.locked[p]) {
        if (bits & Btn.B) this.locked[p] = false;
        continue;
      }
      if (bits & Btn.Left) this.cursor[p] = (this.cursor[p] + IDS.length - 1) % IDS.length;
      if (bits & Btn.Right) this.cursor[p] = (this.cursor[p] + 1) % IDS.length;
      if (bits & (Btn.A | Btn.Start)) this.locked[p] = true;
    }
    if (this.locked[0] && this.locked[1]) this.countdown = 45;
  }

  private handleSolo(e: InputFrame): void {
    const bits = e.p1 | e.p2;
    const p = this.locked[0] ? 1 : 0;
    if (this.mode === 'cpu' && bits & (Btn.Up | Btn.Down)) {
      const i = DIFFICULTIES.indexOf(this.difficulty);
      const n = DIFFICULTIES.length;
      this.difficulty = DIFFICULTIES[(i + (bits & Btn.Down ? 1 : n - 1)) % n]!;
    }
    if (bits & Btn.B && this.locked[0]) {
      this.locked[0] = false;
      return;
    }
    if (bits & Btn.Left) this.cursor[p] = (this.cursor[p] + IDS.length - 1) % IDS.length;
    if (bits & Btn.Right) this.cursor[p] = (this.cursor[p] + 1) % IDS.length;
    if (bits & (Btn.A | Btn.Start)) {
      this.locked[p] = true;
      if (p === 1) this.countdown = 45;
    }
  }

  private start(): void {
    const data: FightSceneData = { p1: IDS[this.cursor[0]]!, p2: IDS[this.cursor[1]]!, mode: this.mode, difficulty: this.difficulty };
    this.scene.start('Preload', data);
  }

  private draw(): void {
    const g = this.cursorGfx;
    g.clear();
    const total = IDS.length * (CARD_W + 20) - 20;
    const x0 = (VIEW_W - total) / 2;
    const rect = (p: 0 | 1, color: number, inset: number) => {
      const x = x0 + this.cursor[p] * (CARD_W + 20);
      g.lineStyle(2, color, this.locked[p] ? 1 : 0.8);
      g.strokeRect(x - inset, CARD_Y - inset, CARD_W + inset * 2, CARD_H + inset * 2);
      g.fillStyle(color, 1).fillRect(x + (p === 0 ? 4 : CARD_W - 28), CARD_Y + CARD_H - 40, 24, 12);
    };
    rect(0, 0xe63946, 3);
    rect(1, 0xf4a261, 6);
    const labels = ['P1', this.mode === 'versus' ? 'P2' : this.mode === 'cpu' ? 'CPU' : 'DUMMY'];
    for (const p of [0, 1] as const) {
      const x = x0 + this.cursor[p] * (CARD_W + 20) + (p === 0 ? 16 : CARD_W - 16);
      this.tags?.[p].setText(labels[p]!).setPosition(x, CARD_Y + CARD_H - 34);
    }
    this.diffText?.setText(`CPU 难度：◀ ${DIFF_LABEL[this.difficulty]} ▶`);
    const p1Name = characters[IDS[this.cursor[0]]!]!.name;
    const p2Name = characters[IDS[this.cursor[1]]!]!.name;
    this.status.setText(
      this.countdown >= 0
        ? `${p1Name}  VS  ${p2Name}   —   FIGHT!`
        : this.mode === 'versus'
          ? `P1 ${this.locked[0] ? '✓' : '…'} ${p1Name}      P2 ${this.locked[1] ? '✓' : '…'} ${p2Name}`
          : this.locked[0]
            ? `你：${p1Name} ✓   选择对手：${p2Name}`
            : `选择你的角色：${p1Name}`,
    );
  }
}
