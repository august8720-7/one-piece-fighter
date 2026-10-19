import { Btn, px, SUBPIXEL, totalFrames, type FightSim, type PlayerIndex } from '@core/index';

export type PracticeScript = 'stand' | 'guard' | 'dog' | 'route' | 'hop' | 'thrust';
export interface RolePracticeDef {
  id: string; character: string; title: string; moveId: string; goal: string; failure: string;
  opponent: string; distance: number; script: PracticeScript; routeEnd?: number;
  result?: 'reflect' | 'entry' | 'grab' | 'flurry' | 'push' | 'air' | 'recovery' | 'route';
  entryDistance?: number;
}

export const ROLE_PRACTICES: readonly RolePracticeDef[] = [
  { id: 'luffy.long_punch', character: 'luffy', title: '伸长拳试探', moveId: 'st_c', goal: '松开方向，用伸长重拳打中木桩。', failure: '还在拳尖外，稍靠近；不要按前＋重拳。', opponent: 'akainu', distance: 110, script: 'stand' },
  { id: 'luffy.rocket_entry', character: 'luffy', title: '火箭接近', moveId: 'sp_rocket', goal: '从起始线直接出火箭，跨过距离打中。', failure: '从起始线直接出火箭，不要先走到身边。', opponent: 'akainu', distance: 150, script: 'stand', result: 'entry', entryDistance: 40 },
  { id: 'luffy.balloon_reflect', character: 'luffy', title: '看弹反射', moveId: 'sp_balloon', goal: '木桩将发一枚犬弹；等弹接近，用气球反射。', failure: '没反射到：等犬弹接近，再开气球。', opponent: 'akainu', distance: 240, script: 'dog', result: 'reflect' },
  { id: 'akainu.dog_lane', character: 'akainu', title: '犬弹拦路', moveId: 'sp_inugami', goal: '木桩开始走来时，用犬弹打中行进中的他。', failure: '在他走来的路上放犬弹，不要等他停下。', opponent: 'luffy', distance: 200, script: 'route', routeEnd: 70, result: 'route' },
  { id: 'akainu.heavy_range', character: 'akainu', title: '正面重击', moveId: 'sp_daifunka', goal: '在重拳可达的距离，用大喷火打中一次。', failure: '大喷火需要启动；打空就调整距离再出。', opponent: 'luffy', distance: 140, script: 'stand' },
  { id: 'akainu.close_grab', character: 'akainu', title: '走近抓取', moveId: 'sp_meigou', goal: '走近蹲防木桩，用冥狗抓住并完整释放。', failure: '先够到对手，再出冥狗；只出抓取动作不算。', opponent: 'luffy', distance: 90, script: 'guard', result: 'grab' },
  { id: 'labubu.pounce_entry', character: 'labubu', title: '短扑进身', moveId: 'sp_pounce_rush', goal: '从起始线直接短扑，让扑扑突袭带你接近。', failure: '短扑距离有限，从起始线直接扑过去。', opponent: 'akainu', distance: 80, script: 'stand', result: 'entry', entryDistance: 20 },
  { id: 'labubu.flurry_contact', character: 'labubu', title: '贴身连拍', moveId: 'sp_prank_flurry', goal: '贴近出一次连拍，让同一次招式至少两拍打中。', failure: '再贴近一点；一次连拍要有两次真实接触。', opponent: 'luffy', distance: 34, script: 'stand', result: 'flurry' },
  { id: 'labubu.leg_flip_guard', character: 'labubu', title: '抱腿破防', moveId: 'sp_leg_flip', goal: '走近蹲防木桩，用抱腿翻摔抓住并释放。', failure: '抱腿先要够到对方，范围外只会抓空。', opponent: 'luffy', distance: 70, script: 'guard', result: 'grab' },
  { id: 'twinkle.star_probe', character: 'twinkle', title: '星弹试探', moveId: 'sp_tiny_star', goal: '用小星弹试探这条直线，等它真实打中。', failure: '太近会越过目标；让星弹飞到对方。', opponent: 'luffy', distance: 200, script: 'stand' },
  { id: 'twinkle.falling_intercept', character: 'twinkle', title: '提前安排落星', moveId: 'sp_falling_star', goal: '木桩朝落区走来时，提前放星星落下拦住他。', failure: '星星落在固定前方；提前出招，让他走进落区。', opponent: 'luffy', distance: 160, script: 'route', routeEnd: 60, result: 'route' },
  { id: 'twinkle.push_space', character: 'twinkle', title: '推开近敌', moveId: 'sp_starlight_push', goal: '用星光推推打中，然后停手，看距离拉开。', failure: '推中后停手，不用后退或第二招凑距离。', opponent: 'luffy', distance: 65, script: 'stand', result: 'push' },
  { id: 'aokiji.lance_lane', character: 'aokiji', title: '冰矛牵制', moveId: 'sp_ice_lance', goal: '让冰矛沿直线打中地面木桩。', failure: '对齐直线，让冰矛飞到对方。', opponent: 'luffy', distance: 180, script: 'stand' },
  { id: 'aokiji.spike_route', character: 'aokiji', title: '冰脊拦通路', moveId: 'sp_ice_spike', goal: '在木桩经过地面标记时，用固定冰脊拦住他。', failure: '冰脊只短暂出现；在他将经过那里时出招。', opponent: 'luffy', distance: 150, script: 'route', routeEnd: 70, result: 'route' },
  { id: 'aokiji.uplift_jump', character: 'aokiji', title: '上挑截跳', moveId: 'sp_ice_uplift', goal: '木桩将向前小跳；在他离地时用冰棘上挑打中。', failure: '等对方离地再截；地面打飞不算截跳。', opponent: 'luffy', distance: 75, script: 'hop', result: 'air' },
  { id: 'shanks.blade_spacing', character: 'shanks', title: '刀距试探', moveId: 'st_c', goal: '松开方向，用普通重拳键出单手横斩打中。', failure: '松开方向，在刀能碰到的距离按重拳。', opponent: 'luffy', distance: 70, script: 'stand' },
  { id: 'shanks.thrust_recovery', character: 'shanks', title: '诱空抓收招', moveId: 'sp_step_thrust', goal: '先让对手突刺打空，再在其收招时用突刺命中。', failure: '等他刺空就踏步；等他站稳后再打已经太晚。', opponent: 'shanks', distance: 170, script: 'thrust', result: 'recovery' },
  { id: 'shanks.rising_jump', character: 'shanks', title: '上斩截跳', moveId: 'sp_rising_guard', goal: '木桩将向前小跳；在他离地时用迎击上斩打中。', failure: '等对方离地，把上斩放在跳来的路上。', opponent: 'luffy', distance: 75, script: 'hop', result: 'air' },
];

