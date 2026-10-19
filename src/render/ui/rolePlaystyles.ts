import type { ControlMode, Facing, FighterDef } from '@core/index';
import { keyLabel, type KeyBinding } from '@input/keymap';
import { moveCommand } from './moveListData';

export interface RoleChoice { moveId: string; use: string }
export interface RolePlaystyle { win: string; weakness: string; choices: readonly [RoleChoice, RoleChoice, RoleChoice] }

/** One source for selection cards and tactical practice; does not modify fighter data. */
export const ROLE_PLAYSTYLES: Readonly<Record<string, RolePlaystyle>> = {
  luffy: { win: '伸长拳试探，再接近连续进攻', weakness: '长招打空，回收时容易挨打', choices: [
    { moveId: 'st_c', use: '拳尖试探' }, { moveId: 'sp_rocket', use: '跨距接近' }, { moveId: 'sp_balloon', use: '看弹反射' },
  ] },
  akainu: { win: '稳步推进，用重拳和抓取施压', weakness: '移动慢，重招打空要付代价', choices: [
    { moveId: 'sp_inugami', use: '拦接近路线' }, { moveId: 'sp_daifunka', use: '正面重击' }, { moveId: 'sp_meigou', use: '近处抓取' },
  ] },
  labubu: { win: '先贴近，再用连拍和抱腿捣蛋', weakness: '手短，接近被猜到就会受阻', choices: [
    { moveId: 'sp_pounce_rush', use: '短扑进身' }, { moveId: 'sp_prank_flurry', use: '贴身连拍' }, { moveId: 'sp_leg_flip', use: '抓防守者' },
  ] },
  twinkle: { win: '用星弹引路，把对手带向落星', weakness: '布置要时间，被贴近会吃紧', choices: [
    { moveId: 'sp_tiny_star', use: '直线试探' }, { moveId: 'sp_falling_star', use: '预判落点' }, { moveId: 'sp_starlight_push', use: '推开近敌' },
  ] },
  aokiji: { win: '预判通路，用冰脊和上挑拦截', weakness: '猜错位置，贴身后承受压力', choices: [
    { moveId: 'sp_ice_lance', use: '直线牵制' }, { moveId: 'sp_ice_spike', use: '拦地面通路' }, { moveId: 'sp_ice_uplift', use: '截住跳入' },
  ] },
  shanks: { win: '站在刀距外诱空，踏步抓收招', weakness: '刺斩被防或打空，收招明显', choices: [
    { moveId: 'st_c', use: '刀距试探' }, { moveId: 'sp_step_thrust', use: '抓住收招' }, { moveId: 'sp_rising_guard', use: '截住跳入' },
  ] },
};

export function roleChoiceCommand(def: FighterDef, moveId: string, bind: KeyBinding, mode: ControlMode, facing: Facing): string {
  const move = def.moves.find(candidate => candidate.id === moveId);
  if (!move) return '招式未配置';
  const slot = def.skillSlots?.indexOf(moveId) ?? -1;
  if (mode === 'simple' && slot >= 0) {
    const value = bind[`Skill${slot + 1}` as keyof KeyBinding];
    return value ? keyLabel(value) : '未绑定（设置中绑定）';
  }
  return moveCommand(move, bind, facing === 1, 'classic');
}

export function roleChoiceLines(def: FighterDef, bind: KeyBinding, mode: ControlMode, facing: Facing): string[] {
  return (ROLE_PLAYSTYLES[def.id]?.choices ?? []).map(choice => {
    const move = def.moves.find(candidate => candidate.id === choice.moveId);
    return `${roleChoiceCommand(def, choice.moveId, bind, mode, facing)} ${move?.name ?? choice.moveId} · ${choice.use}`;
  });
}
