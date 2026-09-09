import { Btn, K, P, Rng, SUBPIXEL, type FightSim, type FighterState, type PlayerIndex } from '@core/index';
import { DIFFICULTY, type AiAction, type AiOption, type AiProfile, type Btn4, type Difficulty } from './types';

const BTN: Record<Btn4, number> = { A: Btn.A, B: Btn.B, C: Btn.C, D: Btn.D };
const NOTHING_TO_DO: readonly number[] = [];

/**
 * CPU 对手。每帧 input(sim) 返回一名玩家的输入位图。
 * - 只读世界状态，只输出输入，搓招通过多帧脚本队列完成（AGENTS.md：AI 不直接改 core）
 * - 可种子随机，同一 seed 与同一对局输入 → 同一行为（保证可复现测试）
 * - 难度只改变"人的缺陷"参数：反应延迟、防御率、搓招成功率、连段意愿
 */
export class Cpu {
  private readonly rng: Rng;
  private readonly params;
  /** 待发送的输入脚本（每帧一个位图） */
  private script: number[] = [];
  /** 持续按住（防御 / 行走 / 奔跑） */
  private hold: { bits: number; frames: number } | null = null;
  /** 距下一次决策的帧数 */
  private cooldown = 0;
  /** 上一帧对手的状态，用于检测"刚开始出招" */
  private lastOppMove: string | null = null;
  private techArmed = false;

  constructor(
    private readonly player: PlayerIndex,
    private readonly profile: AiProfile,
    readonly difficulty: Difficulty = 'normal',
    seed = 1,
  ) {
    this.rng = new Rng(seed);
    this.params = DIFFICULTY[difficulty];
  }

  input(sim: FightSim): number {
    const w = sim.state;
    if (w.phase !== 'fight') return 0;
    const me = w.fighters[this.player];
    const opp = w.fighters[this.player === 0 ? 1 : 0];

    // 被投：按拆投概率立即按 C
    if (me.state === 'thrown') {
      if (!this.techArmed) {
        this.techArmed = true;
        return this.roll(this.params.techChance) ? Btn.C : 0;
      }
      return 0;
    }
    this.techArmed = false;

    // 受身：软倒落地帧按住攻击键（模拟：在空中受击下落时就按着）
    if (me.state === 'hit_air' && me.vy > 0 && !me.hardKnockdown) return this.roll(this.params.comboWill) ? Btn.A : 0;

    // 每帧跟踪对手是否"刚起手"
    const oppMoveId = opp.state === 'attack' ? (sim.move(opp)?.id ?? null) : null;
    const oppStarted = oppMoveId !== null && oppMoveId !== this.lastOppMove;
    this.lastOppMove = oppMoveId;

    // 防御反应：对手刚起手且能打到我 → 中断自己尚未开始的行动改为防御（人也会这么做）
    if (oppStarted && this.actionable(me) && this.isThreat(sim, opp) && this.roll(this.params.blockChance)) {
      this.script = [];
      const m = sim.move(opp);
      const low = m?.guard === 'low' || (m?.guard !== 'high' && this.roll(50));
      this.enqueue({ kind: 'block', frames: 18, low }, me, opp);
      this.cooldown = this.params.reaction;
      return this.dequeue();
    }

    // 脚本优先
    if (this.script.length) return this.script.shift()!;
    if (this.hold) {
      if (--this.hold.frames <= 0) this.hold = null;
      else return this.hold.bits;
    }

    // 不可操作状态：什么都不按，但把防御方向按住以便硬直结束时能挡
    if (!this.actionable(me)) {
      return this.isThreat(sim, opp) && this.roll(this.params.blockChance) ? this.blockBits(me, sim, opp) : 0;
    }

    if (this.cooldown > 0) {
      this.cooldown--;
      return 0;
    }
    this.cooldown = this.params.reaction;

    const action = this.decide(sim, me, opp);
    if (action) this.enqueue(action, me, opp);
    return this.dequeue();
  }

  /** 取脚本首帧；无脚本则取持续按住的位图 */
  private dequeue(): number {
    if (this.script.length) return this.script.shift()!;
    const h: { bits: number; frames: number } | null = this.hold;
    return h ? h.bits : 0;
  }

  // ---------- 决策 ----------

  private decide(sim: FightSim, me: FighterState, opp: FighterState): AiAction | null {
    const dist = Math.abs(me.x - opp.x) / SUBPIXEL;

    // 1. 连段：对手在受击 / 防御硬直中，且我刚打完一招
    const inStun = opp.state === 'hit_stand' || opp.state === 'hit_crouch' || opp.state === 'hit_air' || opp.state === 'block_stand' || opp.state === 'block_crouch';
    if (inStun && me.state === 'attack' && me.hasHit && this.roll(this.params.comboWill)) {
      const myMove = sim.move(me);
      const group = this.profile.followups.find((f) => f.from.includes('*') || (myMove && f.from.includes(myMove.id)));
      if (group) {
        const a = this.pick(group.options, me);
        if (a) return a;
      }
    }

    // 2. 对手出招中（起手那一帧已在 input() 里处理）：距离内继续防御
    if (opp.state === 'attack' && this.isThreat(sim, opp) && this.roll(this.params.blockChance)) {
      const g = sim.move(opp)?.guard;
      return { kind: 'block', frames: 12, low: g === 'low' || (g !== 'high' && this.roll(50)) };
    }

    // 3. 飞行道具来袭
    const incoming = sim.state.projectiles.find((p) => p.owner !== this.player && Math.sign(p.vx) === Math.sign(me.x - p.x) && Math.abs(p.x - me.x) / SUBPIXEL < 220);
    if (incoming) {
      const a = this.pick(this.profile.projectileAnswer, me);
      if (a) return a;
    }

    // 4. 对空
    if (opp.airborne && dist < 120 && opp.y < -20 * SUBPIXEL) {
      const a = this.pick(this.profile.antiAir, me);
      if (a) return a;
    }

    // 5. 起身压制
    if (opp.state === 'knockdown' || opp.state === 'getup') {
      const a = this.pick(this.profile.okizeme, me);
      if (a) return a;
    }

    // 6. 中立：按距离分区；非进攻回合随机后退 / 等待
    if (!this.roll(this.params.aggression)) {
      return this.roll(50) ? { kind: 'wait', frames: 6 } : { kind: 'walk', dir: dist < this.profile.closeRange ? -1 : 1, frames: 8 };
    }
    const zone = dist < this.profile.closeRange ? this.profile.close : dist < this.profile.midRange ? this.profile.mid : this.profile.far;
    return this.pick(zone, me);
  }

