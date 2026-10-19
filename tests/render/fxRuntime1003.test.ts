import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { FightSim, firstActiveFrame, SUBPIXEL, type HitEvent, type ProjectileState } from '../../src/core';
import { akainuDef, luffyDef } from '../../src/characters';
import { SkillEffects } from '../../src/render/fx/SkillEffects';
import { projectileAnimationAge } from '../../src/render/fx/movePresentation';
import { fxRuntimeBase, hasPresentationFrame, loadedPresentationReferences, PRESENTATION_FX_ASSETS, resolvePresentationFrame, sampleFxFrame,
  validateFxRuntime, validateFxRuntimeAtlas, type FxRuntimeManifest, type PresentationFxAssets } from '../../src/render/fx/fxRuntime';

// Contract and renderer mechanics only. No fixture is adopted artwork or live visual acceptance.
const runtime = (id = 'luffy'): FxRuntimeManifest => ({
  schemaVersion: 1, characterId: id, manifestSha256: 'a'.repeat(64),
  pages: [{ id: 'p0', image: 'atlas.png', data: 'atlas.json', width: 64, height: 64 },
    { id: 'p1', image: 'atlas-p1.png', data: 'atlas-p1.json', width: 64, height: 64 }],
  framePages: { body_0: 'p0', body_1: 'p1', impact_0: 'p0', impact_1: 'p1' },
  anims: {
    rubber_fist: { frames: ['body_0', 'body_1'], ticks: [2, 3], loop: true },
    dog: { frames: ['body_0', 'body_1'], ticks: [2, 3], loop: true },
    shockwave: { frames: ['impact_0', 'impact_1'], ticks: [2, 14], loop: false },
  },
});

