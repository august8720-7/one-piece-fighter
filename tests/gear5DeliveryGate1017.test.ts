import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('rejects the real unresolved Gear5 contacts even if formReview alone is relabelled accepted', () => {
  const manifest = JSON.parse(readFileSync(resolve('scripts/gear5_authoring1017.json'), 'utf8'));
  const config = manifest.characters.luffy;
  // Actual unresolved balloon record captured from the authoring manifest on 1017.
  // Keep the historical failure reproducible after the real candidate is repaired.
  config.pendingContact = { sp_balloon: {
    status: 'must-replace-full-active-before-form-acceptance',
    actualBellyFrontWorld: [23.281882, -45.696117], oldReflectBox: [-30, -120, 90, 120],
    targetFrontAboutWorldX: 60, noRootOrScaleFit: true, rootPreparingNewOfficialEntityActive: true,
  } };
  config.formReview = 'full-coverage-accepted';
  const path = resolve(mkdtempSync(resolve(tmpdir(), 'opf-gear5-pending-contact-')), 'manifest.json');
  writeFileSync(path, JSON.stringify(manifest));
  const script = ['import sys', `sys.path.insert(0,${JSON.stringify(resolve('scripts'))})`,
    'import build_delivery_assets as d', 'd.resolve_gear5_delivery(sys.argv[1], ["luffy"])'].join('\n');
  expect(() => execFileSync(process.env.OPF_PYTHON ?? 'python', ['-c', script, path], {
    encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })).toThrow('Gear5 delivery refuses unresolved pending contact reviews');
});
