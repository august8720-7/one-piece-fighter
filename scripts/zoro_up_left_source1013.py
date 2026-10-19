"""Record the actual new source and a reviewed one-frame replacement on D."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')
REF = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/zoro-floor1013')
KEY = 'zoro_mouth_up_left_1013'
SOURCE = ROOT / 'public/assets/generated/source/roster-zoro-mouth-up-left-1013.png'
EXPECTED = '998ce79f4abe51ad81d0c4f0fefebe4c569b79818202689ad14775278cafa15f'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def main():
    assert ROOT.drive.upper() == 'D:' and sha(SOURCE) == EXPECTED
    image = Image.open(SOURCE)
    image.verify()
    image = Image.open(SOURCE)
    image.load()
    alpha = image.getchannel('A')
    neutral = alpha.crop((0, 0, 930, 809)).point(lambda a: 255 if a >= 8 else 0).getbbox()
    assert neutral == (26, 21, 903, 756)
    neutral_height = neutral[3] - neutral[1]
    uploaded_guide = OUT / 'zoro-mouth-up-left-angle-guide1013.png'
    if not REF.exists():
        REF.mkdir()
        (REF / 'README.md').write_text('# Zoro floor annotation references1013\nByte-identical canonical copies of locally authored upload-only annotations. Not runtime art. Preserve originals in acceptance; record copy-before and verified copy-after SHA.\n', encoding='utf-8')
    assert (REF / 'README.md').is_file()
    guide = REF / uploaded_guide.name
    assert not guide.exists()
    before = {'source': str(uploaded_guide), 'target': str(guide), 'sha256': sha(uploaded_guide)}
    write_new(REF / 'copy-before1013.json', before)
    shutil.copyfile(uploaded_guide, guide)
    assert sha(guide) == before['sha256']
    write_new(REF / 'copy-after1013.json', {**before, 'verified': True})
    prompt = ROOT / 'docs/assets/zoro-mouth-up-left-correction1013.txt'
    evidence_root = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/image-requests')
    model_ui = evidence_root / 'zoro-gpt6-confirmed-iab1013.jpg'
    completed = evidence_root / 'zoro-up-left-completed1013.jpg'
    failed = ROOT / 'public/assets/generated/source/roster-zoro-floor-repair-1013.png'
    observed = datetime.now(timezone(timedelta(hours=8))).isoformat()
    references = {'zoro_floor_repair_1013': sha(failed), 'zoro_mouth_up_left_angle_guide1013': sha(guide)}
    source = {
        'file': str(SOURCE.relative_to(ROOT)).replace('\\', '/'), 'sha256': EXPECTED,
        'provider': 'chatgpt-web', 'model': 'unverified', 'workflowDecision': 'pc-roster-0929',
        'observedImageModel': None, 'imageModelDisclosure': 'exact-model-unavailable',
        'modelUnavailableStatement': '官方网页未公开具体图像型号，不推断后台版本。',
        'observedTextModelLabel': 'GPT-6', 'observedReasoningEffort': '极高',
        'entryUrl': 'https://chatgpt.com/images/', 'entryTitle': 'ChatGPT', 'browserLabel': 'Codex内置浏览器',
        'sessionUrl': 'https://chatgpt.com/c/6abbe218-2044-83e8-b500-931a2779e800',
        'observedCompletedAt': observed, 'recordedAt': observed,
        'uiObservation': 'root在同一已核GPT-6/极高4/5会话的IAB，实际上传前一张失败原PNG与本地左上箭头参考并提交独立短提示，随后直接将已显示原始PNG字节保存D盘。本子代理完整解码与实看新图及局部：口刀已真实向左上延伸、咬柄与嘴相连，两手刀独立且三刀完整。记录时间为本次复核，不是服务端首次生成时间。文字型号采用root同次现场确认；图片具体型号未公开。',
        'prompt': {'file': 'docs/assets/zoro-mouth-up-left-correction1013.txt', 'sha256': sha(prompt)},
        'referenceSources': references,
        'screenshot': {'file': str(model_ui), 'sha256': sha(model_ui)},
        'completionScreenshot': {'file': str(completed), 'sha256': sha(completed)},
        'unitScale': 379 / neutral_height,
        'scaleBasis': f'Neutral alpha>=8 bbox{list(neutral)} height{neutral_height}; entire source uses379/{neutral_height}, no per-pose rescale.',
        'sourceImageSize': list(image.size), 'sourceBytes': SOURCE.stat().st_size,
        'status': 'static-three-sword-ground-and-scale-reviewed-runtime-pending',
    }
    references_files = {
        'zoro_floor_repair_1013': {'file': str(failed.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(failed)},
        'zoro_mouth_up_left_angle_guide1013': {'file': str(guide), 'sha256': sha(guide),
            'kind': 'reference-guide-not-runtime', 'originalUploadedFile': str(uploaded_guide),
            'canonicalCopyByteIdentical': True},
    }
    receipt_path = ROOT / f'docs/assets/{KEY}来源凭据1013.txt'
    write_new(receipt_path, {'schemaVersion': 1, 'sourceKey': KEY, **source,
                            'referenceFiles': references_files, 'runtimeAcceptance': False})
    source['sourceEvidence'] = {'file': str(receipt_path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(receipt_path)}
    catalog_file = ROOT / 'scripts/zoro_floor_sources1013.json'
    catalog = json.loads(catalog_file.read_text(encoding='utf-8'))
    assert KEY not in catalog['sources']
    write_new(OUT / 'zoro-floor-sources-before-up-left1013.json', catalog)
    catalog['sources'][KEY] = source
    catalog_file.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    review = {'status': 'visual-review-passed-not-game-accepted', 'sourceKey': KEY, 'source': source,
        'review': {'threeDistinctSwords': True, 'headHandsAndTipsComplete': True,
            'sameBodyProportions': True, 'bodySupportedAtGround': True,
            'noPerPoseScalingRotationOrCompensatingRootShift': True},
        'measurements': {'neutralCell': [0, 0, 930, 809], 'neutralAlpha8Bounds': list(neutral),
            'crop': [946, 318, 996, 426], 'supportRootAbsolute': [1469.5, 732],
            'bodySupportGroundY': 732, 'mouthBladeLowestUpperBoundSourceY': 600,
            'mouthBladeBoundMeaning': 'Conservative full-mouth sword/handle region upper limit; visible handle ends above600. Not a claim of an exact segmentation endpoint.',
            'supportRootBasis': 'Prone body without the upper-left mouth blade spans sourcex1005..1934, midpoint1469.5. Visible supporting hand/guard reaches alpha8 boundaryy732 (fingers729). Mouth blade is far above; ground was not lowered to hide a downward tip.',
            'sourceWholePageRatio': 379 / neutral_height,
            'proneAlpha8Bounds': [958, 330, 1934, 732], 'rightMarginSourcePixels': 8},
        'qualityNotes': ['Real alpha, no opaque backdrop.', 'All three swords visibly separate and connected to hands/mouth.',
            'New source size calibrated once by neutral figure. Existing other frames/roots must remain exact during build.',
            'Normal-speed IAB knockdown/getup remains a separate root-agent check.'],
        'sourceUnchangedAfter': sha(SOURCE) == EXPECTED}
    target = OUT / 'zoro-up-left-reviewed-source1013.json'
    write_new(target, review)
    print(json.dumps({'review': str(target), 'receipt': str(receipt_path), 'sourceKey': KEY,
                      'sourceSha256': EXPECTED, 'neutralHeight': neutral_height,
                      'unitScale': source['unitScale'], 'newKnockdownRoot': [523.5, 414]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
