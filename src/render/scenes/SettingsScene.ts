import Phaser from 'phaser';
import type { ControlModes } from '@core/index';
import { controlModeLabel } from '../ui/matchControls';
import { sfx, sfxHudText, type AudioGroup } from '../../audio/Sfx';
import { getInputHub } from '@input/InputHub';
import { awakeningConflicts, type AwakeningBindings } from '@input/awakening';
import { isReservedKey, actionsFor, ACTION_LABEL, P2_NO_NUMPAD, P2_SIMPLE_NO_NUMPAD, defaultKeyConfig, keyConflicts, keyLabel, type Action, type KeyConfig } from '@input/keymap';
import { FixedStep } from '../FixedStep';
import { SCREEN_H, SCREEN_W, ui, font } from '../screen';
import { MenuList, UI, drawPanel } from '../ui/MenuList';
import { confirmHint } from '../ui/controlHint';
import { DiagnosticsPanel } from '../ui/DiagnosticsPanel';

interface Data { back?: string; backData?: object; resumeScene?: string }
type Tab = 'audio' | 'p1' | 'p2';
const AUDIO_ROWS: readonly { label: string; group: AudioGroup | null }[] = [
  { label: '总音量', group: null }, { label: '打击 / 技能音效', group: 'sfx' },
  { label: '人物台词', group: 'voice' }, { label: '战场环境声', group: 'ambient' },
  { label: '背景音乐', group: 'music' },
];
const AUDIO_ACTIONS = ['mute', 'chatter', 'enable', 'sfx', 'voice', 'music', 'stop', 'retry', 'defaults', 'diagnostics', 'back'] as const;
type BindAction = Action | 'Awakening';
const bindLabel = (action: BindAction): string => action === 'Awakening' ? '觉醒（路飞五档）' : ACTION_LABEL[action];

/** Compact settings keep sound recovery and both players' keys reachable by mouse or keyboard. */
export class SettingsScene extends Phaser.Scene {
  private step = new FixedStep();
  private menu!: MenuList;
  private cfg!: KeyConfig;
  private awakening!: AwakeningBindings;
  private modes: ControlModes = ['simple', 'simple'];
  private keyPage = 0;
  private waiting: { side: 'p1' | 'p2'; action: BindAction } | null = null;
  private hint!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private tabs: Phaser.GameObjects.Text[] = [];
  private tab: Tab = 'audio';
  private back = 'Menu';
  private backData: object | undefined;
  private resumeScene: string | undefined;
  private diagnostics!: DiagnosticsPanel;
  private notice = '';
  private audioSession = 0;
  private audioUiClosed = true;

