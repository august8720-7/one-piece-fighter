"""Preserve the actual compact30 failed PNG; no runtime or authoring adoption."""
from pathlib import Path
from datetime import datetime
import argparse
import hashlib
import io
import json
import sys
from PIL import Image
from record_roster_source0929 import record_source

ROOT = Path(__file__).resolve().parents[1]
PARENT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004')
OUT = PARENT / 'compact30-review1004'
ORIGINAL = Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/ce1639b7-9657-4a69-95bd-f15b0248d202/8a48d682e2637d55')
DEST = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-compact30-1004.png'
EXPECTED = 'b639875afec46a55bc1e4b65f4264613b43d5300dd0d6d310babf5ec1a7459bb'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def main():
    assert (OUT / 'README.md').is_file()
    protected = [ROOT / 'public/assets/characters/aokiji/anime/runtime.json',
                 ROOT / 'scripts/roster_aokiji_manifest0929.json']
    protected_before = {str(path): sha(path.read_bytes()) for path in protected}
    blob = ORIGINAL.read_bytes()
    bundle = (ORIGINAL.parent / 'manifest.json').read_bytes()
    assert sha(blob) == EXPECTED and len(blob) == 1216226
    assert blob.startswith(b'\x89PNG\r\n\x1a\n') and blob.endswith(bytes.fromhex('0000000049454e44ae426082'))
    with Image.open(io.BytesIO(blob)) as source:
        assert source.format == 'PNG'
        source.verify()
    image = Image.open(io.BytesIO(blob)).convert('RGBA')
    image.load()
    assert image.size == (2172, 724) and image.getchannel('A').getextrema() == (0, 255)
    assert ORIGINAL.read_bytes() == blob
    catalog = ROOT / 'scripts/roster_marine_sources0929.json'
    copies = [(ORIGINAL, DEST, blob),
              (ORIGINAL.parent / 'manifest.json', OUT / 'official-bundle-manifest1004.json', bundle),
              (catalog, OUT / 'marine-catalog-before1004.json', catalog.read_bytes())]
    before = [{'source': str(src), 'destination': str(dest), 'bytes': len(value), 'sha256': sha(value)}
              for src, dest, value in copies]
    save(OUT / 'copy-before1004.json', before)
    for src, dest, value in copies:
        with dest.open('xb') as stream:
            stream.write(value)
        assert sha(dest.read_bytes()) == sha(value)
    save(OUT / 'copy-after1004.json', [{**item, 'copiedSha256': item['sha256'], 'equal': True,
                                      'originalPreserved': True} for item in before])
    white = Image.new('RGBA', image.size, 'white')
    white.alpha_composite(image)
    white.convert('RGB').save(OUT / 'source-white1004.png')
    completed = PARENT / 'aokiji-compact30-completed1004.jpg'
    observed = datetime.fromtimestamp(completed.stat().st_mtime).astimezone().isoformat()
    result = record_source(argparse.Namespace(
        key='aokiji_low_holds_compact30_1004', source=DEST.relative_to(ROOT).as_posix(),
        prompt='docs/assets/aokiji-low-hold-compact30-repair-prompt1004.txt',
        catalog='scripts/roster_marine_sources0929.json',
        session='https://chatgpt.com/c/6abbd1ab-c850-83ee-be64-98d5e18d691c',
        observed_completed_at=observed, entry_url='https://chatgpt.com/images/', entry_title='ChatGPT',
        text_model_label='最新', reasoning_effort='极高', browser_label='Codex内置浏览器',
        model_unavailable_statement='root在原青雉官方会话实际核验最新/极高，model/draft/completed1004截图保全；本助手复看截图确认ChatGPT与极高显示，具体图像后台型号未公开，不记2.5。',
        ui_observation='root在原青雉官方IAB会话提交compact30局部修提示，附件为正确compact30关节指南，model/draft/completed截图已保全。完成查看器显示3格青雉、完整站尺与两格低握。原生下载未落盘后，在同一官方文件入口的空间页面https://chatgpt.com/space/file/libfile_69fcaab0b2408191b283a012e86dc15b，使用支持的pageAssets.list/bundle只导出已显示PNG，downloaded1/failed0；root bundle记录与Temp manifest原字节保全，未重发未换站。空间侧栏文字型号不作生成依据。本助手实际看原PNG，PNG签名/IEND/Pillowverify/完整RGBAdecode/2172x724真实alpha0..255/重复稳定原字节/SHA与root一致，先清单复制原件和manifest再哈希核验。完成时间是实际完成复核截图保存时间，非服务器首次生成时间。两格仍把手贴在自己的前小腿，双鞋仍宽；只登记来源失败稿，不改runtime或作者映射。',
        screenshot=completed.as_posix(), reference=['aokiji_low_holds_1004'],
    ))
    for path in protected:
        assert sha(path.read_bytes()) == protected_before[str(path)]
    save(OUT / 'intake-result1004.json', {'source': result, 'bundleManifestSha256': sha(bundle),
                                         'status': 'failed-source-preserved-not-adopted',
                                         'runtimeAndAuthoringBeforeAndAfter': protected_before,
                                         'runtimeOrRootOrMovesModified': False})
    print(json.dumps({'source': result, 'size': image.size, 'alpha': image.getchannel('A').getextrema(),
                      'adopted': False, 'runtimeAndAuthoringUnchanged': True}, ensure_ascii=False))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    main()
