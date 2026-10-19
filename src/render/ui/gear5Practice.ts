import { MAX_METER, px, type FightSim } from '@core/index';

export const GEAR5_CORE_MOVES = ['g5_elastic_rush', 'g5_bounce_slam', 'g5_rising_whip'] as const;
export type Gear5PracticeStage = 'awaken' | 'moves' | 'expiry' | 'fatigue' | 'complete' | 'retry';

/** Optional training setup is explicit; every success afterward comes from real simulation. */
export class Gear5PracticeSession {
  stage: Gear5PracticeStage = 'awaken';
  readonly hitMoves = new Set<string>();
  private startedAt = 0;
  private sawForm = false;
  private sawFatigue = false;
  reset(sim: FightSim): void {
    if (sim.state.fighters[0].def.id !== 'luffy' || sim.awakeningAvailability(0) === 'disabled') return;
    sim.resetRound();
    sim.training = { infiniteHp: true, infiniteMeter: false };
    const [player, opponent] = sim.state.fighters;
    player.meter = MAX_METER;
    opponent.meter = 0;
    player.x = px(-45); opponent.x = px(45);
    sim.clearInputs();
    this.stage = 'awaken'; this.hitMoves.clear();
    this.startedAt = sim.state.frame; this.sawForm = false; this.sawFatigue = false;
  }
  observe(sim: FightSim): void {
    if (this.stage === 'complete' || this.stage === 'retry') return;
    const player = sim.state.fighters[0];
    if (sim.state.phase !== 'fight') { this.stage = 'retry'; return; }
    if (player.form === 'gear5') {
      this.sawForm = true;
      for (const hit of sim.hits) if (hit.frame >= this.startedAt && hit.attacker === 0 && hit.kind === 'hit' && GEAR5_CORE_MOVES.includes(hit.moveId as typeof GEAR5_CORE_MOVES[number])) this.hitMoves.add(hit.moveId);
      this.stage = this.hitMoves.size === 3 ? 'expiry' : 'moves';
    } else if (player.fatigueSource === 'gear5' && player.fatigueFrames > 0) {
      this.sawFatigue = true; this.stage = this.hitMoves.size === 3 ? 'fatigue' : 'retry';
    } else if (this.sawForm && this.sawFatigue && player.fatigueFrames === 0) this.stage = 'complete';
    else if (!this.sawForm) this.stage = 'awaken';
  }
  message(awakening: string, moves: readonly string[]): string {
    switch (this.stage) {
      case 'awaken': return `有3格气，落地且动作结束后按 ${awakening} 觉醒。启动可被打断，费用不退。`;
      case 'moves': return `靠近木桩，用 ${moves.join(' / ')} 各实际命中一次（${this.hitMoves.size}/3）；空挥不算。`;
      case 'expiry': return '三招命中完成。停止续招，观察12秒倒计时到期；当前动作会先收势。';
      case 'fatigue': return '已退出五档：3秒疲劳仍可攻防，移速降低、二档和觉醒不可用。等待疲劳结束。';
      case 'complete': return '已完成：合法觉醒 → 三招真实命中 → 到期收势 → 疲劳结束。可继续自由练习或退出。';
      case 'retry': return '本轮未完成三招或战斗已结束。F6按原训练设置重试；也可退出后自由练习。';
    }
  }
}
