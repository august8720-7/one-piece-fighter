import Phaser from 'phaser';
import { sfx, sfxHudText, type AudioGroup } from '../../audio/Sfx';
import { getInputHub } from '@input/InputHub';
import { ACTIONS, ACTION_LABEL, P2_NO_NUMPAD, defaultKeyConfig, keyConflicts, keyLabel, type Action, type KeyConfig } from '@input/keymap';
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
];

/** Compact settings keep sound recovery and both players' keys reachable by mouse or keyboard. */
export class SettingsScene extends Phaser.Scene {
  private step = new FixedStep();
  private menu!: MenuList;
  private cfg!: KeyConfig;
  private waiting: { side: 'p1' | 'p2'; action: Action } | null = null;
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
    this.cfg = structuredClone(getInputHub().keyConfig);
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
    this.tab = tab; this.menu?.destroy();
    this.menu = new MenuList(this, ui(90), ui(166), this.items(), 25, '16px');
    this.tabs.forEach((button, i) => button.setColor(i === ['audio', 'p1', 'p2'].indexOf(tab) ? UI.title : UI.dim));
    this.notice = ''; getInputHub().flush();
  }
  private items(): { label: string }[] {
    if (this.tab !== 'audio') return [
      ...ACTIONS.map(action => ({ label: `${ACTION_LABEL[action].padEnd(12)} ${keyLabel(this.cfg[this.tab as 'p1' | 'p2'][action])}` })),
      { label: '恢复默认键位' }, { label: 'P2 使用无小键盘布局' }, { label: '保存并返回' },
    ];
    const rows = AUDIO_ROWS.map(row => {
      const value = row.group ? sfx().groupVolume(row.group) : sfx().volume;
      return { label: `${row.label.padEnd(12)} ${Math.round(value * 100)}%` };
    });
    return [...rows, { label: `静音    ${sfx().muted ? '已开启' : '已关闭'}` },
      { label: '开启声音' }, { label: '试听打击音' }, { label: '重试失败音频' },
      { label: '恢复默认声音设置' }, { label: '查看游戏诊断' }, { label: '保存并返回' }];
  }
  private async audioAction(index: number): Promise<void> {
    if (this.audioUiClosed) return;
    const session = this.audioSession;
    const current = (): boolean => !this.audioUiClosed && session === this.audioSession;
    const audio = sfx();
    if (index === 4) audio.toggleMute();
    if (index === 5) {
      await audio.enableSound();
      if (!current()) return;
      this.notice = '已请求开启；原音量设置已保留。';
    }
    if (index === 6) {
      const played = await audio.preview('hit_heavy');
      if (!current()) return;
      this.notice = played ? '试听已经过战斗音效通路播放。' : `试听未输出：${sfxHudText(audio.hudState())}`;
    }
    if (index === 7) {
      this.notice = '正在重试失败音频…';
      const result = await audio.retryFailed();
      if (!current()) return;
      this.notice = result.failed.length ? `仍有 ${result.failed.length} 项失败，诊断可查看原因。` : '失败音频重试结束。';
    }
    if (index === 8) { audio.restoreDefaults(); this.notice = '已按本次操作恢复游戏声音默认设置。'; }
    if (index === 9) this.diagnostics.open();
    if (index === 10) this.leave();
    if (current() && this.scene.isActive()) this.menu.setItems(this.items());
  }
  override update(_t: number, dt: number): void {
    if (this.diagnostics.visible) { getInputHub().flush(); return; }
    const audio = sfx();
    this.status.setText(this.tab === 'audio'
      ? `${sfxHudText(audio.hudState()) || '游戏音频通路正常'}\n\n开启声音会保留原音量。总音量或音效音量为零时，请用左侧调高。\n\n人物台词尚未完成听辨，不以音效代替。\n\n${this.notice}`
      : `选择动作后按确认，再按新键。Esc 取消当前重绑。\n\nStart：Enter（P1）\n小键盘 Enter（P2）\n\n${keyConflicts(this.cfg)[0] ?? '当前无键位冲突'}`);
    const hub = getInputHub();
    for (let i = 0, steps = this.step.advance(dt); i < steps; i++) {
      if (this.waiting) {
        const code = hub.keyboard.takeLastCode(); hub.edges();
        if (code === 'Escape') { this.waiting = null; this.hint.setText(''); }
        else if (code && !code.startsWith('F')) {
          this.cfg[this.waiting.side][this.waiting.action] = code; this.waiting = null;
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
        this.hint.setText('试听受总音量、音效分组和静音控制；M 可切换静音。');
      } else if (action === 'select') {
        if (index < ACTIONS.length) {
          const selected = ACTIONS[index]!; this.waiting = { side: this.tab, action: selected };
          hub.keyboard.takeLastCode(); this.hint.setText(`按新键绑定 ${this.tab.toUpperCase()} ${ACTION_LABEL[selected]} · Esc 取消`);
        } else if (index === ACTIONS.length) {
          this.cfg[this.tab] = defaultKeyConfig()[this.tab]; this.menu.setItems(this.items());
        } else if (index === ACTIONS.length + 1) {
          this.cfg.p2 = { ...P2_NO_NUMPAD }; this.menu.setItems(this.items());
        } else { this.leave(); return; }
      }
    }
  }
  private leave(): void {
    if (this.waiting || this.audioUiClosed) return;
    this.closeAudioUi();
    this.diagnostics.close(); getInputHub().setKeyConfig(this.cfg); getInputHub().flush();
    if (this.resumeScene) { this.scene.stop(); this.game.events.emit('opf-settings-closed'); }
    else this.scene.start(this.back, this.backData);
  }

  private closeAudioUi(): void {
    if (this.audioUiClosed) return;
    this.audioUiClosed = true;
    this.audioSession++;
    sfx().cancelPreview();
  }
}
