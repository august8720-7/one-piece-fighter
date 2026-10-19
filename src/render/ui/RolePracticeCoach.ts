import type Phaser from 'phaser';
import type { ControlMode, Facing, FighterDef, InputFrame } from '@core/index';
import { getInputHub } from '@input/InputHub';
import { roleChoiceCommand, ROLE_PLAYSTYLES } from './rolePlaystyles';
import { practicesFor, rolePracticeProgress, type RolePracticeSession } from './rolePractice';
import { MenuList, UI } from './MenuList';
import { SCREEN_H, SCREEN_W, ui, font } from '../screen';

export type RolePracticeAction = { kind: 'choose'; id: string } | { kind: 'start' | 'retry' | 'next' | 'directory' | 'free' | 'cpu' | 'characters' | 'close' };

/** The existing arcade panels, with a compact live prompt and an explicit paused practice menu. */
export class RolePracticeCoach {
  private menu: MenuList | null = null;
  private nodes: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];
  private hud: Phaser.GameObjects.Text[] = [];
  private hudBox: Phaser.GameObjects.Rectangle | null = null;
  private actions: RolePracticeAction[] = [];
  private lastStatus = '';
  private lastMessage = '';
  private selected: RolePracticeSession | null = null;
  private visible = true;
  private facing: Facing = 1;
  private readonly launcher: Phaser.GameObjects.Text;
  private readonly progress = rolePracticeProgress();

  get blocksSimulation(): boolean { return this.menu !== null; }
  get active(): boolean { return this.selected !== null || this.blocksSimulation; }

  constructor(private readonly scene: Phaser.Scene, private readonly def: FighterDef, private readonly mode: ControlMode, private readonly act: (action: RolePracticeAction) => void) {
    this.launcher = scene.add.text(SCREEN_W - ui(14), ui(77), 'F2  学会这三招', {
      fontFamily: UI.font, fontSize: font(12), color: UI.title, backgroundColor: '#152938', padding: { x: ui(8), y: ui(3) },
    }).setOrigin(1, 0).setDepth(72).setInteractive({ useHandCursor: true });
    this.launcher.on('pointerdown', () => { if (this.visible) this.act({ kind: 'directory' }); });
  }

  showDirectory(): void {
    this.clearMenu(); this.clearHud();
    const style = ROLE_PLAYSTYLES[this.def.id];
    this.makeBackdrop(`${this.def.name} · 学会这三招`, `${style?.win ?? ''}\n留意：${style?.weakness ?? ''}`);
    const practices = practicesFor(this.def.id);
    const items = practices.map((practice, index) => ({ label: `${this.progress.has(practice.id) ? '✓' : `${index + 1}.`} ${practice.title}   ${roleChoiceCommand(this.def, practice.moveId, getInputHub().keyConfig.p1, this.mode, 1)}` }));
    items.push({ label: this.selected?.status === 'running' ? '继续当前练习' : '自由训练（不计教程完成）' }, { label: '打一小局 · 简单 CPU' }, { label: '返回选人' });
    this.actions = [...practices.map(practice => ({ kind: 'choose', id: practice.id } as const)), { kind: this.selected?.status === 'running' ? 'close' : 'free' }, { kind: 'cpu' }, { kind: 'characters' }];
    this.menu = new MenuList(this.scene, ui(180), ui(211), items, 38, '18px', 222);
    this.hint('上下选择 · 轻拳确认 · 轻脚返回自由训练 · 练习可随时跳过');
  }

  showSession(session: RolePracticeSession): void {
    this.selected = session; this.lastStatus = ''; this.refresh(session);
  }

  refresh(session = this.selected, facing: Facing = this.facing): void {
    if (!session) return;
    this.facing = facing;
    this.selected = session;
    if (session.status !== this.lastStatus) {
      this.lastStatus = session.status;
      if (session.status === 'running') { this.clearMenu(); this.showHud(session); }
      else this.showResult(session);
    }
    if (session.status === 'running' && this.hud.length) {
      const command = roleChoiceCommand(this.def, session.practice.moveId, getInputHub().keyConfig.p1, this.mode, this.facing);
      const instruction = `${command}  ${this.def.moves.find(move => move.id === session.practice.moveId)?.name ?? ''} · ${session.practice.goal}`;
      if (this.hud[1]!.text !== instruction) this.hud[1]!.setText(instruction);
      const message = session.elapsed < 30 && session.practice.script !== 'stand' && session.practice.script !== 'guard'
        ? `木桩准备行动 · ${Math.ceil((30 - session.elapsed) / 6) / 10}秒  ${session.message}` : session.message;
      if (message !== this.lastMessage) { this.hud[2]!.setText(message); this.lastMessage = message; }
    }
  }

  updateMenu(input: InputFrame): void {
    const action = this.menu?.update(input);
    if (action === 'back') this.act({ kind: 'free' });
    else if (action === 'select') { const selected = this.actions[this.menu!.index]; if (selected) this.act(selected); }
  }

  closeMenu(): void { this.clearMenu(); if (this.selected?.status === 'running') this.showHud(this.selected); }
  free(): void { this.selected = null; this.lastStatus = ''; this.clearMenu(); this.clearHud(); }
  setVisible(value: boolean): void {
    this.visible = value;
    this.launcher.setVisible(value);
    for (const node of [...this.nodes, ...this.hud]) node.setVisible(value);
    this.hudBox?.setVisible(value); this.menu?.setVisible(value);
  }
  destroy(): void { this.clearMenu(); this.clearHud(); this.launcher.destroy(); }

  private showResult(session: RolePracticeSession): void {
    this.clearMenu(); this.clearHud();
    if (session.status === 'passed') this.progress.record(session.practice.id);
    const index = practicesFor(this.def.id).findIndex(practice => practice.id === session.practice.id);
    this.makeBackdrop(`${this.def.name} · ${index + 1}/3 ${session.practice.title}${session.status === 'passed' ? ' ✓' : ''}`,
      session.status === 'ready' ? session.practice.goal : session.message);
    const move = this.def.moves.find(candidate => candidate.id === session.practice.moveId);
    this.nodes.push(this.scene.add.text(SCREEN_W / 2, ui(170), `${roleChoiceCommand(this.def, session.practice.moveId, getInputHub().keyConfig.p1, this.mode, 1)}  ${move?.name ?? ''}`, {
      fontFamily: UI.mono, fontSize: font(17), color: UI.accent, wordWrap: { width: ui(760) }, align: 'center',
    }).setOrigin(0.5).setDepth(222));
    this.actions = [{ kind: session.status === 'ready' ? 'start' : 'retry' }, { kind: 'next' }, { kind: 'directory' }, { kind: 'free' }, { kind: 'cpu' }, { kind: 'characters' }];
    this.menu = new MenuList(this.scene, ui(270), ui(225), [
      { label: session.status === 'ready' ? '开始当前练习' : '重试当前练习' }, { label: index === 2 ? '回三招目录（可跳过）' : '下一条（可跳过）' },
      { label: '三招目录' }, { label: '继续自由训练' }, { label: '打一小局 · 简单 CPU' }, { label: '返回选人' },
    ], 33, '17px', 222);
    this.hint(this.progress.persistent ? '上下选择 · 轻拳确认 · 不要求取胜或做完所有练习' : '本次进度暂不保存 · 练习与普通比赛仍可使用');
  }

  private showHud(session: RolePracticeSession): void {
    this.clearHud();
    this.hudBox = this.scene.add.rectangle(SCREEN_W / 2, ui(149), ui(840), ui(111), UI.panel, 0.95).setDepth(70).setStrokeStyle(ui(1), 0xc9a227);
    const index = practicesFor(this.def.id).findIndex(practice => practice.id === session.practice.id);
    this.hud.push(this.scene.add.text(SCREEN_W / 2, ui(104), `${index + 1}/3 ${session.practice.title}`, { fontFamily: UI.font, fontSize: font(17), color: UI.title, fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(71));
    this.hud.push(this.scene.add.text(SCREEN_W / 2, ui(131), '', { fontFamily: UI.font, fontSize: font(14), color: UI.text, wordWrap: { width: ui(790) }, align: 'center' }).setOrigin(0.5, 0).setDepth(71));
    this.hud.push(this.scene.add.text(SCREEN_W / 2, ui(166), '', { fontFamily: UI.font, fontSize: font(12), color: '#a0dfbd', align: 'center' }).setOrigin(0.5, 0).setDepth(71));
    for (const [index, entry] of ([['F6 重试', 'retry'], ['F12 下一条', 'next'], ['F2 目录', 'directory'], ['自由训练', 'free']] as const).entries()) {
      const button = this.scene.add.text(SCREEN_W / 2 + ui((index - 1.5) * 160), ui(190), entry[0], { fontFamily: UI.font, fontSize: font(12), color: UI.accent }).setOrigin(0.5).setDepth(72).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => { if (this.visible) this.act({ kind: entry[1] }); });
      this.hud.push(button);
    }
    this.lastMessage = '';
  }

  private makeBackdrop(title: string, description: string): void {
    this.nodes.push(this.scene.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x07101a, 0.94).setOrigin(0).setDepth(220));
    this.nodes.push(this.scene.add.text(SCREEN_W / 2, ui(59), title, { fontFamily: UI.font, fontSize: font(29), color: UI.title, fontStyle: 'bold' }).setOrigin(0.5).setDepth(221));
    this.nodes.push(this.scene.add.text(SCREEN_W / 2, ui(109), description, { fontFamily: UI.font, fontSize: font(16), color: UI.text, wordWrap: { width: ui(790) }, align: 'center', lineSpacing: ui(5) }).setOrigin(0.5, 0).setDepth(221));
  }
  private hint(text: string): void { this.nodes.push(this.scene.add.text(SCREEN_W / 2, ui(485), text, { fontFamily: UI.font, fontSize: font(13), color: UI.dim }).setOrigin(0.5).setDepth(221)); }
  private clearMenu(): void { this.menu?.destroy(); this.menu = null; this.actions = []; for (const node of this.nodes) node.destroy(); this.nodes = []; }
  private clearHud(): void { for (const text of this.hud) text.destroy(); this.hud = []; this.hudBox?.destroy(); this.hudBox = null; }
}

