"""Reuse the verified1013 native loader with1017 D-only candidate/evidence roots.

Same unchanged checkpoint/device rules/identity checks/blind content and quality
prompts. Does not install/download anything. Run only after serial GPU scheduling.
"""
import importlib.util
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')
spec = importlib.util.spec_from_file_location('verified_native1013', ROOT / 'scripts/roster_voice_native_cpuvisual1013.py')
loader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loader)
loader.CLOSURE = BASE / 'candidate/audio1017'
loader.OUTPUT = BASE / 'acceptance/audio1017/native'
if __name__ == '__main__':
    loader.OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    modes = [value for value in ('--game-mix', '--identity-compare', '--content-and-mix') if value in sys.argv]
    assert len(modes) <= 1, 'Use one explicit auditory purpose per batch'
    mode = modes[0] if modes else None
    if mode:
        sys.argv.remove(mode)
        prompt = ('音频前后两段人声之间有一小段静音。只从实际音色听感判断：是否存在明显换了一个说话人的违和感？'
                  '只能先答“明显”“不明显”或“不确定”，再用一句说明音高或音质依据。'
                  '不要凭台词内容、同语言、同性别或年龄相同就推定同一声线；不要猜演员或角色。'
                  '证据不足必须回答不确定。不用ASR或波形代替聆听。')
        purpose = 'native auditory continuity risk only; never actor identity certification'
        if mode == '--game-mix':
            loader.CLOSURE = BASE / 'acceptance/audio1017'
            prompt = ('这段实际游戏混音中，人物的有内容台词是否能完整听清？'
                      '请先逐字写出实际听清的短句原文，不清楚就写不确定；再说明是否有人声互抢、被音乐或击打音效盖住、半句截断或明显爆音，只列真正听到的问题。'
                      '游戏音乐和击打音效本来就应存在，不把存在本身当缺陷。'
                      '不凭文件名或脚本猜台词或角色，不用ASR或波形替代聆听。')
            purpose = 'actual post-master game mix: intelligible words and interference, not dry-voice absence-of-music acceptance'
        elif mode == '--content-and-mix':
            # One unchanged native model load may review new dry speech and an
            # original continuous mix. Only the content prompt is generic;
            # dry quality-only rows still use the original independent prompt.
            allowed_dry = (BASE / 'candidate/audio1017').resolve()
            allowed_mix = (BASE / 'acceptance/audio1017').resolve()
            rows = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))['clips']
            for row in rows:
                source = Path(row['path']).resolve()
                scope = row.get('qaPurpose')
                assert scope in {'dry-content', 'dry-quality', 'game-mix'}, 'Explicit per-clip purpose required'
                assert source.is_relative_to(allowed_mix if scope == 'game-mix' else allowed_dry)
                assert row.get('reviewMode', 'content_and_quality') == ('quality_only' if scope == 'dry-quality' else 'content_and_quality')
            loader.CLOSURE = BASE
            prompt = ('请直接聆听实际音频。先逐字写出实际听清的短句原文和语言，不能只给语言；不清楚就写不确定。'
                      '再分别说明人声开头结尾是否完整、有无不自然重复或多余尾声，以及是否有人声互抢、被音乐或击打声盖住、半句截断或明显失真。'
                      '音乐或击打声若实际存在，存在本身不算缺陷，只判断是否妨碍台词。只报告真正听到的内容，没有依据写不确定。'
                      '不根据文件名或脚本猜台词/角色，不用ASR或波形替代聆听。')
            purpose = 'generic blind content and interference question; explicit new dry-content/dry-quality and continuous game-mix clips; one unchanged loader/model load'
        original_module = loader.module
        def scoped_module(name, path):
            value = original_module(name, path)
            if name == 'native_rules_cpuvisual1013':
                value.PROMPT = prompt
            return value
        loader.module = scoped_module
        record = loader.OUTPUT.parent / (mode[2:] + '-invocation-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.json')
        with record.open('x', encoding='utf-8') as stream:
            json.dump({'purpose': purpose,
                       'prompt': prompt, 'wrapperSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                       'catalog': sys.argv[1], 'loaderUnchanged': True}, stream, ensure_ascii=False, indent=2)
        record.with_suffix('.source.py').write_bytes(Path(__file__).read_bytes())
    loader.main()
