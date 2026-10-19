"""Record one already-downloaded official-web Shanks page, without generating art.

This character-scoped helper only copies source PNG bytes, preserves before/after
inventories, reuses the strict roster receipt tool, and writes a diagnostic matte
on the declared D: evidence root. It never redraws pixels or changes runtime data.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
from types import SimpleNamespace

from PIL import Image
import record_roster_source0929 as recorder

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509')
DOWNLOADS = Path('C:/Users/august/Downloads').resolve()


def write_new(path: Path, value: object) -> None:
    with path.open('x', encoding='utf-8') as output:
        output.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('key')
    parser.add_argument('download', type=Path)
    parser.add_argument('prompt', type=Path)
    parser.add_argument('screenshot', type=Path)
    parser.add_argument('--viewer-title', required=True)
    parser.add_argument('--download-observation', default='官方文件查看器下载只点一次；Downloads正式PNG已落盘，没有以download事件回执作为成功证据。')
    parser.add_argument('--reference', action='append', default=['shanks_locomotion_0929'])
    args = parser.parse_args()
    assert re.fullmatch(r'shanks_[a-z0-9_]+_1003', args.key), 'Shanks source key required'
    original = args.download.resolve()
    assert original.is_relative_to(DOWNLOADS) and original.is_file(), 'Actual Downloads original required'
    assert EVIDENCE.is_dir() and (EVIDENCE / 'README.md').is_file(), 'Declared evidence structure required'
    prompt = (ROOT / args.prompt).resolve()
    screenshot = args.screenshot.resolve()
    assert prompt.is_relative_to((ROOT / 'docs/assets').resolve()) and prompt.is_file()
    assert screenshot.is_relative_to(EVIDENCE.resolve()) and screenshot.is_file()
    payload = original.read_bytes()
    assert payload[:8] == b'\x89PNG\r\n\x1a\n' and payload[-12:] == b'\x00\x00\x00\x00IEND\xaeB`\x82', 'Complete PNG required'
    digest = hashlib.sha256(payload).hexdigest()
    with Image.open(original) as image:
        image.load()
        assert image.format == 'PNG' and image.mode == 'RGBA'
        size, alpha = list(image.size), list(image.getchannel('A').getextrema())
        assert alpha[0] == 0 and alpha[1] > 0, 'Actual transparent source required'
        white = Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image).convert('RGB')
    destination = ROOT / 'public/assets/generated/source' / ('roster-' + args.key.replace('_', '-') + '.png')
    assert not destination.exists(), 'Do not overwrite source drawings'
    inventory = {'source': str(original), 'destination': str(destination), 'bytes': len(payload), 'sha256': digest}
    write_new(EVIDENCE / (args.key + '-copy-before.json'), inventory)
    shutil.copy2(original, destination)
    assert destination.read_bytes() == payload, 'Copy bytes/hash mismatch'
    write_new(EVIDENCE / (args.key + '-copy-after.json'), {**inventory, 'verified': True})
    # A source observation timestamp comes from this real screenshot, never server timing.
    observed = datetime.fromtimestamp(screenshot.stat().st_mtime, timezone(timedelta(hours=8))).isoformat()
    result = recorder.record_source(SimpleNamespace(
        key=args.key, source=destination.relative_to(ROOT).as_posix(),
        prompt=prompt.relative_to(ROOT).as_posix(), catalog='scripts/roster_pirate_sources0929.json',
        session='https://chatgpt.com/c/6abbd2b4-2644-83e8-ad51-9d1f0fd79722',
        observed_completed_at=observed, entry_url='https://chatgpt.com/images/', entry_title='ChatGPT',
        text_model_label='最新', reasoning_effort='极高', browser_label='Codex内置浏览器',
        model_unavailable_statement='官方页面仅显示ChatGPT，具体图像型号未公开且未核实，不推断后台型号。',
        ui_observation=f'1003同一香克斯官方会话续作。提交前DOM实见最新radio选中、极高第4项；完整UTF-8提示经textbox.fill读回匹配原文（仅界面空白归一化）后单次发送。页面回答已完成，实际查看器标识{args.viewer_title}。时间来自该真实结果截图保存时刻，是完成观察而非服务器生成时间。{args.download_observation} 完整PNG签名/IEND、Pillow全解码、真实alpha、SHA256及复制前后记录均实证。既有images为工作流入口，本次直接续c会话。',
        screenshot=screenshot.as_posix(), reference=list(dict.fromkeys(args.reference)),
    ))
    white.save(EVIDENCE / (args.key + '-white.jpg'))
    print(json.dumps({**result, 'alpha': alpha, 'originalPreserved': str(original)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
