import Phaser from 'phaser';
import { LOGIC_FPS, MAX_METER, METER_STOCK, VIEW_H, VIEW_W, type HitEvent, type WorldState } from '@core/index';

const BAR_W = 180;
const BAR_H = 10;
const BAR_Y = 14;
const MARGIN = 12;
const METER_W = 120;
const METER_H = 6;
const METER_Y = VIEW_H - 34;

/** HUD：双层血条、计时器、局数、气槽、连段计数、阶段横幅。 */
export class Hud {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly combo: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private readonly meterText: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  /** 延迟血条当前值（比例 0..1） */
  private lag: [number, number] = [1, 1];
  /** 连段显示：最后一次数值与剩余显示帧 */
  private comboShow: [{ hits: number; dmg: number; ttl: number }, { hits: number; dmg: number; ttl: number }] = [
    { hits: 0, dmg: 0, ttl: 0 },
    { hits: 0, dmg: 0, ttl: 0 },
  ];

  constructor(scene: Phaser.Scene, names: [string, string]) {
    this.gfx = scene.add.graphics().setDepth(50);
    const small = { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff' };
    scene.add.text(MARGIN, BAR_Y + BAR_H + 2, names[0], small).setDepth(51);
    scene.add.text(VIEW_W - MARGIN, BAR_Y + BAR_H + 2, names[1], small).setOrigin(1, 0).setDepth(51);

    this.timerText = scene.add
      .text(VIEW_W / 2, BAR_Y - 2, '99', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(51);
    this.roundText = scene.add
      .text(VIEW_W / 2, BAR_Y + 20, '', { fontFamily: 'monospace', fontSize: '7px', color: '#9fb3c8' })
      .setOrigin(0.5, 0)
      .setDepth(51);

    this.banner = scene.add
      .text(VIEW_W / 2, 100, '', { fontFamily: 'monospace', fontSize: '36px', color: '#ffd60a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(60)
      .setVisible(false);
    this.hint = scene.add
      .text(VIEW_W / 2, 140, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e0fbfc' })
      .setOrigin(0.5)
      .setDepth(60)
      .setVisible(false);

    const comboStyle = { fontFamily: 'monospace', fontSize: '12px', color: '#ffd60a', fontStyle: 'bold' };
    this.combo = [
      scene.add.text(MARGIN, 60, '', comboStyle).setDepth(55).setVisible(false),
      scene.add.text(VIEW_W - MARGIN, 60, '', comboStyle).setOrigin(1, 0).setDepth(55).setVisible(false),
    ];
    const meterStyle = { fontFamily: 'monospace', fontSize: '8px', color: '#ffd60a' };
    this.meterText = [
      scene.add.text(MARGIN + METER_W + 4, METER_Y - 1, '', meterStyle).setDepth(51),
      scene.add.text(VIEW_W - MARGIN - METER_W - 4, METER_Y - 1, '', meterStyle).setOrigin(1, 0).setDepth(51),
    ];
  }

  /** 每逻辑帧调用：消费事件更新连段显示 */
  onEvents(events: readonly HitEvent[], steps: number): void {
    for (const e of events) {
      if (e.kind !== 'hit') continue;
      const s = this.comboShow[e.attacker]!;
      s.hits = e.comboHits;
      s.dmg = e.comboDamage;
      s.ttl = 90;
    }
    for (const s of this.comboShow) if (s.ttl > 0) s.ttl -= steps;
  }

  draw(w: WorldState): void {
    const g = this.gfx;
    g.clear();

    for (let i = 0; i < 2; i++) {
      const f = w.fighters[i]!;
      const ratio = Math.max(0, f.hp / f.def.maxHp);
      const lag = this.lag[i]!;
      this.lag[i] = lag > ratio ? Math.max(ratio, lag - 0.006) : ratio;

      // 血条
      const x0 = i === 0 ? MARGIN : VIEW_W - MARGIN - BAR_W;
      g.fillStyle(0x1b1b2f, 1).fillRect(x0 - 1, BAR_Y - 1, BAR_W + 2, BAR_H + 2);
      const drawBar = (r: number, color: number) => {
        const wpx = Math.round(BAR_W * r);
        const x = i === 0 ? x0 + BAR_W - wpx : x0;
        g.fillStyle(color, 1).fillRect(x, BAR_Y, wpx, BAR_H);
      };
      drawBar(this.lag[i]!, 0xd62828);
      drawBar(ratio, 0xf1faee);

      // 局数标记（血条下方外侧）
      for (let r = 0; r < 2; r++) {
        const won = w.wins[i]! > r;
        const mx = i === 0 ? x0 + BAR_W - 8 - r * 10 : x0 + 2 + r * 10;
        g.fillStyle(won ? 0xffd60a : 0x3a3a5a, 1).fillRect(mx, BAR_Y + BAR_H + 4, 6, 4);
      }

      // 气槽：3 格
      const mx0 = i === 0 ? MARGIN : VIEW_W - MARGIN - METER_W;
      g.fillStyle(0x1b1b2f, 1).fillRect(mx0 - 1, METER_Y - 1, METER_W + 2, METER_H + 2);
      const stocks = Math.floor(f.meter / METER_STOCK);
      const segW = METER_W / (MAX_METER / METER_STOCK);
      for (let s = 0; s < MAX_METER / METER_STOCK; s++) {
        const fill = Math.max(0, Math.min(1, (f.meter - s * METER_STOCK) / METER_STOCK));
        const sx = i === 0 ? mx0 + s * segW : mx0 + METER_W - (s + 1) * segW;
        const wpx = Math.round((segW - 2) * fill);
        const fx = i === 0 ? sx : sx + (segW - 2) - wpx;
        g.fillStyle(fill >= 1 ? 0xffd60a : 0xf77f00, 1).fillRect(fx, METER_Y, wpx, METER_H);
      }
      this.meterText[i]!.setText(`${stocks}`);

      // 连段计数
      const cs = this.comboShow[i]!;
      const t = this.combo[i]!;
      if (cs.ttl > 0 && cs.hits >= 2) {
        t.setText(`${cs.hits} HITS\n${cs.dmg}`).setVisible(true).setAlpha(Math.min(1, cs.ttl / 20));
      } else {
        t.setVisible(false);
      }
    }

    // 计时器
    this.timerText.setText(w.timer < 0 ? '∞' : String(Math.ceil(w.timer / LOGIC_FPS)));
    this.roundText.setText(`ROUND ${w.round}`);

    // 阶段横幅
    switch (w.phase) {
      case 'intro':
        this.showBanner(w.phaseFrame < 40 ? `ROUND ${w.round}` : 'READY', '');
        break;
      case 'fight':
        if (w.phaseFrame < 40) this.showBanner('FIGHT!', '');
        else this.hideBanner();
        break;
      case 'round_end': {
        const byTime = w.timer === 0;
        const title = byTime ? 'TIME OVER' : 'K.O.';
        const sub = w.roundWinner === null ? 'DRAW' : `P${w.roundWinner + 1} WINS ROUND ${w.round}`;
        this.showBanner(title, sub);
        break;
      }
      case 'match_end': {
        const winner = w.wins[0]! > w.wins[1]! ? 1 : 2;
        this.showBanner(`P${winner} WINS`, 'Enter / NumEnter to restart');
        break;
      }
    }
  }

  private showBanner(title: string, sub: string): void {
    this.banner.setText(title).setVisible(true);
    this.hint.setText(sub).setVisible(sub.length > 0);
  }

  private hideBanner(): void {
    this.banner.setVisible(false);
    this.hint.setVisible(false);
  }

  reset(): void {
    this.lag = [1, 1];
  }
}