  constructor() { super('Settings'); }
  init(data: Data): void {
    this.back = data?.back ?? 'Menu'; this.backData = data?.backData; this.resumeScene = data?.resumeScene;
    this.tab = 'audio'; this.waiting = null; this.notice = ''; this.step = new FixedStep();
  }
  create(): void {
    this.audioUiClosed = false;
    this.audioSession++;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeAudioUi());
    drawPanel(this, '设置', `${confirmHint()}   Tab 切换分类   ← → 调整音量`);
    this.modes = getInputHub().controlModes;
    this.cfg = structuredClone(getInputHub().keyConfigFor(this.modes));
    this.awakening = getInputHub().awakeningPreferences;
    this.diagnostics = new DiagnosticsPanel(this);
    this.tabs = (['声音', 'P1 键位', 'P2 键位']).map((label, index) => {
      const button = this.add.text(ui(220 + index * 260), ui(119), label, {
        fontFamily: UI.font, fontSize: font(19), color: UI.text,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.selectTab((['audio', 'p1', 'p2'] as const)[index]!));
      return button;
    });
    this.hint = this.add.text(SCREEN_W / 2, SCREEN_H - ui(26), '', {
      fontFamily: UI.font, fontSize: font(13), color: UI.accent, align: 'center', wordWrap: { width: SCREEN_W - ui(60) },
    }).setOrigin(0.5);
    this.status = this.add.text(ui(600), ui(182), '', {
      fontFamily: UI.font, fontSize: font(15), color: '#b1c6cf', lineSpacing: ui(8), wordWrap: { width: ui(305), useAdvancedWrap: true },
    });
    this.selectTab('audio');
    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      if (this.waiting || this.diagnostics.visible) return;
      event.preventDefault();
      const order: Tab[] = ['audio', 'p1', 'p2'];
      this.selectTab(order[(order.indexOf(this.tab) + 1) % order.length]!);
    });
    this.input.keyboard?.on('keydown-ESC', () => { if (!this.waiting && !this.diagnostics.visible) this.leave(); });
    getInputHub().flush(); getInputHub().keyboard.takeLastCode();
  }
  private selectTab(tab: Tab): void {
    if (this.waiting) return;
    this.tab = tab; this.keyPage = 0; this.menu?.destroy();
    this.menu = new MenuList(this, ui(90), ui(158), this.items(), this.tab === 'audio' ? 22 : 25, '16px');
    this.tabs.forEach((button, i) => button.setColor(i === ['audio', 'p1', 'p2'].indexOf(tab) ? UI.title : UI.dim));
    this.notice = ''; this.hint.setText(''); getInputHub().flush();
  }
  private bindingActions(): readonly BindAction[] {
    return [...actionsFor(this.modes[this.tab === 'p1' ? 0 : 1]), 'Awakening'];
  }
  private pageActions(): readonly BindAction[] {
    if (this.tab === 'audio') return [];
    return this.bindingActions().slice(this.keyPage * 8, this.keyPage * 8 + 8);
  }
  private items(): { label: string; disabled?: boolean }[] {
    if (this.tab !== 'audio') return [
      { label: `操作：${controlModeLabel(this.modes[this.tab === 'p1' ? 0 : 1])}（确认切换）` },
      { label: `键位第 ${this.keyPage + 1} / ${Math.ceil(this.bindingActions().length / 8)} 页（确认翻页）` },
      ...Array.from({ length: 8 }, (_, index) => {
        const action = this.pageActions()[index], side = this.tab as 'p1' | 'p2';
        const key = action === 'Awakening' ? this.awakening[side] : action ? this.cfg[side][action] : null;
        return action ? { label: `${bindLabel(action).padEnd(12)} ${keyLabel(key ?? '')}` } : { label: '', disabled: true };
      }),
      { label: '恢复默认键位' }, { label: 'P2 使用无小键盘布局' }, { label: '保存并返回' },
    ];
    const rows = AUDIO_ROWS.map(row => {
      const value = row.group ? sfx().groupVolume(row.group) : sfx().volume;
      return { label: `${row.label.padEnd(12)} ${Math.round(value * 100)}%` };
    });
    return [...rows, { label: `静音    ${sfx().muted ? '已开启' : '已关闭'}` },
      { label: `角色闲聊（移动/待机）  ${sfx().characterChatter ? '已开启' : '已关闭'}` },
      { label: '开启声音' }, { label: '试听打击音' }, { label: '试听人物声音' },
      { label: '试听音乐（8秒）' }, { label: '停止试听' }, { label: '重试失败音频' },
      { label: '恢复默认声音设置' }, { label: '查看游戏诊断' }, { label: '保存并返回' }];
  }
  private async audioAction(index: number): Promise<void> {
    if (this.audioUiClosed) return;
    const session = this.audioSession;
    const current = (): boolean => !this.audioUiClosed && session === this.audioSession;
    const audio = sfx();
    const action = AUDIO_ACTIONS[index - AUDIO_ROWS.length];
    if (action === 'mute') audio.toggleMute();
    if (action === 'chatter') { audio.setCharacterChatter(!audio.characterChatter); this.notice = audio.characterChatter ? '已开启可选闲聊；重要语音仍优先。' : '已关闭日常台词；动作音和重要回应保留。'; }
    if (action === 'enable') {
      await audio.enableSound();
      if (!current()) return;
      this.notice = '已请求开启；原音量设置已保留。';
    }
    if (action === 'sfx' || action === 'voice' || action === 'music') {
      const played = action === 'music' ? await audio.previewMusic() : await audio.preview(action === 'voice' ? 'voice.luffy.attack' : 'hit_heavy');
      if (!current()) return;
      this.notice = played ? '已请求试听，请以右侧分组状态与实际听感为准。' : `试听未输出：${sfxHudText(audio.hudState(action))}`;
    }
    if (action === 'stop') { audio.cancelPreview(); this.notice = '试听已停止。'; }
    if (action === 'retry') {
      this.notice = '正在重试失败音频…';
      const result = await audio.retryFailed();
      if (!current()) return;
      this.notice = result.failed.length ? `仍有 ${result.failed.length} 项失败，诊断可查看原因。` : '失败音频重试结束。';
    }
    if (action === 'defaults') { audio.restoreDefaults(); this.notice = '已按本次操作恢复游戏声音默认设置。'; }
    if (action === 'diagnostics') this.diagnostics.open();
    if (action === 'back') this.leave();
    if (current() && this.scene.isActive()) this.menu.setItems(this.items());
  }
  override update(_t: number, dt: number): void {
    if (this.diagnostics.visible) { getInputHub().flush(); return; }
    const audio = sfx();
    this.status.setText(this.tab === 'audio'
      ? `${AUDIO_ROWS.filter(row => row.group).map(row => `${row.label}：${sfxHudText(audio.hudState(row.group!))}`).join('\n')}\n\n日常台词默认关闭，动作音仍保留。人物发声时音乐自动降低。\n\n${this.notice}`
      : `确认后按新键；Esc取消。\n觉醒Backspace解绑；模式下场生效。\n\n五档仅适用于完整动漫版路飞：\n满3格气、地面中立且无强化/疲劳。\n按本页独立觉醒键或手柄LT。\n默认P1 T / P2 PageUp。\n旧版、动作样板、其他角色不适用。\n赛前必需资源失败可重试或返回。\nStart：P1 Enter / P2小键盘Enter。\n${this.conflicts()[0] ?? '当前无键位冲突'}\n${this.notice}`);
    const hub = getInputHub();
    for (let i = 0, steps = this.step.advance(dt); i < steps; i++) {
      if (this.waiting) {
        const code = hub.keyboard.takeLastCode(); hub.edges();
        if (code === 'Escape') { this.waiting = null; this.hint.setText(''); }
        else if (code && isReservedKey(code)) { this.hint.setText('该键为菜单 / 调试保留键，请换一个键。'); }
        else if (code) {
          const { side, action } = this.waiting;
          const draftKeys = structuredClone(this.cfg), draftAwakening = { ...this.awakening };
          if (action === 'Awakening') draftAwakening[side] = code === 'Backspace' ? null : code;
          else draftKeys[side][action] = code;
          const conflict = [...keyConflicts(draftKeys), ...awakeningConflicts(draftAwakening, draftKeys)][0];
          if (conflict) { this.hint.setText(`未保存：${conflict}；请换键，Esc取消。`); continue; }
          this.cfg = draftKeys; this.awakening = draftAwakening; this.waiting = null;
          this.menu.setItems(this.items()); this.hint.setText('');
        }
        continue;
      }
      const action = this.menu.update(hub.edges()), index = this.menu.index;
      if (action === 'back') { this.leave(); return; }
      if (this.tab === 'audio') {
        if (index < AUDIO_ROWS.length && (action === 'left' || action === 'right' || action === 'select')) {
          const row = AUDIO_ROWS[index]!, current = row.group ? audio.groupVolume(row.group) : audio.volume;
          const next = current + (action === 'left' ? -0.1 : 0.1);
          if (row.group) audio.setGroupVolume(row.group, next); else audio.setVolume(next);
          this.menu.setItems(this.items());
        } else if (action === 'select') void this.audioAction(index);
        this.hint.setText('试听受总音量、对应分组和静音控制；M 可切换静音。');
      } else if (action === 'select') {
        const actions = this.pageActions();
        if (index === 0) {
          if (!this.saveKeys()) continue;
          const next: [ControlModes[0], ControlModes[1]] = [...this.modes];
          const side = this.tab === 'p1' ? 0 : 1;
          next[side] = next[side] === 'simple' ? 'classic' : 'simple';
          const nextKeys = hub.keyConfigFor(next);
          const conflict = [...keyConflicts(nextKeys), ...awakeningConflicts(this.awakening, nextKeys)][0];
          if (conflict) { this.notice = `未切换：${conflict}；请先更改或解除觉醒键。`; continue; }
          this.modes = next;
          hub.setControlModes(next);
          this.cfg = structuredClone(hub.keyConfigFor(next));
          this.keyPage = 0; this.menu.setItems(this.items());
        } else if (index === 1) {
          this.keyPage = (this.keyPage + 1) % Math.ceil(this.bindingActions().length / 8);
          this.menu.setItems(this.items());
        } else if (index - 2 < actions.length) {
          const selected = actions[index - 2]!; this.waiting = { side: this.tab, action: selected };
          hub.keyboard.takeLastCode(); this.hint.setText(`按新键绑定 ${this.tab.toUpperCase()} ${bindLabel(selected)} · Esc取消${selected === 'Awakening' ? ' · Backspace解除' : ''}`);
        } else if (index === 10) {
          this.cfg[this.tab] = defaultKeyConfig(this.modes)[this.tab]; this.menu.setItems(this.items());
        } else if (index === 11) {
          this.cfg.p2 = { ...(this.modes[1] === 'simple' ? P2_SIMPLE_NO_NUMPAD : P2_NO_NUMPAD) }; this.menu.setItems(this.items());
        } else if (index === 12) { this.leave(); return; }
      }
    }
  }
  private leave(): void {
    if (this.waiting || this.audioUiClosed) return;
    if (!this.saveKeys()) return;
    this.closeAudioUi();
    this.diagnostics.close(); getInputHub().flush();
    if (this.resumeScene) { this.scene.stop(); this.game.events.emit('opf-settings-closed'); }
    else this.scene.start(this.back, this.backData);
  }

  private conflicts(): string[] { return [...keyConflicts(this.cfg), ...awakeningConflicts(this.awakening, this.cfg)]; }
  private saveKeys(): boolean {
    const conflict = this.conflicts()[0];
    if (conflict) { this.notice = `未保存：${conflict}`; this.hint.setText(this.notice); return false; }
    const hub = getInputHub();
    hub.setKeyConfig(this.cfg, this.modes);
    const result = hub.setAwakeningBindings(this.awakening, this.modes);
    if (result.conflicts.length) { this.notice = `未保存：${result.conflicts[0]}`; return false; }
    if (!result.saved) this.notice = '存储不可用：键位仅在本次会话生效。';
    return true;
  }

  private closeAudioUi(): void {
    if (this.audioUiClosed) return;
    this.audioUiClosed = true;
    this.audioSession++;
    sfx().cancelPreview();
  }
}
