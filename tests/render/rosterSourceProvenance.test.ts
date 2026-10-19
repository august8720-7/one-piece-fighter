import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// All PNGs and receipts below are SYNTHETIC TEST FIXTURES inside isolated temporary roots.
// They are not production art or actual webpage/model evidence.
const python = (body: string) => JSON.parse(execFileSync('python', ['-c', `
import copy, json, sys
from pathlib import Path
from tempfile import TemporaryDirectory
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(sys.argv[1]).parent))
import build_anime_atlas as m
import record_roster_source0929 as recorder
from PIL import Image

def record(path):
    return {"file":path.relative_to(m.ROOT).as_posix(),"sha256":m.digest(path.read_bytes())}

def receipt(key, source, suffix="0929", references=None):
    payload={"schemaVersion":1,"sourceKey":key,**{k:v for k,v in source.items() if k!="sourceEvidence"},"referenceFiles":references or {}}
    path=m.ROOT/f"docs/assets/{key}来源凭据{suffix}.txt"
    path.write_text(json.dumps(payload,ensure_ascii=False),encoding="utf-8")
    source["sourceEvidence"]=record(path)

def fixture(directory):
    m.ROOT=Path(directory);recorder.ROOT=m.ROOT
    for folder in ["public/assets/generated/source","docs/assets","scripts"]:(m.ROOT/folder).mkdir(parents=True)
    png=m.ROOT/"public/assets/generated/source/fixture.png"
    Image.new("RGBA",(3,2),(31,63,127,190)).save(png)
    prompt=m.ROOT/"docs/assets/prompt.txt"
    prompt.write_text("SYNTHETIC TEST FIXTURE: no production artwork or actual generation",encoding="utf-8")
    source={**record(png),"provider":"chatgpt-web","model":"unverified","workflowDecision":"pc-roster-0929",
        "observedImageModel":None,"imageModelDisclosure":"exact-model-unavailable",
        "modelUnavailableStatement":"SYNTHETIC TEST FIXTURE: exact model unavailable, not actual UI evidence",
        "observedTextModelLabel":"最新","observedReasoningEffort":"极高",
        "entryUrl":"https://chatgpt.com/images/","entryTitle":"ChatGPT","browserLabel":"Codex内置浏览器",
        "sessionUrl":"https://chatgpt.com/c/synthetic-test","observedCompletedAt":"2026-09-29T23:00:00+08:00",
        "uiObservation":"SYNTHETIC TEST FIXTURE: observation schema only, no webpage was used",
        "prompt":record(prompt),"referenceSources":{},"unitScale":1}
    receipt("fixture",source)
    return source

def rejected(source):
    try:m.load_sources({"fixture":source})
    except (ValueError,FileNotFoundError) as error:return str(error)
    return None

${body}
`, resolve('scripts/build_anime_atlas.py')], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } }));

