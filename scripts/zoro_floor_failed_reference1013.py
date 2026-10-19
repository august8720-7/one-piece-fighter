"""Record rejected source bytes and one precise upload-only angle annotation."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')
SOURCE = ROOT / 'public/assets/generated/source/roster-zoro-floor-repair-1013.png'
EXPECTED = 'feb2bac53792910b9140c7e7868c6361a6f4ffdc58a91e8678b95fd480c7f194'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def main():
    assert ROOT.drive.upper() == 'D:' and sha(SOURCE) == EXPECTED
    image = Image.open(SOURCE).convert('RGBA')
    alpha = image.getchannel('A')
    def inspect(rect, threshold=16):
        bbox = alpha.crop(tuple(rect)).point(lambda a: 255 if a >= threshold else 0).getbbox()
        return {'sourceRegion': rect, 'alphaThreshold': threshold, 'localAlphaBounds': bbox,
                'lowestSourceY': rect[1] + bbox[3] - 1}
    mouth = inspect([837, 668, 918, 818])
    fingers = inspect([1035, 735, 1084, 811])
    guard = inspect([1020, 735, 1120, 818])
    neutral = inspect([75, 175, 650, 840], 8)
    standing_height = neutral['localAlphaBounds'][3] - neutral['localAlphaBounds'][1]
    ground = fingers['lowestSourceY'] + 1
    roi = [710, 530, 1140, 835]
    crop = image.crop(tuple(roi))
    reference = Image.new('RGB', (960, 850), '#e6eaed')
    flat = Image.new('RGB', crop.size, '#e6eaed')
    flat.paste(crop, (0, 0), crop)
    reference.paste(flat.resize((860, 610), Image.Resampling.LANCZOS), (40, 90))
    draw = ImageDraw.Draw(reference)
    font = ImageFont.load_default(size=21)
    small = ImageFont.load_default(size=18)
    draw.text((18, 14), 'REFERENCE ONLY - close-up of the new right-hand figure.', font=font, fill='#15212a')
    draw.text((18, 45), 'Green arrow: change the actual bite / head-neck angle so the MOUTH sword points UP-LEFT.', font=small, fill='#17643c')
    def point(x, y):
        return (40 + (x - roi[0]) * 2, 90 + (y - roi[1]) * 2)
    start, end = point(825, 653), point(738, 551)
    draw.line((start, end), fill='#169657', width=9)
    draw.polygon([end, (end[0] + 34, end[1] + 12), (end[0] + 7, end[1] + 36)], fill='#169657')
    draw.rectangle((*point(837, 668), *point(918, 813)), outline='#cd352d', width=5)
    floor_y = point(710, ground)[1]
    draw.line((40, floor_y, 900, floor_y), fill='#bb322c', width=3)
    draw.text((30, 726), 'RED: current wrong downward mouth blade. Do not merely redraw this same angle.', font=small, fill='#a02520')
    draw.text((30, 758), 'Keep both hand swords separate. Do not move or rotate the entire body.', font=small, fill='#15212a')
    draw.text((30, 790), 'The full original is the other attachment. Never paint these marks into the output.', font=small, fill='#15212a')
    target = OUT / 'zoro-mouth-up-left-angle-guide1013.png'
    assert not target.exists()
    write_new(OUT / 'zoro-mouth-angle-guide-before1013.json', {'source': str(SOURCE), 'sha256': EXPECTED,
        'target': str(target), 'sourceRoi': roi, 'diagnosticUniformZoom': 2, 'mouthArrowSourcePoints': [[825, 653], [738, 551]]})
    reference.save(target)
    assert sha(SOURCE) == EXPECTED
    observed = datetime.now(timezone(timedelta(hours=8))).isoformat()
    evidence_root = BASE_EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/image-requests')
    confirmed = evidence_root / 'zoro-gpt6-confirmed-iab1013.jpg'
    completed = BASE_EVIDENCE / 'zoro-floor-completed1013.jpg'
    prompt = ROOT / 'docs/assets/zoro-floor-fix-fullprompt1013.txt'
    source = {'file': str(SOURCE.relative_to(ROOT)).replace('\\', '/'), 'sha256': EXPECTED,
        'provider': 'chatgpt-web', 'model': 'unverified', 'workflowDecision': 'pc-roster-0929',
        'observedImageModel': None, 'imageModelDisclosure': 'exact-model-unavailable',
        'modelUnavailableStatement': '官方网页未公开具体图像型号，保持未核实。',
        'observedTextModelLabel': 'GPT-6', 'observedReasoningEffort': '极高',
        'entryUrl': 'https://chatgpt.com/images/', 'entryTitle': 'ChatGPT',
        'browserLabel': 'Codex内置浏览器', 'sessionUrl': 'https://chatgpt.com/c/6abbe218-2044-83e8-b500-931a2779e800',
        'observedCompletedAt': observed, 'recordedAt': observed,
        'timeMeaning': '本子代理首次完整解码与审核完成结果的记录时间，不是服务端生成时间。',
        'uiObservation': 'root报告本次在原会话IAB以GPT-6/极高4/5提交并取回最新第6图原PNG，直接导出D盘，无C盘浏览器下载。本子代理实看确认截图的极高状态与完成查看器，GPT-6文字标签依据root同次现场确认，不把此图像型号推断为任何具体后台版本。早期zoro-gpt6-xhigh-iab1013.jpg未用于本条证据。',
        'prompt': {'file': 'docs/assets/zoro-floor-fix-fullprompt1013.txt', 'sha256': sha(prompt)},
        'screenshots': [{'file': str(p), 'sha256': sha(p)} for p in [confirmed, completed]],
        'referenceSources': {'zoro_down_getup_repair_1003': '5c704a879238d0873c77b76f25acffeaed0dc4aaf6102bfd20eee57d610ee581'},
        'sourceFileSize': SOURCE.stat().st_size, 'sourceImageSize': list(image.size),
        'status': 'retained-rejected-for-mouth-blade-ground-geometry', 'runtimeAdopted': False}
    receipt_path = ROOT / 'docs/assets/zoro_floor_repair_1013来源凭据1013.json'
    write_new(receipt_path, {'schemaVersion': 1, 'sourceKey': 'zoro_floor_repair_1013', **source})
    source['sourceEvidence'] = {'file': str(receipt_path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(receipt_path)}
    write_new(ROOT / 'scripts/zoro_floor_sources1013.json', {'schemaVersion': 1,
        'status': 'independent-zoro-source-catalog-not-runtime-manifest', 'sources': {'zoro_floor_repair_1013': source}})
    review = {'date': '2026-10-13', 'characterId': 'zoro', 'status': 'failed-mouth-blade-ground',
        'sourceSha256': EXPECTED, 'threeDistinctSwords': True, 'headsHandsAndTipsComplete': True,
        'mouthBlade': mouth, 'bodyFingers': fingers, 'handAndGuard': guard, 'neutralBodyRegion': neutral,
        'standingHeight': standing_height, 'bodySupportBoundaryY': ground,
        'mouthTipBeyondBodyBoundary': mouth['lowestSourceY'] - ground,
        'mouthTipBeyondEvenGuardBoundary': mouth['lowestSourceY'] - guard['lowestSourceY'] - 1,
        'reason': 'Mouth blade still extends down-right below both the visible body-finger support and the lower hand-guard boundary. The bite/neck/blade angle did not achieve the requested upward direction. Do not compensate by shifting the body root.',
        'candidateManifestEmitted': False, 'runtimeChanged': False, 'sharedManifestChanged': False,
        'next': 'One bounded correction using the new local up-left arrow and a short explicit prompt. Not another full long prompt.',
        'guide': {'file': str(target), 'sha256': sha(target), 'sourceRoi': roi, 'runtimeArtwork': False},
        'sourceRegistry': 'scripts/zoro_floor_sources1013.json'}
    write_new(OUT / 'zoro-floor-repair-review1013.json', review)
    print(json.dumps(review, ensure_ascii=False))


if __name__ == '__main__':
    main()
