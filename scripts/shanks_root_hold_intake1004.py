"""Archive an observed official-web holding source without adopting or redrawing it."""
from pathlib import Path
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import argparse
import hashlib
import json
import re
import shutil
from PIL import Image
import record_roster_source0929 as recorder

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509')


def write_new(path, value):
    with path.open('x', encoding='utf-8') as output:
        output.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('key')
    parser.add_argument('download', type=Path)
    parser.add_argument('prompt', type=Path)
    parser.add_argument('screenshot', type=Path)
    parser.add_argument('--viewer-title', required=True)
    parser.add_argument('--observation', required=True)
    args = parser.parse_args()
    assert re.fullmatch(r'shanks_[a-z0-9_]+_100[34]', args.key)
    source = args.download.resolve()
    prompt = (ROOT / args.prompt).resolve()
    screenshot = args.screenshot.resolve()
    assert source.is_file() and source.is_relative_to(Path('C:/Users/august/Downloads').resolve())
    assert prompt.is_file() and prompt.is_relative_to((ROOT/'docs/assets').resolve())
    assert screenshot.is_file() and screenshot.is_relative_to(EVIDENCE.resolve())
    assert (EVIDENCE/'README.md').is_file()
    payload = source.read_bytes()
    assert payload[:8] == b'\x89PNG\r\n\x1a\n' and payload[-12:] == b'\x00\x00\x00\x00IEND\xaeB`\x82'
    with Image.open(source) as picture:
        picture.load()
        assert picture.format == 'PNG' and picture.mode == 'RGBA'
        assert picture.getchannel('A').getextrema()[0] == 0
        size = list(picture.size)
    destination = ROOT/'public/assets/generated/source'/('roster-'+args.key.replace('_','-')+'.png')
    assert not destination.exists(), 'Do not overwrite original drawings'
    identity = {'source':str(source),'destination':str(destination),'bytes':len(payload),
                'sha256':hashlib.sha256(payload).hexdigest(),'size':size,'adopted':False}
    write_new(EVIDENCE/(args.key+'-copy-before.json'),identity)
    shutil.copy2(source,destination)
    assert destination.read_bytes() == payload
    write_new(EVIDENCE/(args.key+'-copy-after.json'),{**identity,'verified':True})
    observed = datetime.fromtimestamp(screenshot.stat().st_mtime,timezone(timedelta(hours=8))).isoformat()
    result = recorder.record_source(SimpleNamespace(
        key=args.key,source=destination.relative_to(ROOT).as_posix(),
        prompt=prompt.relative_to(ROOT).as_posix(),catalog='scripts/roster_shanks_hold_sources1004.json',
        session='https://chatgpt.com/c/6ac0f91e-dfc4-83ec-9089-110fa53eaf16',
        observed_completed_at=observed,entry_url='https://chatgpt.com/images/',entry_title='ChatGPT',
        text_model_label='最新',reasoning_effort='极高',browser_label='Codex内置浏览器',
        model_unavailable_statement='官方页面未公开具体图像型号，保留unverified，不推断后台型号。',
        ui_observation=f'实际内置官方会话，最新radio/极高第4项已核实并留截图。{args.observation} '
            f'查看器真实文件标题{args.viewer_title}。完成观察时间取实际截图mtime，不称服务器生成时间。'
            '原生下载只点一次；不依赖download事件回执，实际落盘原PNG签名/IEND/完整解码、alpha和复制SHA已核。'
            '此记录只归档来源，不表示造型或抓投采用。',
        screenshot=screenshot.as_posix(),reference=[]))
    print(json.dumps(result,ensure_ascii=False))


if __name__ == '__main__':
    main()
