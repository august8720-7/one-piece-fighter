import { VoiceSubtitles } from '../ui/VoiceSubtitles';
import Phaser from 'phaser';
import { Btn, type InputFrame, type ControlModes } from '@core/index';
import { characters } from '@characters/index';
import { sfx } from '../../audio/Sfx';
import { keyLabel } from '@input/keymap';
import { getInputHub } from '@input/InputHub';
import { interfaceFrame, spriteFrame } from '../assets';
import { FixedStep } from '../FixedStep';
import { SCREEN_H, SCREEN_W, font, ui } from '../screen';
import { UI, drawPanel } from '../ui/MenuList';
import { controlModeLabel, matchControls } from '../ui/matchControls';
import { confirmHint } from '../ui/controlHint';
import type { Difficulty } from '../../ai/types';
import type { FightSceneData, GameMode } from './FightScene';
import { adoptPresentation, readPresentation, type PresentationData } from '../presentation';

interface Data extends PresentationData {
  mode: GameMode;
  difficulty?: Difficulty;
  tutorial?: boolean;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const DIFF_LABEL: Record<Difficulty, string> = { easy: '简单 EASY', normal: '普通 NORMAL', hard: '困难 HARD' };

const IDS = Object.keys(characters);
const CARD_W = ui(240);
const CARD_H = ui(280);
const CARD_Y = ui(140);

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
  private confirmation = 0;
  private difficulty: Difficulty = 'normal';
  private tutorial = false;
  private controlModes: ControlModes = ['simple', 'simple'];
  private modesText!: Phaser.GameObjects.Text;
  private diffText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('CharacterSelect');
  }

  init(data: Data): void {
    adoptPresentation(this.registry, data);
    this.controlModes = getInputHub().controlModes;
    this.mode = data?.mode ?? 'versus';
    this.difficulty = data?.difficulty ?? 'normal';
    this.tutorial = !!data?.tutorial;
    this.cursor = [0, Math.min(1, IDS.length - 1)];
    this.locked = [false, false];
    this.countdown = -1;
    this.diffText = null;
  }

  create(): void {
    sfx().resume(); sfx().playMusic('menu');
    new VoiceSubtitles(this, 100);
    this.step = new FixedStep();
    this.cards = [];
    this.tags = null;
    const sub =
      this.mode === 'versus'
        ? `P1 / P2 各自选择   ←→ 移动   ${confirmHint()}`
        : this.mode === 'cpu'
          ? `P1 先选自己，再选对手   ←→   ${confirmHint()}   ↑↓ 难度`
          : `P1 先选自己，再选对手   ←→   ${confirmHint()}`;
    drawPanel(this, 'CHARACTER SELECT', sub);
    if (this.mode === 'cpu') {
      this.diffText = this.add
        .text(SCREEN_W / 2, CARD_Y + CARD_H + ui(16), '', { fontFamily: UI.font, fontSize: font(16), color: UI.title })
        .setOrigin(0.5, 0);
    }
    const total = IDS.length * (CARD_W + ui(32)) - ui(32);
    const x0 = (SCREEN_W - total) / 2;
    IDS.forEach((id, i) => {
      const def = characters[id]!;
      const x = x0 + i * (CARD_W + ui(32));
      const card = this.add.rectangle(x, CARD_Y, CARD_W, CARD_H, 0x14213d).setOrigin(0).setStrokeStyle(ui(2), 0x5c3d24);
      this.cards.push(card);
      const art = readPresentation(this.registry).art === 'anime' ? interfaceFrame(this, id, 'body') : spriteFrame(this, id, 'idle');
      if (art) {
        const spr = this.add.sprite(x + CARD_W / 2, CARD_Y + CARD_H - ui(56), art.key, art.frame).setOrigin(0.5, 1);
        const scale = ui(200) / Math.max(1, spr.height);
        spr.setScale(scale);
        if (i === 1) spr.setFlipX(true);
      } else if (readPresentation(this.registry).art === 'anime') {
        this.add.text(x + CARD_W / 2, CARD_Y + ui(150), '人物资源不可用', { fontFamily: UI.font, fontSize: font(16), color: UI.dim }).setOrigin(0.5);
      } else {
        this.add.rectangle(x + CARD_W / 2, CARD_Y + ui(168), ui(def.pushboxStand[2] * 2.6), ui(def.pushboxStand[3] * 1.8), def.color).setOrigin(0.5, 1);
        this.add.rectangle(x + CARD_W / 2, CARD_Y + ui(168 - def.pushboxStand[3] * 1.8 - 4), ui(32), ui(24), 0xffe8d6).setOrigin(0.5, 1);
      }
      this.add
        .text(x + CARD_W / 2, CARD_Y + CARD_H - ui(42), def.name, { fontFamily: UI.font, fontSize: font(22), color: UI.text, fontStyle: 'bold' })
        .setOrigin(0.5, 0);
      this.add
        .text(x + CARD_W / 2, CARD_Y + ui(12), def.tagline ?? '', { fontFamily: UI.font, fontSize: font(12), color: UI.dim })
        .setOrigin(0.5, 0);
    });
    this.cursorGfx = this.add.graphics().setDepth(5);
    this.status = this.add.text(SCREEN_W / 2, SCREEN_H - ui(48), '', { fontFamily: UI.font, fontSize: font(18), color: UI.accent }).setOrigin(0.5);
    const tagStyle = { fontFamily: UI.font, fontSize: font(14), color: '#000000', fontStyle: 'bold' };
    this.tags = [
      this.add.text(0, 0, 'P1', tagStyle).setOrigin(0.5).setDepth(6),
      this.add.text(0, 0, this.mode === 'versus' ? 'P2' : this.mode === 'cpu' ? 'CPU' : '木桩', tagStyle).setOrigin(0.5).setDepth(6),
    ];
    this.modesText = this.add.text(SCREEN_W / 2, ui(461), '', { fontFamily: UI.font, fontSize: font(14), color: UI.text, align: 'center' }).setOrigin(0.5);
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
      if (!this.locked[0] && !this.locked[1] && (e.p1 | e.p2) & Btn.B) {
        sfx().play('menu_move');
        this.scene.start('Menu', readPresentation(this.registry));
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
        if (bits & Btn.B) {
          this.locked[p] = false;
          sfx().play('menu_move');
        }
        continue;
      }
      if (bits & Btn.C) this.toggleControls(p);
      if (bits & Btn.Left) {
        this.cursor[p] = (this.cursor[p] + IDS.length - 1) % IDS.length;
        sfx().play('menu_move');
      }
      if (bits & Btn.Right) {
        this.cursor[p] = (this.cursor[p] + 1) % IDS.length;
        sfx().play('menu_move');
      }
      if (bits & (Btn.A | Btn.Start)) {
        this.locked[p] = true;
        sfx().play('menu_confirm');
        sfx().playPresentation({ phase: 'select', key: `select-${++this.confirmation}`, characterId: IDS[this.cursor[p]]!, player: p });
      }
    }
    if (this.locked[0] && this.locked[1] && this.countdown < 0) this.countdown = 45;
  }

  private handleSolo(e: InputFrame): void {
    const bits = e.p1 | e.p2;
    const p = this.locked[0] ? 1 : 0;
    if (p === 0 && bits & Btn.C) this.toggleControls(0);
    if (this.mode === 'cpu' && bits & (Btn.Up | Btn.Down)) {
      const i = DIFFICULTIES.indexOf(this.difficulty);
      const n = DIFFICULTIES.length;
      this.difficulty = DIFFICULTIES[(i + (bits & Btn.Down ? 1 : n - 1)) % n]!;
      sfx().play('menu_move');
    }
    if (bits & Btn.B && this.locked[0]) {
      this.locked[0] = false;
      sfx().play('menu_move');
      return;
    }
    if (bits & Btn.Left) {
      this.cursor[p] = (this.cursor[p] + IDS.length - 1) % IDS.length;
      sfx().play('menu_move');
    }
    if (bits & Btn.Right) {
      this.cursor[p] = (this.cursor[p] + 1) % IDS.length;
      sfx().play('menu_move');
    }
    if (bits & (Btn.A | Btn.Start)) {
      this.locked[p] = true;
      sfx().play('menu_confirm');
      sfx().playPresentation({ phase: 'select', key: `select-${++this.confirmation}`, characterId: IDS[this.cursor[p]]!, player: p });
      if (p === 1) this.countdown = 45;
    }
  }

  private toggleControls(side: 0 | 1): void {
    const modes: [ControlModes[0], ControlModes[1]] = [...this.controlModes];
    modes[side] = modes[side] === 'simple' ? 'classic' : 'simple';
    this.controlModes = modes;
    getInputHub().setControlModes(modes);
    sfx().play('menu_move');
  }

  private start(): void {
    const data: FightSceneData = {
      p1: IDS[this.cursor[0]]!,
      p2: IDS[this.cursor[1]]!,
      mode: this.mode,
      controlModes: matchControls(this.mode, this.controlModes),
      difficulty: this.difficulty,
      tutorial: this.tutorial,
      ...readPresentation(this.registry),
    };
    this.scene.start('Preload', data);
  }

  private draw(): void {
    const g = this.cursorGfx;
    g.clear();
    const total = IDS.length * (CARD_W + ui(32)) - ui(32);
    const x0 = (SCREEN_W - total) / 2;
    const rect = (p: 0 | 1, color: number, inset: number) => {
      const x = x0 + this.cursor[p] * (CARD_W + ui(32));
      g.lineStyle(ui(3), color, this.locked[p] ? 1 : 0.85);
      g.strokeRect(x - inset, CARD_Y - inset, CARD_W + inset * 2, CARD_H + inset * 2);
      g.fillStyle(color, 1).fillRect(x + (p === 0 ? ui(8) : CARD_W - ui(52)), CARD_Y + CARD_H - ui(76), ui(44), ui(20));
    };
    rect(0, 0xe63946, ui(6));
    rect(1, 0xf4a261, ui(12));
    const labels = ['P1', this.mode === 'versus' ? 'P2' : this.mode === 'cpu' ? 'CPU' : '木桩'];
    for (const p of [0, 1] as const) {
      const x = x0 + this.cursor[p] * (CARD_W + ui(32)) + (p === 0 ? ui(30) : CARD_W - ui(30));
      this.tags?.[p].setText(labels[p]!).setPosition(x, CARD_Y + CARD_H - ui(66));
    }
    this.modesText.setText(`P1：${controlModeLabel(this.controlModes[0])}    ${this.mode === 'versus' ? 'P2：' + controlModeLabel(this.controlModes[1]) : 'CPU / 木桩：经典'}\n${keyLabel(getInputHub().keyConfig.p1.C)} / ${keyLabel(getInputHub().keyConfig.p2.C)} 切换对应玩家操作 · 手柄请选择经典`);
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
