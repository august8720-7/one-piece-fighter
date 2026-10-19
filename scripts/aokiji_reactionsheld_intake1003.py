"""Verify/copy the single GUI-downloaded Aokiji reactions/held PNG and record it."""
import argparse
import hashlib
import io
import json
from datetime import datetime
from pathlib import Path
from PIL import Image
from record_roster_source0929 import record_source

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-reactionsheld1003')
SOURCE = Path('C:/Users/august/Downloads/青雉八姿透明精灵图合集.png.crdownload')
DEST = ROOT / 'public/assets/generated/source/roster-aokiji-reactions-held-1003.png'
SCREEN = EVIDENCE / 'completed-viewer-2036-1003.png'

def save(name, value):
    with (EVIDENCE / name).open('x', encoding='utf8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

def sha(value):
    return hashlib.sha256(value).hexdigest()

def main():
    assert (EVIDENCE / 'README.md').is_file()
    original = SOURCE.read_bytes()
    assert original.startswith(b'\x89PNG\r\n\x1a\n')
    assert original.endswith(bytes.fromhex('0000000049454e44ae426082'))
    with Image.open(io.BytesIO(original)) as image:
        assert image.format == 'PNG'
        image.verify()
    with Image.open(io.BytesIO(original)) as image:
        rgba = image.convert('RGBA')
        rgba.load()
        size = list(rgba.size)
        alpha = list(rgba.getchannel('A').getextrema())
    assert SOURCE.read_bytes() == original, 'Download still changing; preserve and wait'
    assert not DEST.exists(), 'Preserve existing source; no replacement'
    before = {'source':str(SOURCE), 'destination':str(DEST), 'bytes':len(original),
              'sha256':sha(original), 'size':size, 'alpha':alpha,
              'browserDownloadState':'crdownload-preserved',
              'verified':['PNG signature', 'IEND terminal chunk', 'Pillow verify',
                          'full RGBA decode', 'stable repeated bytes'],
              'observedAt':datetime.now().astimezone().isoformat()}
    save('copy-before1003.json', before)
    with DEST.open('xb') as stream:
        stream.write(original)
    copied = DEST.read_bytes()
    assert sha(copied) == sha(original)
    save('copy-after1003.json', {**before, 'copiedSha256':sha(copied), 'equal':True,
                               'originalPreserved':SOURCE.is_file()})
    white = Image.new('RGBA',rgba.size,'white')
    white.alpha_composite(rgba)
    white.convert('RGB').save(EVIDENCE / 'source-white1003.png')
    observed = datetime.fromtimestamp(SCREEN.stat().st_mtime).astimezone().isoformat()
    receipt = record_source(argparse.Namespace(
        key='aokiji_reactions_held_1003',
        source=DEST.relative_to(ROOT).as_posix(),
        prompt='docs/assets/aokiji-reactions-held-prompt1003.txt',
        catalog='scripts/roster_marine_sources0929.json',
        session='https://chatgpt.com/c/6abbd1ab-c850-83ee-be64-98d5e18d691c',
        observed_completed_at=observed,
        entry_url='https://chatgpt.com/images/', entry_title='ChatGPT',
        text_model_label='最新', reasoning_effort='极高', browser_label='Microsoft Edge',
        model_unavailable_statement='沿本会话已实际核对的最新选中与极高第四项继续官方图像制作；具体图像后台型号未公开，不记为2.5。',
        ui_observation='本助手接续同一独占青雉Edge会话中已单次有效提交的八姿完整提示，现场见思考中且没有成图，未重复发送；保存2033 pending截图和DOM后原会话正常reload恢复。随后真实最新响应出现成图，打开最新查看器，标题青雉八姿透明精灵图合集，img已生成图像5，八格完整人物可见。时间取实际完成复核截图保存，不是服务器首次生成。只点一次原生下载；Downloads保留crdownload但PNG签名、IEND、Pillowverify、全RGBA解码和稳定两次原字节实证通过，先清单复制并SHA一致。查看器灰色占位不作人物像素证据，原PNG白底另检。尚未把条件脚踝静态候选当成实际抓投或完整游戏通过。',
        screenshot=SCREEN.as_posix(), reference=['marine_mother_0929'],
    ))
    save('source-receipt-result1003.json', receipt)
    print(json.dumps({'copy':before,'receipt':receipt},ensure_ascii=False))

if __name__ == '__main__':
    main()