export const practicesFor = (id: string): readonly RolePracticeDef[] => ROLE_PRACTICES.filter(practice => practice.character === id);
export const practiceById = (id: string | undefined): RolePracticeDef | undefined => ROLE_PRACTICES.find(practice => practice.id === id);

/** Save only whitelisted successful ids; never read or rewrite the basic tutorial keys. */
export class RolePracticeProgress {
  private completed = new Set<string>();
  persistent = true;
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined) {
    try {
      const parsed: unknown = JSON.parse(storage?.getItem('opf.roleTutorial.v1') ?? 'null');
      if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1 && 'completed' in parsed && parsed.completed && typeof parsed.completed === 'object') {
        for (const practice of ROLE_PRACTICES) {
          const list: unknown = Reflect.get(parsed.completed, practice.character);
          if (Array.isArray(list) && list.includes(practice.id)) this.completed.add(practice.id);
        }
      }
      this.persistent = !!storage;
    } catch { this.persistent = false; }
  }
  has(id: string): boolean { return this.completed.has(id); }
  record(id: string): void {
    if (!practiceById(id)) return;
    this.completed.add(id);
    const completed: Record<string, string[]> = {};
    for (const practice of ROLE_PRACTICES) if (this.completed.has(practice.id)) (completed[practice.character] ??= []).push(practice.id);
    try {
      if (!this.storage) throw new Error('No local storage');
      this.storage.setItem('opf.roleTutorial.v1', JSON.stringify({ version: 1, completed }));
      this.persistent = true;
    } catch { this.persistent = false; }
  }
}