class ImageRecord {
  key = ''; frame = ''; visible = true; x = 0; y = 0; width = 0; height = 0; tint: number | null = null;
  setTexture(key: string, frame: string) { this.key = key; this.frame = frame; return this; }
  setVisible(visible: boolean) { this.visible = visible; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setOrigin(_x: number, _y: number) { return this; }
  setDisplaySize(width: number, height: number) { this.width = width; this.height = height; return this; }
  setFlipX(_flip: boolean) { return this; }
  setAlpha(_alpha: number) { return this; }
  setDepth(_depth: number) { return this; }
  clearTint() { this.tint = null; return this; }
  setTint(tint: number) { this.tint = tint; return this; }
}

function renderer(id = 'luffy') {
  const contract = runtime(id), assets: PresentationFxAssets = { [`fx-${id}`]: {
    characterId: id, runtime: contract, frameTextures: { body_0: 'p0-key', body_1: 'p1-key', impact_0: 'p0-key', impact_1: 'p1-key' },
    requestIdentity: 'fixture', deliveryVersion: 'fixture',
  } };
  const images: ImageRecord[] = [], missing = new Set<string>();
  const scene = {
    registry: { get: (key: string) => key === PRESENTATION_FX_ASSETS ? assets : undefined },
    textures: { exists: (key: string) => !missing.has(key), get: (_key: string) => ({ has: (frame: string) => !missing.has(frame) }) },
    add: { image: () => { const image = new ImageRecord(); images.push(image); return image; } },
  } as unknown as Phaser.Scene;
  const effects = new SkillEffects(scene);
  return { scene, effects, images, missing, contract };
}

describe('explicit multi-page FX contract', () => {
  it('validates the declared namespace, complete page map and positive actual-frame timing', () => {
    expect(validateFxRuntime(runtime(), 'luffy')).toEqual([]);
    expect(fxRuntimeBase('fx-luffy', 'assets/fx/luffy/fx-runtime.json')).toBe('assets/fx/luffy/');
    expect(fxRuntimeBase('fx-luffy', 'assets/fx/akainu/fx-runtime.json')).toBeNull();
    const bad = runtime(); bad.pages[1]!.image = '../secret.png'; bad.framePages.body_1 = 'absent';
    bad.anims.dog!.ticks[0] = 0; bad.anims.dog!.frames[1] = 'not_created';
    expect(validateFxRuntime(bad, 'luffy').join(' ')).toMatch(/路径.*帧归属.*实际帧.*正整数/);
    expect(validateFxRuntime(bad, 'akainu')[0]).toContain('身份');
  });

  it('rejects undeclared, missing, out-of-bounds and foreign author-page frames', () => {
    const contract = runtime(), page = contract.pages[0]!;
    const atlas = { meta: { image: page.image, size: { w: 64, h: 64 }, manifestSha256: contract.manifestSha256 },
      frames: { body_0: { frame: { x: 0, y: 0, w: 16, h: 16 } }, impact_0: { frame: { x: 20, y: 0, w: 16, h: 16 } } } };
    expect(validateFxRuntimeAtlas(contract, page, atlas, 64, 64)).toEqual([]);
    atlas.frames.body_0.frame.w = 100;
    atlas.meta.manifestSha256 = 'b'.repeat(64);
    delete (atlas.frames as Record<string, unknown>).impact_0;
    (atlas.frames as Record<string, unknown>).body_1 = { frame: { x: 0, y: 0, w: 16, h: 16 } };
    const issues = validateFxRuntimeAtlas(contract, page, atlas, 64, 64).join(' ');
    expect(issues).toContain('SHA256'); expect(issues).toContain('越界'); expect(issues).toContain('其他页'); expect(issues).toContain('缺少实际帧');
  });

  it('samples only supplied integer ages, wraps loops and holds nonloop endings', () => {
    const contract = runtime();
    expect([0, 1, 2, 4, 5, 7].map(age => sampleFxFrame(contract, 'dog', age))).toEqual(['body_0', 'body_0', 'body_1', 'body_1', 'body_0', 'body_1']);
    expect(sampleFxFrame(contract, 'shockwave', 100)).toBe('impact_1');
    expect(sampleFxFrame(contract, 'dog', null)).toBeNull(); expect(sampleFxFrame(contract, 'dog', 0.5)).toBeNull();
    expect(sampleFxFrame(contract, 'absent', 0)).toBeNull();
  });

  it('requires every animation page and resolves its actual texture, while legacy frames stay unchanged', () => {
    const current = renderer();
    expect(hasPresentationFrame(current.scene, 'fx-luffy', 'rubber_fist')).toBe(true);
    expect(resolvePresentationFrame(current.scene, 'fx-luffy', 'rubber_fist', 2)).toEqual({ key: 'p1-key', frame: 'body_1' });
    current.missing.add('body_1');
    expect(hasPresentationFrame(current.scene, 'fx-luffy', 'rubber_fist')).toBe(false);
    expect(resolvePresentationFrame(current.scene, 'fx-luffy', 'rubber_fist', 0)).toBeNull();
    expect(resolvePresentationFrame(current.scene, 'fx-akainu', 'flame', 8)).toEqual({ key: 'fx-akainu', frame: 'flame' });
  });

  it('does not report missing pages or their dependent animations as loaded evidence', () => {
    const current = renderer();
    expect(loadedPresentationReferences(current.scene, 'fx-luffy')).toContain('rubber_fist');
    current.missing.add('p1-key');
    expect(loadedPresentationReferences(current.scene, 'fx-luffy')).toEqual(['body_0', 'impact_0']);
  });
});

describe('multi-frame effects follow logic rather than draw calls', () => {
  it('plays a hit clip once with logic-step age and does not mutate the world', () => {
    const { effects, images } = renderer(), sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0 });
    const before = JSON.stringify(sim.state);
    const hit: HitEvent = { frame: 0, kind: 'hit', attacker: 0, defender: 1, moveId: 'sp_rifle', damage: 34, counter: false, comboHits: 1, comboDamage: 34, projectile: false, x: 0, y: 0 };
    effects.contact(hit, sim.state);
    const draw = () => { effects.begin(); effects.finish(value => value, value => value); return images.filter(image => image.visible); };
    expect(draw().map(image => image.frame)).toEqual(['impact_0']);
    for (let render = 0; render < 6; render++) expect(draw().map(image => image.frame)).toEqual(['impact_0']);
    effects.tick(); effects.tick(); expect(draw().map(image => image.frame)).toEqual(['impact_1']);
    for (let logic = 0; logic < 13; logic++) effects.tick();
    expect(draw()).toHaveLength(1); // Full explicit 16-tick clip outlives the old 10-tick burst.
    effects.tick(); expect(draw()).toHaveLength(0);
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('reads projectile TTL including reflect and ignores render repetitions or burst ticks', () => {
    const { effects, images } = renderer('akainu'), sim = new FightSim({ p1: akainuDef, p2: luffyDef, introFrames: 0 });
    const move = akainuDef.moves.find(item => item.id === 'sp_inugami')!, spawn = move.projectiles![0]!;
    const p: ProjectileState = { id: 1, owner: 0, kind: spawn.kind, moveId: move.id, moveInstance: 1, x: 0, y: 0, vx: 0, vy: 0, gravity: 0,
      facing: 1, ttl: spawn.ttl - 1, box: spawn.box, durability: 1, damage: move.damage, guard: move.guard, hitstun: move.hitstun,
      blockstun: move.blockstun, hitstop: move.hitstop, knockback: move.knockback, burn: null, dieOnGround: false, reflected: false };
    const draw = () => { effects.begin(); expect(effects.projectile(p, sim, value => value, value => value)).toBe(true); effects.finish(value => value, value => value); return images[0]!; };
    expect(draw().frame).toBe('body_0'); effects.tick(); effects.tick(); expect(draw().frame).toBe('body_0');
    p.ttl -= 2; p.owner = 1; p.facing = -1; p.reflected = true;
    expect(projectileAnimationAge(p, akainuDef.moves)).toBe(2);
    expect(draw()).toMatchObject({ key: 'p1-key', frame: 'body_1', tint: 0x89dfff });
  });

  it('draws one body animation across real hitboxes and leaves simulation state intact', () => {
    const move = luffyDef.moves.find(item => item.id === 'sp_rifle')!;
    const def = { ...luffyDef, moves: luffyDef.moves.map(item => item.id === move.id ? { ...item,
      frames: item.frames.map(frame => frame.hitboxes?.length ? { ...frame, hitboxes: [...frame.hitboxes, [30, -30, 20, 10] as const] } : frame) } : item) };
    const { effects, images } = renderer(), sim = new FightSim({ p1: def, p2: akainuDef, introFrames: 0 });
    const f = sim.state.fighters[0]; f.state = 'attack'; f.moveId = move.id; f.stateFrame = firstActiveFrame(move);
    const before = JSON.stringify(sim.state);
    effects.begin(); effects.fighters(sim, value => value / SUBPIXEL, value => value / SUBPIXEL); effects.finish(value => value, value => value);
    expect(images.filter(image => image.visible)).toHaveLength(1);
    expect(images[0]!.frame).toBe(sampleFxFrame(runtime(), 'rubber_fist', f.stateFrame));
    expect(JSON.stringify(sim.state)).toBe(before);
  });
});