  /** 对手出招的攻击框是否可能打到我（粗略：招式最大水平延伸 + 距离） */
  private isThreat(sim: FightSim, opp: FightSim['state']['fighters'][number]): boolean {
    if (opp.state !== 'attack') return false;
    const m = sim.move(opp);
    if (!m) return false;
    let reach = 0;
    for (const f of m.frames) for (const hb of f.hitboxes ?? []) reach = Math.max(reach, hb[0] + hb[2]);
    const me = sim.state.fighters[this.player];
    return Math.abs(me.x - opp.x) / SUBPIXEL < reach + 30;
  }

  private actionable(me: FighterState): boolean {
    return me.state === 'idle' || me.state === 'walk_fwd' || me.state === 'walk_back' || me.state === 'crouch' || me.state === 'dash';
  }

  // ---------- 行动 → 输入脚本 ----------

  private enqueue(a: AiAction, me: FighterState, opp: FighterState): void {
    const F = me.facing === 1 ? Btn.Right : Btn.Left;
    const B = me.facing === 1 ? Btn.Left : Btn.Right;
    const D = Btn.Down;
    switch (a.kind) {
      case 'walk':
        this.hold = { bits: a.dir === 1 ? F : B, frames: a.frames };
        break;
      case 'run':
        this.script = [F, 0, F];
        this.hold = { bits: F, frames: a.frames };
        break;
      case 'backdash':
        this.script = [B, 0, B, 0];
        break;
      case 'jump': {
        const dir = a.dir === 1 ? F : a.dir === -1 ? B : 0;
        const s: number[] = [Btn.Up | dir, Btn.Up | dir, Btn.Up | dir, Btn.Up | dir, 0];
        if (a.attack) {
          for (let i = 0; i < (a.delay ?? 12); i++) s.push(0);
          s.push(BTN[a.attack], 0);
        }
        this.script = s;
        break;
      }
      case 'normal': {
        const dir = a.forward ? F : 0;
        const stance = a.stance === 'crouch' ? D : 0;
        this.script = [stance | dir | BTN[a.button], stance | dir, 0];
        break;
      }
      case 'throw':
        this.script = [F | Btn.C, F, 0];
        break;
      case 'special':
        this.script = this.motionScript(a.motion, a.button === 'P' ? P : K, F, B, D);
        break;
      case 'block':
        this.hold = { bits: a.low ? B | D : B, frames: a.frames };
        break;
      case 'roll':
        this.script = [(a.dir === 1 ? F : B) | Btn.A | Btn.B, 0];
        break;
      case 'wait':
        this.hold = { bits: 0, frames: a.frames };
        break;
    }
    void opp;
  }

  /** 搓招脚本；按成功率决定是否"搓错"（退化成按下按键 → 普通技） */
  private motionScript(motion: string, buttons: number, F: number, B: number, D: number): number[] {
    const btn = buttons === P ? Btn.C : Btn.D; // 用重版
    if (!this.roll(this.params.motionSuccess)) return [btn, 0];
    switch (motion) {
      case '236':
        return [D, D | F, F | btn, 0];
      case '214':
        return [D, D | B, B | btn, 0];
      case '623':
        return [F, 0, D, D | F, D | F | btn, 0];
      case '22':
        return [D, 0, D | btn, 0];
      case '236236':
        return [D, D | F, F, 0, D, D | F, F | btn, 0];
      case '214214':
        return [D, D | B, B, 0, D, D | B, B | btn, 0];
      default:
        return [btn, 0];
    }
  }

  private blockBits(me: FighterState, sim: FightSim, opp: FighterState): number {
    const B = me.facing === 1 ? Btn.Left : Btn.Right;
    const g = sim.move(opp)?.guard;
    return g === 'high' ? B : B | Btn.Down;
  }

  // ---------- 随机 ----------

  private roll(percent: number): boolean {
    return this.rng.nextInt(100) < percent;
  }

  /** 加权随机；过滤掉气不够的选项 */
  private pick(options: AiOption[], me: FighterState): AiAction | null {
    const ok = options.filter((o) => !(o.action.kind === 'special' && (o.action.minMeter ?? 0) > me.meter));
    const total = ok.reduce((n, o) => n + o.weight, 0);
    if (total <= 0) return null;
    let r = this.rng.nextInt(total);
    for (const o of ok) {
      r -= o.weight;
      if (r < 0) return o.action;
    }
    return ok[ok.length - 1]?.action ?? null;
  }

  /** 供调试面板显示 */
  get pending(): readonly number[] {
    return this.script.length ? this.script : NOTHING_TO_DO;
  }
}