let sessionProgress: RolePracticeProgress | undefined;
export function rolePracticeProgress(): RolePracticeProgress {
  if (!sessionProgress) {
    let storage: Storage | undefined;
    try { storage = globalThis.localStorage; } catch { /* Session progress remains available. */ }
    sessionProgress = new RolePracticeProgress(storage);
  }
  return sessionProgress;
}

const forward = (sim: FightSim, player: PlayerIndex) => sim.state.fighters[player].facing === 1 ? Btn.Right : Btn.Left;
const back = (sim: FightSim, player: PlayerIndex) => sim.state.fighters[player].facing === 1 ? Btn.Left : Btn.Right;
function recoveryStart(sim: FightSim, player: PlayerIndex, moveId: string): number {
  const move = sim.state.fighters[player].def.moves.find(candidate => candidate.id === moveId);
  let elapsed = 0, end = 0;
  for (const frame of move?.frames ?? []) { elapsed += frame.duration; if (frame.hitboxes?.length) end = elapsed; }
  return end;
}

export type PracticeStatus = 'ready' | 'running' | 'passed' | 'failed';
/** A small single-attempt observer. Dummy actions are exclusively legal input bits. */
export class RolePracticeSession {
  status: PracticeStatus = 'ready';
  message = '准备好后开始；可跳过或直接打一小局。';
  elapsed = 0;
  attempt = 0;
  private firstFrame = 0;
  private origin = 0;
  private facing: 1 | -1 = 1;
  private startGap = 0;
  private ownInstance = -1;
  private observedInstance = -1;
  private contactFrames = new Set<number>();
  private grabbed = false;
  private sawHop = false;
  private sawProjectile = false;
  private dummyInstance = -1;
  private dummyWhiffed = false;
  private routeDone = false;
  private p1Airborne = false;
  private entryMoved = false;
  private push: { gap: number; x: number; instance: number } | null = null;
  private anchoredProjectile = false;

  constructor(readonly practice: RolePracticeDef) {}
  get markerX(): number | null {
    const offset = this.practice.moveId === 'sp_falling_star' ? 92 : this.practice.moveId === 'sp_ice_spike' ? 90 : null;
    return offset === null ? null : this.origin + px(offset) * this.facing;
  }

  reset(sim: FightSim, mirrored = false): void {
    const [p1, p2] = sim.state.fighters;
    if (p1.def.id !== this.practice.character || p2.def.id !== this.practice.opponent) throw new Error('练习角色与已加载对手不符');
    sim.resetMatch();
    sim.training = { infiniteHp: true, infiniteMeter: false };
    const f = sim.state.fighters;
    this.facing = mirrored ? -1 : 1;
    f[0].x = px(-this.practice.distance / 2) * this.facing;
    f[1].x = px(this.practice.distance / 2) * this.facing;
    f[0].facing = this.facing; f[1].facing = this.facing === 1 ? -1 : 1;
    this.origin = f[0].x;
    this.startGap = Math.abs(f[1].x - f[0].x);
    this.firstFrame = sim.state.frame;
    this.status = 'ready'; this.message = '准备好后开始；可跳过或直接打一小局。';
    this.elapsed = 0; this.attempt++; this.ownInstance = -1; this.observedInstance = -1;
    this.contactFrames.clear(); this.grabbed = false; this.sawHop = false; this.sawProjectile = false;
    this.dummyInstance = -1; this.dummyWhiffed = false; this.routeDone = false;
    this.p1Airborne = false; this.entryMoved = false; this.push = null; this.anchoredProjectile = false;
  }
  start(): void { if (this.status === 'ready') { this.status = 'running'; this.message = this.practice.goal; } }
  private fail(message = this.practice.failure): void { this.status = 'failed'; this.message = message; }
  private pass(): void { this.status = 'passed'; this.message = '完成 ✓ 这是一次真实战术结果；可以重试、下一条或打一小局。'; }

