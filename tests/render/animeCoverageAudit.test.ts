import { describe, expect, it } from 'vitest';
import { inspectFrameSources, inspectPoseOriginality, inspectSourceUsage } from '../../scripts/checkAnimeCoverage';

describe('production anime coverage cannot be fabricated with renamed stills', () => {
  it('rejects idle pixels under attack and movement names, even with many duplicate entries', () => {
    expect(inspectPoseOriginality('st_c', ['idle', 'idle', 'idle'], ['idle'], true)).toHaveLength(2);
    expect(inspectPoseOriginality('walk_fwd', ['idle', 'idle'], ['idle'], false)).toHaveLength(2);
  });

  it('does not reject legitimate single-pose standing guard, crouching guard or grounded KO', () => {
    expect(inspectPoseOriginality('block_stand', ['guard'], ['idle'], false)).toEqual([]);
    expect(inspectPoseOriginality('block_crouch', ['low-guard'], ['idle'], false)).toEqual([]);
    expect(inspectPoseOriginality('ko', ['fallen'], ['idle'], false)).toEqual([]);
  });

  it('requires actual pixel changes for movement and attack without equating multi-pose coverage with visual quality', () => {
    expect(inspectPoseOriginality('dash', ['run'], ['idle'], false)).toHaveLength(1);
    expect(inspectPoseOriginality('st_a', ['windup', 'contact', 'return'], ['idle'], true)).toEqual([]);
    expect(inspectPoseOriginality('walk_back', ['step2', 'step1'], ['idle'], false)).toEqual([]);
    expect(inspectPoseOriginality('portrait', ['idle'], ['idle'], false)).toEqual([]);
  });
});

