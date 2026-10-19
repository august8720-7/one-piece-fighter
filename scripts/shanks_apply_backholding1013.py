"""Adopt the reviewed Shanks back hold from D only; no shared selector/registry writes."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path

from build_anime_atlas import build_character, load_sources
from aokiji_apply_backholding1009 import runtime_frames, frame_record

ROOT = Path(__file__).resolve().parents[1]
ROSTER = Path('D:/one-piece-fighter-crossover-0922/roster-0929')
OWN = ROSTER/'acceptance/character-closure1013/shanks'
IMAGES = ROSTER/'acceptance/character-closure1013/image-requests'
KEY = 'shanks_back_contact_marked_1013'
FRAME = 'throw_back_hold_1013'
SOURCE = 'public/assets/generated/source/roster-shanks-back-contact-marked-1013.png'
EXPECTED = 'b41b9f6b572e423f31d232ed340e52afc71fe98a9eba150562c75eca773b2d5d'
MANIFEST = ROOT/'scripts/roster_shanks_manifest0929.json'
CATALOG = ROOT/'scripts/roster_shanks_hold_sources1013.json'
MOVES = ROOT/'src/characters/shanks/moves.ts'
FOLDER = ROOT/'public/assets/characters/shanks/anime'


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')


def save_new(path: Path, value: object) -> None:
    with path.open('xb') as stream:
        stream.write(encode(value))


def file_record(path: Path) -> dict:
    return {'file': path.as_posix(), 'bytes': path.stat().st_size, 'sha256': digest(path.read_bytes())}


def main() -> None:
    assert ROOT == Path('D:/Projects/one-piece-fighter')
    assert Path.cwd().resolve() == ROOT
    assert (OWN/'README.md').is_file()
    assert not CATALOG.exists(), 'This adoption is single-use; inspect the existing receipt instead of rerunning.'
    source_path = ROOT/SOURCE
    assert digest(source_path.read_bytes()) == EXPECTED
    fragment = json.loads((OWN/'shanks-back-adoption-fragment1013.json').read_text(encoding='utf-8'))
    assert fragment['sourceRequiredFields']['sha256'] == EXPECTED
    assert fragment['status'] == 'static-three-body-contact-accepted-awaiting-root-integration-and-gameplay'

    # Preserve actual uploaded guide in the validator's declared reference root.
    guide_original = OWN/'back-repair1245/shanks-back-hole-marked1013.png'
    assert digest(guide_original.read_bytes()) == '30ecda3e95f23e94b28e7d205bd202f5955976ab105be12f9353d8d39b87938d'
    guide_root = ROSTER/'reference/shanks-back-contact1013'
    guide_root.mkdir(exist_ok=False)
    (guide_root/'README.md').write_text(
        '# Shanks back-hold reference1013\nExact duplicate of the actually uploaded red/green opening guide. '
        'This is a reference, never runtime art. Original uploaded path remains in copy receipts; no source pixels changed.\n', encoding='utf-8')
    guide = guide_root/guide_original.name
    save_new(guide_root/'copy-before1013.json', {'source': file_record(guide_original), 'destination': guide.as_posix()})
    with guide.open('xb') as stream:
        stream.write(guide_original.read_bytes())
    assert guide.read_bytes() == guide_original.read_bytes()
    save_new(guide_root/'copy-after1013.json', {'source': file_record(guide_original), 'destination': file_record(guide), 'equal': True})

    prompt_rel = 'docs/assets/shanks-back-contact-marked-prompt1013.txt'
    prompt = ROOT/prompt_rel
    screenshot = IMAGES/'shanks-gpt6-xhigh-iab1013.jpg'
    completed = IMAGES/'shanks-marked-completed1013.jpg'
    references = {
        'shanks_back_contact_repair_1013': {
            'file': 'public/assets/generated/source/roster-shanks-back-contact-repair-1013-1245.png',
            'sha256': 'be146d2ccac2dd2591078d45a1078ed6e722244aac742ba6a9e19a63d3810f6a'},
        'shanks_back_hole_guide_1013': {'file': guide.as_posix(), 'sha256': digest(guide.read_bytes()), 'kind': 'reference-guide-not-runtime'},
    }
    for ref in references.values():
        assert digest((ROOT/ref['file']).read_bytes()) == ref['sha256']
    source = {
        'file': SOURCE, 'sha256': EXPECTED, 'provider': 'chatgpt-web', 'model': 'unverified',
        'workflowDecision': 'pc-roster-0929', 'observedImageModel': None,
        'imageModelDisclosure': 'exact-model-unavailable',
        'modelUnavailableStatement': '官方页面未公开具体图像型号，继续记unverified；不由文字GPT-6推断图像模型。',
        'observedTextModelLabel': 'GPT-6', 'observedReasoningEffort': '极高',
        'entryUrl': 'https://chatgpt.com/images/', 'entryTitle': 'ChatGPT', 'browserLabel': 'Codex内置浏览器',
        'sessionUrl': 'https://chatgpt.com/c/6ac1cc86-9358-83ee-8a0c-ecf6a8e5e050',
        'observedCompletedAt': datetime.fromtimestamp(completed.stat().st_mtime, timezone(timedelta(hours=8))).isoformat(),
        'uiObservation': '根执行者在既有官方IAB会话实际选择GPT-6及极高第4/5项，上传be146原PNG和红绿空孔定位参考后单次提交。完整输入由实际已发送消息读回保存。locator.downloadMedia实际成功导出原PNG，复制前后清单记录原字节；本单写者只核本地源PNG、三体型静态包握和标准分层准备。observedCompletedAt取完成截图本地mtime，是完成复核时刻，不是服务端首次生成时间。迁移前下载/复制票据中的C路径保留为历史事实；本次只在D盘使用同SHA副本。',
        'prompt': {'file': prompt_rel, 'sha256': digest(prompt.read_bytes())},
        'referenceSources': {key: row['sha256'] for key, row in references.items()},
        'screenshot': {'file': screenshot.as_posix(), 'sha256': digest(screenshot.read_bytes())},
        'completionScreenshot': {'file': completed.as_posix(), 'sha256': digest(completed.read_bytes())},
        'unitScale': 380/987,
        'scaleBasis': fragment['sourceRequiredFields']['scaleBasis'],
        'recordedAt': datetime.now(timezone.utc).isoformat(),
        'reviewStatus': 'three-body-static-contact-accepted-gameplay-pending',
    }
    evidence_path = ROOT/f'docs/assets/{KEY}来源凭据1013.txt'
    receipt = {'schemaVersion': 1, 'sourceKey': KEY, **deepcopy(source), 'referenceFiles': references,
               'actualUploadedGuideOriginal': file_record(guide_original),
               'downloadReceipts': [file_record(IMAGES/'iab-repair-copy-before1013.json'), file_record(IMAGES/'iab-repair-copy-after1013.json')],
               'staticAcceptance': file_record(OWN/'shanks-back-marked-acceptance1013.md')}
    save_new(evidence_path, receipt)
    source['sourceEvidence'] = {'file': evidence_path.relative_to(ROOT).as_posix(), 'sha256': digest(evidence_path.read_bytes())}
    load_sources({KEY: source})
    save_new(CATALOG, {'schemaVersion': 1, 'workflowDecision': 'pc-roster-0929', 'sources': {KEY: source}})

    timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    baseline = ROSTER/f'baseline/shanks-back1013-{timestamp}'
    candidate = OWN/f'adoption-{timestamp}'
    for directory, text in [(baseline, '# Shanks exact rollback1013\nPrior Shanks author, moves, runtime pages/UI and own new source catalog; copy-before precedes all copies, copy-after proves exact bytes. No old source or file is deleted.\n'),
                            (candidate, '# Shanks back-hold candidate1013\nOnly the reviewed back-hold frame group and holdOffset30 are adopted. outputs/ holds exact assembled files; proof preserves every non-back frame RGBA/root/socket/timing including front foreground. Shared selector/tests and real game validation belong to root. This is not a formal roster acceptance.\n')]:
        directory.mkdir(exist_ok=False)
        (directory/'README.md').write_text(text, encoding='utf-8')

    before_bytes = MANIFEST.read_bytes()
    old_author = json.loads(before_bytes)
    author = deepcopy(old_author)
    config = author['characters']['shanks']
    old_config = old_author['characters']['shanks']
    old_moves = MOVES.read_bytes()
    move_text = old_moves.decode('utf-8')
    old_line = "throwMove({ id: 'throw_back', name: '单臂反摔', direction: 4, button: Btn.C, damage: 114, total: 42, throwData: { range: 46, techWindow: 8, releaseFrame: 21, holdOffset: 34 } })"
    new_line = old_line.replace('holdOffset: 34', 'holdOffset: 30')
    assert move_text.count(old_line) == 1
    new_moves = move_text.replace(old_line, new_line).encode('utf-8')
    assert KEY not in config['sources'] and FRAME not in config['frames']
    config['sources'][KEY] = source
    config['frames'][FRAME] = deepcopy(fragment['addFrame'])
    for name in fragment['retireActiveFramesToUnusedReviewCrops']:
        old_frame = config['frames'].pop(name)
        assert name not in author.get('unusedReviewCrops', {})
        author.setdefault('unusedReviewCrops', {})[name] = old_frame
    config['anims']['throw_back'] = deepcopy(fragment['replaceAnimation']['throw_back'])
    assert sum(x['ticks'] for x in config['anims']['throw_back']['exposures']) == 42
    assert sum(x['ticks'] for x in config['anims']['throw_back']['throwExposures']) == 42
    assert config['anims']['throw_back']['throwExposures'][0]['ticks'] == 21
    assert config['scale'] == old_config['scale'] and config['textureDensity'] == old_config['textureDensity']
    assert all(config['sources'][key] == value for key, value in old_config['sources'].items())
    assert all(config['anims'][key] == value for key, value in old_config['anims'].items() if key != 'throw_back')
    after_bytes = encode(author)
    outputs, build_report = build_character('shanks', config, digest(after_bytes))
    old_runtime_bytes = (FOLDER/'runtime.json').read_bytes()
    old_runtime = json.loads(old_runtime_bytes)
    new_runtime = json.loads(outputs['runtime.json'])
    old_frames = runtime_frames(FOLDER, old_runtime)
    new_frames = runtime_frames(FOLDER, new_runtime, outputs)
    equal_rows = []
    for key, image in old_frames.items():
        if key.startswith('shanks/throw_back/'):
            continue
        assert key in new_frames
        before = frame_record(image, old_runtime['attachments'][key])
        after = frame_record(new_frames[key], new_runtime['attachments'][key])
        assert before == after, f'Unaffected frame changed: {key}'
        equal_rows.append({'frame': key, 'rgbaRootSocketsExact': True, **after})
    assert all(new_runtime['anims'][key] == value for key, value in old_runtime['anims'].items() if key != 'throw_back')
    assert all(new_runtime['foregroundFrames'][key] == value for key, value in old_runtime['foregroundFrames'].items() if not key.startswith('shanks/throw_back/'))
    # Existing start/release/recover remain exact even though the back frame-group indices compact.
    retained_back = []
    for old_index, new_index in [(0,0), (3,2), (4,3)]:
        old_key, new_key = f'shanks/throw_back/{old_index}', f'shanks/throw_back/{new_index}'
        before = frame_record(old_frames[old_key], old_runtime['attachments'][old_key])
        after = frame_record(new_frames[new_key], new_runtime['attachments'][new_key])
        assert before == after
        retained_back.append({'before': old_key, 'after': new_key, 'rgbaRootSocketsExact': True})
    assert new_runtime['foregroundFrames']['shanks/throw_back/1'] == 'shanks/throw_back/1/foreground'
    save_new(candidate/'unchanged-logical-frames1013.json', {'unchanged': equal_rows, 'retainedBack': retained_back,
             'frontAnimationUnchanged': True, 'allNonBackAnimationsUnchanged': True, 'oldBackFramesRetainedInUnused': True})

    inputs = [MANIFEST, MOVES, CATALOG] + [p for p in sorted(FOLDER.iterdir()) if p.is_file()]
    inventory = [{**file_record(path), 'relative': path.relative_to(ROOT).as_posix()} for path in inputs]
    save_new(baseline/'copy-before1013.json', inventory)
    for row in inventory:
        dest = baseline/'files'/row['relative']
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open('xb') as stream:
            stream.write(Path(row['file']).read_bytes())
        assert digest(dest.read_bytes()) == row['sha256']
    save_new(baseline/'copy-after1013.json', [{**row, 'copySha256': digest((baseline/'files'/row['relative']).read_bytes()), 'equal': True} for row in inventory])
    output_dir = candidate/'outputs'
    output_dir.mkdir(exist_ok=False)
    for name, blob in outputs.items():
        with (output_dir/name).open('xb') as stream:
            stream.write(blob)
    save_new(candidate/'assembled-output-inventory1013.json', [{'file': name, 'bytes': len(blob), 'sha256': digest(blob)} for name, blob in outputs.items()])
    for row in inventory:
        assert digest(Path(row['file']).read_bytes()) == row['sha256'], f'Input changed during staging: {row["relative"]}'
    assert MANIFEST.read_bytes() == before_bytes and MOVES.read_bytes() == old_moves
    assert (FOLDER/'runtime.json').read_bytes() == old_runtime_bytes
    MANIFEST.write_bytes(after_bytes)
    MOVES.write_bytes(new_moves)
    for name, blob in outputs.items():
        (FOLDER/name).write_bytes(blob)
        assert (FOLDER/name).read_bytes() == blob
    assert MANIFEST.read_bytes() == after_bytes and MOVES.read_bytes() == new_moves
    final = {'status': 'back-hold-runtime-and-offset-adopted-shared-selector-and-real-game-pending',
             'adoptedAtUtc': datetime.now(timezone.utc).isoformat(), 'projectRoot': ROOT.as_posix(),
             'baseline': baseline.as_posix(), 'candidate': candidate.as_posix(), 'source': KEY, 'sourceSha256': EXPECTED,
             'newFrame': FRAME, 'backFrames': new_runtime['anims']['throw_back'], 'holdOffset': 30,
             'unchangedDamage': 114, 'unchangedTotal': 42, 'unchangedRelease': 21, 'unchangedTechWindow': 8,
             'existingUnchangedNonBackFrames': len(equal_rows), 'frontAnimationAndPixelsUnchanged': True,
             'retainedBack': retained_back, 'oldBackRowsPreserved': True, 'formalRosterAccepted': False,
             'sharedSelectorOrTestsWritten': False, 'coreOrOldCharactersWritten': False,
             'manifestSha256': digest(after_bytes), 'runtimeSha256': digest(outputs['runtime.json']),
             'movesSha256': digest(new_moves), 'outputFiles': list(outputs), 'buildReport': build_report}
    save_new(candidate/'adoption1013.json', final)
    save_new(OWN/'shanks-back-adoption-result1013.json', {key: value for key,value in final.items() if key != 'buildReport'})
    print(json.dumps({key:value for key,value in final.items() if key not in ('buildReport','backFrames')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