  dummyInput(sim: FightSim): number {
    if (this.status !== 'running') return 0;
    const [p1, p2] = sim.state.fighters;
    this.p1Airborne ||= p1.airborne;
    if (this.practice.result === 'entry' && this.ownInstance < 0 && Math.abs(p1.x - this.origin) > px(3)) this.entryMoved = true;
    if (['hit_stand', 'hit_crouch', 'hit_air', 'thrown', 'ko'].includes(p2.state)) return 0;
    switch (this.practice.script) {
      case 'stand': return 0;
      case 'guard': return Btn.Down | back(sim, 1);
      case 'dog': {
        const sequence = [Btn.Down, Btn.Down | back(sim, 1), back(sim, 1) | Btn.A, 0];
        return sequence[this.elapsed - 30] ?? 0;
      }
      case 'route': {
        if (this.elapsed < 30 || this.routeDone) return 0;
        if ((p2.x - this.origin) * this.facing <= px(this.practice.routeEnd ?? 60)) { this.routeDone = true; return 0; }
        return forward(sim, 1);
      }
      case 'hop': return this.elapsed === 30 ? Btn.Up | forward(sim, 1) : 0;
      case 'thrust': {
        const sequence = [Btn.Down, Btn.Down | forward(sim, 1), forward(sim, 1) | Btn.B, 0];
        return sequence[this.elapsed - 30] ?? 0;
      }
    }
  }