describe('source reuse reflects current mappings without promoting historical candidates', () => {
  it('reports newly mapped movement while keeping unused frames and old rejected crops separate', () => {
    const report = inspectSourceUsage({
      sources: { basics: { file: 'basics.png' }, repair: { file: 'repair.png' } },
      frames: { run_1: { source: 'basics' }, run_2: { source: 'basics' }, spare: { source: 'basics' }, guard: { source: 'repair' } },
      anims: { dash: { frames: ['run_1', 'run_2', 'run_1'] }, block_stand: { frames: ['guard'] } },
      referenceFrames_NOT_BUILT: { guard: { source: 'basics', status: 'rejected-old-crop', note: 'Old crop differs from the adopted repair.' } },
    });
    expect(report.find(source => source.id === 'basics')).toMatchObject({
      mappedFrames: ['run_1', 'run_2'], mappedAnimations: ['dash'], unreferencedFrames: ['spare'],
      notBuilt: [{ id: 'guard', collection: 'referenceFrames_NOT_BUILT', status: 'rejected-old-crop', note: 'Old crop differs from the adopted repair.' }],
    });
    expect(report.find(source => source.id === 'repair')).toMatchObject({ mappedFrames: ['guard'], mappedAnimations: ['block_stand'], notBuilt: [] });
  });

  it('preserves colliding reference/review names without treating either as an active animation', () => {
    const report = inspectSourceUsage({
      sources: { basics: { file: 'basics.png' } }, frames: {}, anims: { dash: { frames: ['walk_1'] } },
      referenceFrames_NOT_BUILT: { walk_1: { source: 'basics', status: 'reference-only' } },
      reviewFrames_NOT_BUILT: { walk_1: { source: 'basics', status: 'foot-support-unverified' } },
    });
    expect(report[0]?.mappedAnimations).toEqual([]);
    expect(report[0]?.mappedFrames).toEqual([]);
    expect(report[0]?.notBuilt.map(frame => [frame.collection, frame.status])).toEqual([
      ['referenceFrames_NOT_BUILT', 'reference-only'], ['reviewFrames_NOT_BUILT', 'foot-support-unverified'],
    ]);
  });

  it('retains undeclared source references as unknown and handles missing authoring', () => {
    expect(inspectSourceUsage(undefined)).toEqual([]);
    expect(inspectSourceUsage({ sources: {}, frames: { hit: { source: 'missing_source' } }, anims: { hit_air: { frames: ['hit'] } } })).toEqual([
      { id: 'missing_source', sourceFile: null, mappedFrames: ['hit'], mappedAnimations: ['hit_air'], unreferencedFrames: [], notBuilt: [] },
    ]);
  });

  it('counts patch donors once per frame while separating active, spare and retained candidates', () => {
    const report = inspectSourceUsage({
      sources: { body: { file: 'body.png' }, head: { file: 'head.png' }, spare: { file: 'spare.png' }, rejected: { file: 'rejected.png' }, unused: { file: 'unused.png' } },
      frames: {
        rocket: { source: 'body', sourcePatches: [{ source: 'head', rect: [1, 2, 3, 4] }, { source: 'head', rect: [9, 2, 3, 4] }] },
        spare: { source: 'body', sourcePatches: [{ source: 'spare', rect: [1, 2, 3, 4] }] },
      },
      anims: { sp_rocket: { frames: ['rocket', 'rocket'] } },
      reviewFrames_NOT_BUILT: { rocket: { source: 'body', sourcePatches: [{ source: 'rejected', rect: [1, 2, 3, 4] }], status: 'rejected-neck' } },
    });
    expect(report.find(source => source.id === 'head')).toMatchObject({ mappedFrames: ['rocket'], mappedAnimations: ['sp_rocket'], unreferencedFrames: [], notBuilt: [] });
    expect(report.find(source => source.id === 'spare')).toMatchObject({ mappedFrames: [], mappedAnimations: [], unreferencedFrames: ['spare'], notBuilt: [] });
    expect(report.find(source => source.id === 'rejected')).toMatchObject({ mappedFrames: [], mappedAnimations: [], unreferencedFrames: [], notBuilt: [{ id: 'rocket', status: 'rejected-neck' }] });
    expect(report.find(source => source.id === 'unused')).toMatchObject({ mappedFrames: [], mappedAnimations: [], unreferencedFrames: [], notBuilt: [] });
  });

  it('retains an undeclared patch donor as an unknown contributing source', () => {
    const report = inspectSourceUsage({
      sources: { body: { file: 'body.png' } },
      frames: { rocket: { source: 'body', sourcePatches: [{ source: 'unknown_head', rect: [1, 2, 3, 4] }] } },
      anims: { sp_rocket: { frames: ['rocket'] } },
    });
    expect(report.find(source => source.id === 'unknown_head')).toEqual({ id: 'unknown_head', sourceFile: null, mappedFrames: ['rocket'], mappedAnimations: ['sp_rocket'], unreferencedFrames: [], notBuilt: [] });
  });
});

describe('patched frame coverage requires every contributing original to be verified', () => {
  const body = { id: 'body', ok: true, original: { file: 'body.png' } };
  const head = { id: 'head', ok: true, original: { file: 'head.png' } };
  const frame = { source: 'body', sourcePatches: [{ source: 'head', rect: [1, 2, 3, 4] }] };

  it('reports the donor rectangle and source without replacing the original body provenance', () => {
    expect(inspectFrameSources(frame, [body, head])).toEqual({ sourceId: 'body', sourceFile: 'body.png', sourcePatches: [{ sourceId: 'head', sourceFile: 'head.png', rect: [1, 2, 3, 4], verified: true }], invalidSources: [] });
    expect(inspectFrameSources({ source: 'body' }, [body])).toEqual({ sourceId: 'body', sourceFile: 'body.png', sourcePatches: [], invalidSources: [] });
  });

  it('does not let a verified body hide a failed or undeclared patch donor', () => {
    expect(inspectFrameSources(frame, [body, { ...head, ok: false }])).toMatchObject({ invalidSources: ['head'], sourcePatches: [{ verified: false }] });
    expect(inspectFrameSources(frame, [body])).toMatchObject({ invalidSources: ['head'], sourcePatches: [{ sourceFile: null, verified: false }] });
    expect(inspectFrameSources(frame, [{ ...body, ok: false }, head]).invalidSources).toEqual(['body']);
  });
});
