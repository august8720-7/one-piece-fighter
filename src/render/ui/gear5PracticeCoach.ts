import type Phaser from 'phaser';
import type { FightSim } from '@core/index';
import { getInputHub } from '@input/InputHub';
import { keyLabel } from '@input/keymap';
import { roleChoiceCommand } from './rolePlaystyles';
import { GEAR5_CORE_MOVES, Gear5PracticeSession } from './gear5Practice';
import { font, SCREEN_W, ui } from '../screen';
import { UI } from './MenuList';

/** Independent walkthrough: never rewrites the six characters' three-drill records. */
export class Gear5PracticeCoach {
  session: Gear5PracticeSession | null = null;
  private readonly launcher: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Text;
  private visible = true;
  constructor(scene: Phaser.Scene, private readonly toggle: () => void) {
    this.launcher = scene.add.text(ui(14), ui(77), '五档练习（独立，F6可重试）', {
      fontFamily: UI.font, fontSize: font(11), color: UI.title, backgroundColor: '#152938', padding: { x: ui(5), y: ui(3) },
    }).setDepth(72).setInteractive({ useHandCursor: true });
    this.launcher.on('pointerdown', () => { if (this.visible) this.toggle(); });
    this.prompt = scene.add.text(SCREEN_W / 2, ui(153), '', {
      fontFamily: UI.font, fontSize: font(13), color: UI.text, backgroundColor: '#152938',
      padding: { x: ui(12), y: ui(8) }, align: 'center', wordWrap: { width: ui(790) },
    }).setOrigin(0.5, 0).setDepth(72).setVisible(false);
  }
  start(sim: FightSim): void { this.session = new Gear5PracticeSession(); this.refresh(sim); }
  stop(): void { this.session = null; this.prompt.setVisible(false); this.launcher.setText('五档练习（独立，F6可重试）'); }
  refresh(sim: FightSim): void {
    if (!this.session) return;
    const hub = getInputHub();
    const code = hub.awakeningBindings.p1;
    const fighter = sim.state.fighters[0];
    const def = { ...fighter.def, moves: sim.effectiveMoves(fighter) as typeof fighter.def.moves,
      ...(fighter.def.skillSlots ? { skillSlots: fighter.def.skillSlots.map(id => fighter.def.gear5?.replacements[id] ?? id) } : {}) };
    const moves = GEAR5_CORE_MOVES.map(id => roleChoiceCommand(def, id, hub.keyConfig.p1, hub.controlModes[0], fighter.facing));
    const text = this.session.message(code ? keyLabel(code) : '手柄LT（觉醒键未绑定）', moves);
    if (this.prompt.text !== text) this.prompt.setText(text);
    this.prompt.setVisible(this.visible);
    this.launcher.setText('退出五档练习 · F6重试');
  }
  setVisible(visible: boolean): void { this.visible = visible; this.launcher.setVisible(visible); this.prompt.setVisible(visible && !!this.session); }
  destroy(): void { this.launcher.destroy(); this.prompt.destroy(); }
}