  observe(sim: FightSim): void {
    if (this.status !== 'running') return;
    this.elapsed++;
    const [p1, p2] = sim.state.fighters, p = this.practice;
    const events = sim.hits.filter(event => event.frame >= this.firstFrame);
    if (p1.moveId === p.moveId && p1.moveInstance !== this.observedInstance) {
      this.observedInstance = p1.moveInstance;
      if (this.ownInstance < 0) this.ownInstance = p1.moveInstance;
      else if (p.result === 'flurry') { this.ownInstance = p1.moveInstance; this.contactFrames.clear(); }
    }
    if (p2.airborne) this.sawHop = true;
    if (p.script === 'thrust' && p2.moveId === 'sp_step_thrust') {
      this.dummyInstance = p2.moveInstance;
      if (p2.state === 'attack' && p2.stateFrame >= recoveryStart(sim, 1, 'sp_step_thrust')) this.dummyWhiffed = true;
    }
    if (p.result === 'recovery' && events.some(event => event.attacker === 1 && event.moveId === 'sp_step_thrust' && ['hit', 'block', 'armor', 'throw'].includes(event.kind))) {
      this.fail('这次对手碰到你了；站在线外，让突刺先打空。'); return;
    }
    if (p.result === 'reflect') {
      this.sawProjectile ||= sim.state.projectiles.some(projectile => projectile.moveId === 'sp_inugami');
      if (events.some(event => event.kind === 'reflect' && event.attacker === 0 && event.defender === 1 && event.projectile && event.moveId === 'sp_inugami') && p1.moveId === p.moveId) { this.pass(); return; }
      if (this.sawProjectile && sim.state.projectiles.length === 0) { this.fail(); return; }
    }
    if (p.result === 'route' && (p.moveId === 'sp_falling_star' || p.moveId === 'sp_ice_spike')) {
      const offset = p.moveId === 'sp_falling_star' ? 92 : 90;
      this.anchoredProjectile ||= sim.state.projectiles.some(projectile => projectile.owner === 0 && projectile.moveId === p.moveId && Math.abs(projectile.x - (p1.x + px(offset) * p1.facing)) <= SUBPIXEL);
      // A spike can contact and expire on its spawn tick; the real projectile
      // contact center still preserves its fixed world anchor in that case.
      this.anchoredProjectile ||= events.some(event => event.attacker === 0 && event.projectile && event.moveId === p.moveId && Math.abs(event.x - (p1.x + px(offset) * p1.facing)) <= SUBPIXEL);
    }
    for (const event of events) {
      if (event.attacker !== 0 || event.defender !== 1 || event.moveId !== p.moveId) continue;
      if (p.result === 'grab' && event.kind === 'throw' && p1.state === 'throw' && p2.state === 'thrown') { this.grabbed = true; this.ownInstance = p1.moveInstance; this.message = '抓住了，等他被真实释放。'; }
      if (event.kind !== 'hit' || event.damage <= 0) continue;
      if (p.result === 'reflect') continue;
      if (p.result === 'grab') { if (this.grabbed && this.ownInstance === p1.moveInstance) this.pass(); }
      else if (p.result === 'entry') {
        if (!event.projectile && !this.entryMoved && this.startGap - Math.abs(p2.x - p1.x) >= px(p.entryDistance ?? 0)) this.pass();
        else this.fail();
      } else if (p.result === 'flurry') {
        if (event.projectile) continue;
        this.contactFrames.add(event.frame);
        if (this.contactFrames.size >= 2 && p1.moveInstance === this.ownInstance) this.pass();
        else this.message = '第一拍命中；让这一次连拍继续接触。';
      } else if (p.result === 'push') {
        if (!event.projectile && !this.push) { this.push = { gap: Math.abs(p2.x - p1.x), x: p1.x, instance: p1.moveInstance }; this.message = '打中了，停手，看距离拉开。'; }
      } else if (p.result === 'air') {
        if (!event.projectile && event.defenderBefore?.airborne) this.pass();
        else this.fail('这次打在离地前或落地后；地面打飞不算截跳。');
      } else if (p.result === 'route') {
        if (event.projectile && event.defenderBefore?.state === 'walk_fwd' && !event.defenderBefore.airborne && (p.moveId === 'sp_inugami' || this.anchoredProjectile)) this.pass();
        else this.fail('打中了，但他已停下；让攻击拦住行进中的木桩。');
      } else if (p.result === 'recovery') {
        const before = event.defenderBefore, move = p2.def.moves.find(candidate => candidate.id === 'sp_step_thrust');
        if (!event.projectile && this.dummyWhiffed && this.dummyInstance === p2.moveInstance && before?.state === 'attack' && before.moveId === 'sp_step_thrust' && before.stateFrame >= recoveryStart(sim, 1, 'sp_step_thrust') && move && before.stateFrame < totalFrames(move)) this.pass();
        else this.fail(before?.state === 'attack' ? '这是抢先；先让对手刺空，再抓收招。' : '打中了，但他已站稳；下一次出手早一点。');
      } else {
        const wantsProjectile = p.moveId === 'sp_tiny_star' || p.moveId === 'sp_ice_lance';
        if (event.projectile === wantsProjectile && (!wantsProjectile || event.defenderBefore?.airborne === false) && !this.p1Airborne) this.pass();
      }
      if (this.status !== 'running') return;
    }
    if (this.push) {
      if (Math.abs(p1.x - this.push.x) > px(1) || p1.moveInstance !== this.push.instance || p1.airborne) { this.fail(); return; }
      const calm = [p1, p2].every(f => !f.airborne && f.hitstop === 0 && f.stun === 0 && ['idle', 'crouch'].includes(f.state));
      if (calm) { if (Math.abs(p2.x - p1.x) - this.push.gap >= px(24)) this.pass(); else this.fail('没有明显拉开距离；重试，并记录实际接触问题。'); }
    }
    if (this.status !== 'running') return;
    if (p.result === 'air' && this.sawHop && !p2.airborne && ['idle', 'landing'].includes(p2.state)) this.fail();
    else if (p.result === 'recovery' && this.dummyInstance >= 0 && p2.state !== 'attack' && p2.state !== 'prejump') this.fail();
    else if (p.result === 'flurry' && this.contactFrames.size > 0 && p1.moveId !== p.moveId) this.fail();
    else if (this.elapsed >= 600 || sim.state.phase !== 'fight') this.fail();
  }
}
