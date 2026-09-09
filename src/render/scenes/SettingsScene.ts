import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '@core/index';
import { getInputHub } from '@input/InputHub';
import { ACTIONS, ACTION_LABEL, defaultKeyConfig, keyLabel, type Action, type KeyConfig } from '@input/keymap';
import { FixedStep } from '../FixedStep';
import { MenuList, UI, drawPanel } from '../ui/MenuList';

interface Data {
  back?: string;
  backData?: object;
}

/** 键位设置：选中一项按 A 进入等待，按任意键绑定；Esc 取消等待。 */
export class SettingsScene extends Phaser.Scene {
  private step = new FixedStep();
  private menu!: MenuList;
  private cfg!: KeyConfig;
  private waiting: { side: 'p1' | 'p2'; action: Action } | null = null;
  private hint!: Phaser.GameObjects.Text;
  private back = 'Menu';
  private backData: object | undefined;

  constructor() {
    super('Settings');
  }

  init(data: Data): void {
    this.back = data?.back ?? 'Menu';
    this.backData = data?.backData;
  }

  create(): void {
    drawPanel(this, 'KEY CONFIG', '↑↓ 选择   A 重绑（然后按新键）   B 返回   Esc 取消重绑');
    this.cfg = structuredClone(getInputHub().keyConfig);
    this.menu = new MenuList(this, 60, 62, this.items(), 12, '9px');
    this.hint = this.add.text(VIEW_W / 2, VIEW_H - 18, '', { fontFamily: UI.font, fontSize: '9px', color: UI.accent }).setOrigin(0.5);
    this.add
      .text(VIEW_W - 60, 62, 'Start：Enter（P1）/ 小键盘 Enter（P2）/ 手柄 Start\n手柄：X=A  A=B  Y=C  B=D  LB=翻滚  RB=吹飞', {
        fontFamily: UI.font,
        fontSize: '7px',
        color: UI.dim,
        align: 'right',
      })
      .setOrigin(1, 0);
    getInputHub().flush();
    getInputHub().keyboard.takeLastCode();
  }

  private items() {
    const rows: { label: string }[] = [];
    for (const side of ['p1', 'p2'] as const) {
      for (const a of ACTIONS) rows.push({ label: `${side.toUpperCase()}  ${ACTION_LABEL[a].padEnd(10)}  ${keyLabel(this.cfg[side][a])}` });
    }
    rows.push({ label: '恢复默认' });
    rows.push({ label: '保存并返回' });
    return rows;
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      if (this.waiting) {
        const code = hub.keyboard.takeLastCode();
        hub.edges(); // 消耗输入，避免绑定键触发菜单
        if (code === 'Escape') {
          this.waiting = null;
          this.hint.setText('');
        } else if (code && !code.startsWith('F')) {
          this.cfg[this.waiting.side][this.waiting.action] = code;
          this.waiting = null;
          this.menu.setItems(this.items());
          this.hint.setText('');
        }
        continue;
      }
      const action = this.menu.update(hub.edges());
      if (action === 'select') {
        const idx = this.menu.index;
        const total = ACTIONS.length * 2;
        if (idx < total) {
          const side = idx < ACTIONS.length ? 'p1' : 'p2';
          const a = ACTIONS[idx % ACTIONS.length]!;
          this.waiting = { side, action: a };
          hub.keyboard.takeLastCode();
          this.hint.setText(`按下新的键用于 ${side.toUpperCase()} ${ACTION_LABEL[a]}（Esc 取消）`);
        } else if (idx === total) {
          this.cfg = defaultKeyConfig();
          this.menu.setItems(this.items());
        } else {
          hub.setKeyConfig(this.cfg);
          this.scene.start(this.back, this.backData);
          return;
        }
      } else if (action === 'back') {
        hub.setKeyConfig(this.cfg);
        this.scene.start(this.back, this.backData);
        return;
      }
    }
  }
}
