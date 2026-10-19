import { LOGIC_FPS, type AwakeningReason, type FightSim, type PlayerIndex } from '@core/index';

export const AWAKENING_REASON: Record<AwakeningReason, string> = {
  ready: '可觉醒 · 消耗3格气', disabled: '此模式未开放五档', character: '仅路飞可觉醒',
  phase: '等待开战', air: '落地后觉醒', recovery: '等待动作结束', form: '强化期间不可觉醒',
  fatigue: '疲劳期间不可觉醒', meter: '需要3格气',
};
const seconds = (frames: number) => (Math.ceil(Math.max(0, frames) / 6) / 10).toFixed(1);

/** Reads actual sim state; no UI timer can extend or restart the form. */
export function gear5Status(sim: FightSim, player: PlayerIndex, binding: string): { text: string; color: string } | null {
  const fighter = sim.state.fighters[player];
  if (fighter.def.id !== 'luffy') return null;
  const reason = sim.awakeningAvailability(player);
  let text: string;
  if (fighter.form === 'gear5') text = fighter.formExitPending
    ? '五档 · 收势中，结束当前动作后退出'
    : `五档 ${seconds(fighter.formFrames)}秒 · 二档不可用`;
  else if (fighter.awakeningStarted !== null) text = '五档觉醒中 · 可被打断，费用不退';
  else if (fighter.fatigueFrames > 0 && fighter.fatigueSource === 'gear5') text = `五档疲劳 ${seconds(fighter.fatigueFrames)}秒 · 可攻防`;
  else text = `觉醒[${binding}] · ${AWAKENING_REASON[reason]}`;
  const request = sim.awakeningFeedback[player];
  if (request && request.reason !== 'ready' && sim.state.frame - request.frame < LOGIC_FPS * 1.5) text += ` · 上次请求：${AWAKENING_REASON[request.reason]}`;
  return { text, color: fighter.form === 'gear5' ? '#f5eeff' : fighter.fatigueSource === 'gear5' ? '#ffd18b' : reason === 'ready' ? '#a0dfbd' : '#b8cbd4' };
}