describe('0929 explicitly undisclosed official-web source provenance', () => {
  it('accepts the true later client receipt date and rejects an unrelated date', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-later-date-") as directory:
    source=fixture(directory)
    source["observedCompletedAt"]="2026-10-04T13:00:00+08:00"
    receipt("fixture",source,"1004")
    local=m.load_sources({"fixture":source})["fixture"].size
    source["observedCompletedAt"]="2026-10-03T16:20:00Z"
    receipt("fixture",source,"1004")
    utc=m.load_sources({"fixture":source})["fixture"].size
    receipt("fixture",source,"1005")
    print(json.dumps({"local":local,"utc":utc,"wrongDate":rejected(source)}))
`);
    expect(result.local).toEqual([3, 2]);
    expect(result.utc).toEqual([3, 2]);
    expect(result.wrongDate).toContain('observed date');
  });

  it('allows only an explicitly marked verified PNG within the declared guide root', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-reference-guide-") as directory:
    source=fixture(directory)
    guides=m.ROOT/"reference-guides";guides.mkdir();m.ROSTER_REFERENCE_GUIDE_ROOT=guides
    guide=guides/"guide.png";Image.new("RGB",(4,3),(31,63,127)).save(guide)
    source["referenceSources"]={"guide":m.digest(guide.read_bytes())}
    refs={"guide":{"file":guide.resolve().as_posix(),"sha256":source["referenceSources"]["guide"],"kind":"reference-guide-not-runtime"}}
    receipt("fixture",source,references=refs)
    valid=m.load_sources({"fixture":source})["fixture"].size
    refs["guide"].pop("kind");receipt("fixture",source,references=refs);unmarked=rejected(source)
    refs["guide"]["kind"]="reference-guide-not-runtime"
    source["referenceSources"]["guide"]="0"*64;refs["guide"]["sha256"]="0"*64
    receipt("fixture",source,references=refs);tampered=rejected(source)
    outside=m.ROOT/"outside.png";Image.new("RGB",(4,3),(31,63,127)).save(outside)
    source["referenceSources"]["guide"]=m.digest(outside.read_bytes());refs["guide"].update(file=outside.resolve().as_posix(),sha256=source["referenceSources"]["guide"])
    receipt("fixture",source,references=refs);escaped=rejected(source)
    print(json.dumps({"valid":valid,"unmarked":unmarked,"tampered":tampered,"escaped":escaped}))
`);
    expect(result.valid).toEqual([3, 2]);
    expect(result.unmarked).toContain('repository-relative');
    expect(result.tampered).toContain('SHA256 mismatch');
    expect(result.escaped).toContain('outside the declared reference');
  });
  it('loads an actual PNG with matching hashes in an isolated fixture root without identifying its model', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-source-fixture-") as directory:
    source=fixture(directory)
    image=m.load_sources({"fixture":source})["fixture"]
    print(json.dumps({"size":image.size,"pixel":image.getpixel((0,0)),"model":source["model"],"observed":source["observedImageModel"],"serverTimeInvented":"generatedAt" in source}))
`);
    expect(result).toEqual({ size: [3, 2], pixel: [31, 63, 127, 190], model: 'unverified', observed: null, serverTimeInvented: false });
  });

  it('records Edge observations and a later completion recheck through the CLI schema', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-edge-fixture-") as directory:
    source=fixture(directory)
    observation="SYNTHETIC TEST FIXTURE: rechecked completed result in Edge; first completion time was not recorded"
    fields={"--session":source["sessionUrl"],"--observed-completed-at":"2026-09-30T00:20:00+08:00",
        "--entry-url":source["entryUrl"],"--entry-title":source["entryTitle"],
        "--text-model-label":source["observedTextModelLabel"],"--reasoning-effort":source["observedReasoningEffort"],
        "--browser-label":"Microsoft Edge","--model-unavailable-statement":source["modelUnavailableStatement"],
        "--ui-observation":observation}
    argv=["edge_probe",source["file"],source["prompt"]["file"]]
    for flag,value in fields.items():argv.extend([flag,value])
    result=recorder.record_source(recorder.parser().parse_args(argv))
    entry=json.loads((m.ROOT/result["catalog"]).read_text(encoding="utf-8"))["sources"]["edge_probe"]
    image=m.load_sources({"edge_probe":entry})["edge_probe"]
    print(json.dumps({"browser":entry["browserLabel"],"time":entry["observedCompletedAt"],"observation":entry["uiObservation"],
        "size":image.size,"hasGeneratedAt":"generatedAt" in entry,"hasFirstObservedTime":"firstObservedCompletedDate" in entry}))
`);
    expect(result.browser).toBe('Microsoft Edge');
    expect(result.time).toBe('2026-09-30T00:20:00+08:00');
    expect(result.observation).toContain('rechecked completed result');
    expect(result.observation).toContain('first completion time was not recorded');
    expect(result.size).toEqual([3, 2]);
    expect(result.hasGeneratedAt).toBe(false);
    expect(result.hasFirstObservedTime).toBe(false);
  });

  it('requires every explicit observation field and preserves the old unsupported-model rejection', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-required-fixture-") as directory:
    source=fixture(directory);errors={}
    for field in m.ROSTER_OBSERVATION_FIELDS:
        broken=copy.deepcopy(source);del broken[field];errors[field]=rejected(broken)
    for field in ["sourceEvidence","prompt","referenceSources"]:
        broken=copy.deepcopy(source);del broken[field];errors[field]=rejected(broken)
    legacy=rejected({"model":"other-model","provider":"chatgpt-web"})
    print(json.dumps({"errors":errors,"legacy":legacy}))
`);
    expect(Object.values(result.errors).every(Boolean)).toBe(true);
    expect(result.errors.observedImageModel).toContain('explicitly be null');
    expect(result.errors.observedCompletedAt).toContain('observed completion time');
    expect(result.legacy).toContain('only recorded GPT Image 2.5');
  });

  it('rejects false model claims, unofficial sessions, inherited records and undated observation claims', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-claims-fixture-") as directory:
    source=fixture(directory)
    cases={
        "named_other_model":{"model":"other-model"},"claimed_25":{"model":"GPT Image 2.5"},
        "inferred_model":{"observedImageModel":"GPT Image 2.5"},"other_provider":{"provider":"third-party"},
        "wrong_workflow":{"workflowDecision":"another-workflow"},"no_disclosure":{"imageModelDisclosure":"known"},
        "blank_statement":{"modelUnavailableStatement":"  "},"blank_observation":{"uiObservation":""},
        "lookalike_host":{"sessionUrl":"https://chatgpt.com.example.com/c/fixture"},
        "userinfo_url":{"sessionUrl":"https://other@chatgpt.com/c/fixture"},
        "no_conversation":{"sessionUrl":"https://chatgpt.com/images/"},
        "wrong_entry":{"entryUrl":"https://third-party.example/images/"},
        "old_title":{"entryTitle":"ChatGPT GPT Image 2.5"},"other_text_label":{"observedTextModelLabel":"GPT 6"},
        "wrong_effort":{"observedReasoningEffort":"高"},"wrong_browser":{"browserLabel":"unknown"},
        "old_date":{"observedCompletedAt":"2026-09-22T23:00:00+08:00"},
        "no_timezone":{"observedCompletedAt":"2026-09-29T23:00:00"},
        "date_only":{"observedCompletedAt":"2026-09-29"},
        "legacy_evidence":{"modelEvidence":source["sourceEvidence"]},"server_time":{"generatedAt":"2026-09-29"}}
    errors={name:rejected({**source,**patch}) for name,patch in cases.items()}
    print(json.dumps(errors))
`);
    expect(Object.values(result).every(Boolean)).toBe(true);
    expect(result.named_other_model).toContain('unverified');
    expect(result.lookalike_host).toContain('official generation session');
    expect(result.old_date).toContain('old sources must not be relabeled');
    expect(result.legacy_evidence).toContain('keep old provenance unchanged');
  });

  it('checks actual original, prompt and evidence bytes, plus receipt-to-source bindings', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-hashes-fixture-") as directory:
    source=fixture(directory);errors={}
    for label,item in [("png",source),("prompt",source["prompt"]),("evidence",source["sourceEvidence"])]:
        path=m.ROOT/item["file"];original=path.read_bytes();path.write_bytes(original+b"tampered fixture")
        errors[label]=rejected(source);path.write_bytes(original)
    altered={**source,"uiObservation":"Different synthetic observation from the hashed receipt"}
    errors["binding"]=rejected(altered)
    prompt=m.ROOT/source["prompt"]["file"];prompt.write_bytes(b" ")
    source["prompt"]=record(prompt);receipt("fixture",source);errors["empty_prompt"]=rejected(source)
    print(json.dumps(errors))
`);
    for (const key of ['png', 'prompt', 'evidence']) expect(result[key]).toContain('SHA256 mismatch');
    expect(result.binding).toContain('source evidence uiObservation mismatch');
    expect(result.empty_prompt).toContain('complete prompt must not be empty');
  });

  it('validates a provided screenshot and never permits a missing file to stand in for one', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-screenshot-fixture-") as directory:
    source=fixture(directory);screen=m.ROOT/"docs/assets/synthetic-screen.png"
    Image.new("RGB",(4,3),(5,10,15)).save(screen)
    source["screenshot"]=record(screen);receipt("fixture",source)
    valid=m.load_sources({"fixture":source})["fixture"].size
    source["screenshot"]["file"]="docs/assets/nonexistent-screen.png";receipt("fixture",source)
    print(json.dumps({"valid":valid,"missing":rejected(source)}))
`);
    expect(result.valid).toEqual([3, 2]);
    expect(result.missing).toContain('screenshot missing');
  });

  it('records only new catalog keys and evidence, keeps observed time, and binds references to real hashes', () => {
    const result = python(`
with TemporaryDirectory(prefix="opf-roster-recorder-fixture-") as directory:
    source=fixture(directory)
    def args(key,refs=None):
        return recorder.parser().parse_args([key,source["file"],source["prompt"]["file"],
            "--session",source["sessionUrl"],"--observed-completed-at",source["observedCompletedAt"],
            "--entry-url",source["entryUrl"],"--entry-title",source["entryTitle"],
            "--text-model-label",source["observedTextModelLabel"],"--reasoning-effort",source["observedReasoningEffort"],
            "--browser-label",source["browserLabel"],"--model-unavailable-statement",source["modelUnavailableStatement"],
            "--ui-observation",source["uiObservation"],*sum((["--reference",ref] for ref in refs or []),[])])
    first=recorder.record_source(args("first"));catalog=m.ROOT/first["catalog"]
    original=json.loads(catalog.read_text(encoding="utf-8"))["sources"]["first"]
    second=recorder.record_source(args("second",["first"]))
    entries=json.loads(catalog.read_text(encoding="utf-8"))["sources"]
    loaded=m.load_sources(entries)
    before=catalog.read_bytes();proof=m.ROOT/first["evidence"]["file"];proof_before=proof.read_bytes()
    errors={}
    for key in ["first","fixture"]:
        try:recorder.record_source(args(key))
        except ValueError as error:errors[key]=str(error)
    stale_png=m.ROOT/source["file"];stale_png.write_bytes(stale_png.read_bytes()+b"tampered synthetic reference")
    try:recorder.record_source(args("bad_reference",["first"]))
    except ValueError as error:errors["reference"]=str(error)
    print(json.dumps({"loaded":sorted(loaded),"firstUnchanged":entries["first"]==original,
        "references":entries["second"]["referenceSources"],"sourceHash":original["sha256"],
        "time":original["observedCompletedAt"],"hasGeneratedAt":"generatedAt" in original,
        "model":original["model"],"observedImageModel":original["observedImageModel"],
        "catalogUnchangedAfterRefusal":catalog.read_bytes()==before,"evidenceUnchangedAfterRefusal":proof.read_bytes()==proof_before,
        "badReferenceReceiptExists":(m.ROOT/"docs/assets/bad_reference来源凭据0929.txt").exists(),"errors":errors}))
`);
    expect(result.loaded).toEqual(['first', 'second']);
    expect(result.firstUnchanged).toBe(true);
    expect(result.references).toEqual({ first: result.sourceHash });
    expect(result.time).toBe('2026-09-29T23:00:00+08:00');
    expect(result.hasGeneratedAt).toBe(false);
    expect(result.model).toBe('unverified');
    expect(result.observedImageModel).toBeNull();
    expect(result.catalogUnchangedAfterRefusal).toBe(true);
    expect(result.evidenceUnchangedAfterRefusal).toBe(true);
    expect(result.badReferenceReceiptExists).toBe(false);
    expect(result.errors.first).toContain('existing source keys');
    expect(result.errors.fixture).toContain('existing source evidence');
    expect(result.errors.reference).toContain('SHA256 mismatch');
  });
});
