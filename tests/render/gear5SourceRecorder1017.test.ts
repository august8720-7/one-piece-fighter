import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every image, prompt and observed UI field below is a synthetic fixture in a
// temporary D-drive tree. No production source registration is performed.
function python(body: string): unknown {
  return JSON.parse(execFileSync('python', ['-c', `
import json,sys
from pathlib import Path
from tempfile import TemporaryDirectory
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(sys.argv[1]).parent))
import record_roster_source0929 as r
import build_anime_atlas as b
from PIL import Image
with TemporaryDirectory(prefix='opf-recorder1017-') as directory:
    r.ROOT=b.ROOT=Path(directory)
    for folder in ['scripts','docs/assets','public/assets/generated/source','guides']:(b.ROOT/folder).mkdir(parents=True)
    b.ROSTER_REFERENCE_GUIDE_ROOT=b.ROOT/'guides'
    source=b.ROOT/'public/assets/generated/source/fixture.png'
    master=b.ROOT/'public/assets/generated/source/master.png'
    screenshot=b.ROOT/'docs/assets/ui.png'
    guide=b.ROSTER_REFERENCE_GUIDE_ROOT/'guide.png'
    for target in [source,master,screenshot,guide]:Image.new('RGBA',(4,4),(31,63,127,190)).save(target)
    prompt=b.ROOT/'docs/assets/prompt.txt';prompt.write_text('SYNTHETIC complete prompt fixture',encoding='utf-8')
    def args(key='fixture',extra=(),screenshot=True):
        return r.parser().parse_args([key,'public/assets/generated/source/fixture.png','docs/assets/prompt.txt',
            '--catalog','scripts/new_sources1017.json','--session','https://chatgpt.com/c/synthetic-test',
            '--observed-completed-at','2026-10-16T17:00:00+00:00','--entry-url','https://chatgpt.com/images/',
            '--entry-title','ChatGPT','--text-model-label','GPT-6','--reasoning-effort','极高',
            '--browser-label','Codex内置浏览器','--model-unavailable-statement','SYNTHETIC fixture: exact image model unavailable',
            '--ui-observation','SYNTHETIC fixture: no real browser evidence',
            *(['--screenshot','docs/assets/ui.png'] if screenshot else []),*extra])
${body}
`, resolve('scripts/record_roster_source0929.py')], { encoding: 'utf8' }));
}

describe('GPT-6 Gear5 source observation recorder', () => {
  it('binds the observed Shanghai date, actual screenshot and explicit master/guide hashes without adopting art', () => {
    const result = python(`
    output=r.record_source(args(extra=['--form','gear5','--reference-file','master=public/assets/generated/source/master.png','--reference-guide','walk='+guide.as_posix()]))
    catalog=json.loads((b.ROOT/output['catalog']).read_text(encoding='utf-8'));entry=catalog['sources']['fixture']
    loaded=b.load_sources({'fixture':entry})
    proof=json.loads((b.ROOT/output['evidence']['file']).read_text(encoding='utf-8'))
    print(json.dumps({'output':output,'entry':entry,'references':proof['referenceFiles'],'loaded':list(loaded)}))
`) as { output: { evidence: { file: string } }; entry: Record<string, unknown>; references: Record<string, Record<string, string>>; loaded: string[] };
    expect(result.output.evidence.file).toBe('docs/assets/fixture来源凭据1017.txt');
    expect(result.entry).toMatchObject({ formId: 'gear5', model: 'unverified', observedImageModel: null, observedTextModelLabel: 'GPT-6', observedReasoningEffort: '极高' });
    expect(result.entry.formReview).toBeUndefined();
    expect(result.entry.review).toBeUndefined();
    expect(result.references.master!.file).toBe('public/assets/generated/source/master.png');
    expect(result.references.walk!.kind).toBe('reference-guide-not-runtime');
    expect(result.loaded).toEqual(['fixture']);
  });

  it('rejects missing/bad screenshot, unsafe references and duplicates before creating evidence or catalog', () => {
    const result = python(`
    cases=[args('no_ui',screenshot=False),args('outside',extra=['--reference-file','master=docs/assets/ui.png']),args('absolute',extra=['--reference-file','master='+master.as_posix()]),args('guide_escape',extra=['--reference-guide','walk='+master.as_posix()]),args('duplicate',extra=['--reference-file','same=public/assets/generated/source/master.png','--reference-guide','same='+guide.as_posix()]),args('bad_pair',extra=['--reference-file','not-a-pair'])]
    errors=[]
    for candidate in cases:
        try:r.record_source(candidate)
        except (ValueError,OSError) as error:errors.append(str(error))
    screenshot.write_bytes(b'not a screenshot')
    try:r.record_source(args('bad_ui'))
    except (ValueError,OSError) as error:errors.append(str(error))
    print(json.dumps({'errors':errors,'catalogs':list((b.ROOT/'scripts').glob('*.json')),'proofs':[p.name for p in (b.ROOT/'docs/assets').glob('*来源凭据*.txt')]},default=str))
`) as { errors: string[]; catalogs: string[]; proofs: string[] };
    expect(result.errors).toHaveLength(7);
    expect(result.errors[0]).toContain('screenshot');
    expect(result.catalogs).toEqual([]); expect(result.proofs).toEqual([]);
  });

  it('preserves old entries/proofs and uses the production loader to reject tampering before catalog append', () => {
    const result = python(`
    first=r.record_source(args('first'));catalog=b.ROOT/first['catalog'];before=catalog.read_bytes()
    first_proof=b.ROOT/first['evidence']['file'];proof_before=first_proof.read_bytes()
    errors=[]
    try:r.record_source(args('first'))
    except ValueError as error:errors.append(str(error))
    legacy=b.ROOT/'docs/assets/legacy来源凭据0929.txt';legacy.write_text('Preserve historical evidence',encoding='utf-8')
    try:r.record_source(args('legacy'))
    except ValueError as error:errors.append(str(error))
    loader=b.load_sources
    def reject(sources):raise ValueError('synthetic production loader rejection')
    b.load_sources=reject
    try:r.record_source(args('not_catalogued'))
    except ValueError as error:errors.append(str(error))
    b.load_sources=loader
    print(json.dumps({'errors':errors,'catalogUnchanged':catalog.read_bytes()==before,'proofUnchanged':first_proof.read_bytes()==proof_before,'orphanProofPreserved':(b.ROOT/'docs/assets/not_catalogued来源凭据1017.txt').is_file()}))
`) as { errors: string[]; catalogUnchanged: boolean; proofUnchanged: boolean; orphanProofPreserved: boolean };
    expect(result.errors).toHaveLength(3);
    expect(result.catalogUnchanged).toBe(true); expect(result.proofUnchanged).toBe(true);
    expect(result.orphanProofPreserved).toBe(true);
  });
});
