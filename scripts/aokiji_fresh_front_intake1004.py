"""Preserve and inspect the fresh official front holding without runtime adoption."""
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
OUT = PARENT / 'fresh-front-review1004'
ORIGINAL = Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/6e653894-ce86-45c1-81b9-2e3da0f2e3e5/de4e8273859c5947')
DEST = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-fresh-1004.png'
EXPECTED = '6518a82260d7054597cf57b23c19b1fad8a9fd290323fa9d8643fda87472aa05'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def main():
    global OUT, ORIGINAL, DEST, EXPECTED
    joint = sys.argv[1:] == ['--joint-repair']
    assert sys.argv[1:] in [[], ['--joint-repair'], ['--joint2'], ['--joint3']]
    key = 'aokiji_low_hold_front_fresh_1004'
    prompt = 'docs/assets/aokiji-low-hold-fresh-front-prompt1004.txt'
    file_id = 'libfile_65c5006d75e88191bcbe134e078e6cd1'
    length = 985003
    completed = PARENT / 'aokiji-fresh-front-completed1004.jpg'
    observation = 'root使用新的独立官方会话，仅附完整已采用青雉站姿与正确compact30关节指南，按本助手已准备的两格短提示发送，未附低握失败图。现场最新/极高证据和完整draft/完成查看器截图在acceptance/aokiji-low-hold1004。原图完成后通过同一官方Space文件，使用支持的pageAssets导出已显示PNG；原manifest只有1项image/png、failures为空，不重发不换站，空间侧栏型号不作生成依据。本助手实际看原PNG，两格完整青雉，第二格深蹲和手腿分离确有改善。'
    references = ['aokiji_blow_throws_1003']
    browser_label = 'Codex内置浏览器'
    model_statement = 'root在新独立青雉官方会话实际核验最新与极高；model/draft/completed截图已保存，具体图像后台型号未公开，不记2.5。'
    if joint:
        OUT = PARENT / 'fresh-front-joint1-review1004'
        ORIGINAL = Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/b93953c9-98d3-41af-b4c2-fa5367e82f75/d334f5661e1e660e')
        DEST = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-joint1-1004.png'
        EXPECTED = '68821242fd8639281926f6924b1035f2d9d4c063408e6d457e3e0cade189af4d'
        key = 'aokiji_low_hold_front_joint1_1004'
        prompt = 'docs/assets/aokiji-low-hold-fresh-front-joint-repair-prompt1004.txt'
        file_id = 'libfile_be6a8abaf63c819199293d5d6236c5ec'
        length = 987511
        completed = PARENT / 'aokiji-fresh-front-joint-completed1004.jpg'
        references = ['aokiji_low_hold_front_fresh_1004']
        observation = '本助手先在Edge实际核验最新radio checked/极高第4共5并留证，但setFiles受已有本地fileURL权限限制，没有填提示或提交，不改扩展权限。单控制者临时交给root现有IAB9，root原生上传fresh原PNG和绿色测点guide，完整joint短提示读回匹配后单次发送，joint-repair-latest-extra-high/draft/sent1004凭据保存。root提交后交回本助手，Edge原确切会话刷新导致一次绑定失联，按真实库存同tab843472206重新绑定恢复，没有重发。实际完整第二条用户消息与提示一致，最新图片查看器标题青雉双姿态透明精灵图，当前img已生成图像2；完成复核截图保存于同层。点击该实际文件菜单在空间中打开，经真实Space URL和DOM可见同名PNG，pageAssets.list/bundle只取已显示的对应image资产，下载1/失败0，原manifest和完整bundle JSON保留。空间sidebar型号不作生成依据。原图两格、相同1774x887，手区靠拢有实际改善；手点仍待量测，不登记接触通过。'
    elif sys.argv[1:] == ['--joint2']:
        OUT = PARENT / 'fresh-front-joint2-review1004'
        ORIGINAL = Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/d63e0864-cd79-4e0d-ad92-917c6c73a4e9/b3159fe967b02d7d')
        DEST = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-joint2-1004.png'
        EXPECTED = '346d1f0cf2ecf9d40b26a092222afa649076f318f83b83fef4a785deb6c4d786'
        key = 'aokiji_low_hold_front_joint2_1004'
        prompt = 'docs/assets/aokiji-low-hold-front-joint2-prompt1004.txt'
        file_id = 'libfile_919b78bd438c81919f80c556841cab9b'
        length = 1066445
        completed = PARENT / 'aokiji-front-joint2-completed1004.jpg'
        references = ['aokiji_low_hold_front_joint1_1004']
        browser_label = 'Microsoft Edge'
        model_statement = '本助手在此确切会话实际菜单核验最新aria-checked=true，极高第4/5并截图；具体图像后台型号仍未公开。'
        observation = '本助手Edge单控制者返回同一fresh会话，实际菜单最新radio true/极高第4共5；只点最新图编辑，官方侧栏同名青雉双姿态透明精灵图显示img2。沿此前实际已上传green指南，不再上传新文件。完整368字joint2短提示fill后innerText逐字匹配，只点发送一次，真实第三条用户消息带已编辑的图像、完整提示、ChatGPT正在回应/停止/正在生成图像；model/draft/sent截图与send-observation JSON留存。随后实际回答已完成，官方侧栏生成的图像3、img3，文件标题青雉库赞双姿态透明立绘；本助手全屏保全完成截图，按该文件菜单在空间中打开，pageAssets发现已显示对应PNG，只bundle该1项、成功1/失败0，原manifest与完整bundle保留。原件整体人物与站高有变化，不能声称其他像素不变；手区灰色占位待审，不提前登记透明或接触通过。'
    elif sys.argv[1:] == ['--joint3']:
        OUT = PARENT / 'fresh-front-joint3-review1004'
        ORIGINAL = Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/ea5411a5-9e16-48a3-b568-43e4696bd156/a5306498c2e2f18f')
        DEST = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-joint3-1004.png'
        EXPECTED = '5cc59be048e6d2cb4a5341f7c348638b848b06fd74f33fa722708495bfe48462'
        key = 'aokiji_low_hold_front_joint3_1004'
        prompt = 'docs/assets/aokiji-low-hold-front-joint3-prompt1004.txt'
        file_id = 'libfile_46ec381a62c481918fa516e3223c62a2'
        length = 1034732
        completed = PARENT / 'aokiji-front-joint3-completed1004.jpg'
        references = ['aokiji_low_hold_front_joint2_1004']
        browser_label = 'Microsoft Edge'
        model_statement = '本助手同一官方会话在第三次局部修前实际核验最新aria-checked=true/极高第4共5并截图；具体图像后台型号未公开。'
        observation = '本助手Edge单控制者在同一fresh会话，实际最新radio true/极高第4共5，点击最新图编辑，侧栏img3、青雉库赞双姿态透明立绘。348字最后一次joint3短提示fill后innerText完全匹配，仅点发送一次，无新上传，实际第四条用户消息包含已编辑的图像和完整要求，随后ChatGPT正在回应/停止/正在生成图像，model/draft/sent及send-observation留存。独立工作后读取实际回答已完成，侧栏青雉双姿势角色立绘、img4；全屏截图保全。通过该实际文件菜单在空间中打开，真实fileURL，pageAssets只bundle已显示对应PNG1项、成功1/失败0，原manifest和完整bundle JSON保留。不换站不重放登录，没有第4次局部请求。手区仍有灰蓝色待审，来源保全不表示透明或抓持放行，按第三次上限停止这一机械续修路线。'
    assert (OUT / 'README.md').is_file()
    protected = [ROOT / 'public/assets/characters/aokiji/anime/runtime.json',
                 ROOT / 'scripts/roster_aokiji_manifest0929.json']
    unchanged = {str(path): sha(path.read_bytes()) for path in protected}
    blob = ORIGINAL.read_bytes()
    bundle = (ORIGINAL.parent / 'manifest.json').read_bytes()
    assert sha(blob) == EXPECTED and len(blob) == length
    assert blob.startswith(b'\x89PNG\r\n\x1a\n') and blob.endswith(bytes.fromhex('0000000049454e44ae426082'))
    with Image.open(io.BytesIO(blob)) as source:
        assert source.format == 'PNG'
        source.verify()
    image = Image.open(io.BytesIO(blob)).convert('RGBA')
    image.load()
    assert image.size == (1774, 887) and image.getchannel('A').getextrema() == (0, 255)
    assert ORIGINAL.read_bytes() == blob
    manifest = json.loads(bundle)
    assert not manifest['failures'] and len(manifest['assets']) == 1
    assert manifest['assets'][0]['url'] == f'https://chatgpt.com/api/library/files/{file_id}/content'
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
    result = record_source(argparse.Namespace(
        key=key, source=DEST.relative_to(ROOT).as_posix(), prompt=prompt,
        catalog='scripts/roster_marine_sources0929.json',
        session='https://chatgpt.com/c/6ac1c91d-9a4c-83ee-90f8-5e05fd1c1774',
        observed_completed_at=datetime.fromtimestamp(completed.stat().st_mtime).astimezone().isoformat(),
        entry_url='https://chatgpt.com/images/', entry_title='ChatGPT', text_model_label='最新',
        reasoning_effort='极高', browser_label=browser_label,
        model_unavailable_statement=model_statement,
        ui_observation=observation + f'官方原文件https://chatgpt.com/space/file/{file_id}。PNG签名/IEND/Pillowverify/全RGBAdecode/1774x887真实alpha0..255/重复稳定原字节均通过，先清单复制原件、manifest和旧来源表再SHA一致。完成时间取本次完成复核截图，不是服务器首次生成。来源保全不代表握位/美术或实机验收通过，尚未改runtime或作者映射。',
        screenshot=completed.as_posix(), reference=references,
    ))
    crops = []
    for i, name in enumerate(['neutral', 'front-hold']):
        crop = [i * 887, 0, 887, 887]
        body = image.crop((i * 887, 0, (i + 1) * 887, 887))
        body.save(OUT / f'{name}-original-cell1004.png')
        white = Image.new('RGBA', body.size, 'white')
        white.alpha_composite(body)
        white.convert('RGB').save(OUT / f'{name}-white-cell1004.png')
        alpha = body.getchannel('A')
        bounds = {str(n): alpha.point(lambda value: 255 if value >= n else 0).getbbox()
                  for n in [1, 16, 64, 128]}
        crops.append({'name': name, 'crop': crop, 'excludeRects': [], 'bounds': bounds,
                      'alpha64Height': bounds['64'][3] - bounds['64'][1],
                      'alpha16EdgePixels': {
                          'left': sum(alpha.getpixel((0, y)) >= 16 for y in range(887)),
                          'right': sum(alpha.getpixel((886, y)) >= 16 for y in range(887)),
                          'top': sum(alpha.getpixel((x, 0)) >= 16 for x in range(887)),
                          'bottom': sum(alpha.getpixel((x, 886)) >= 16 for x in range(887)),
                      }, 'sourceHash': EXPECTED, 'imageScaled': False})
    save(OUT / 'inspected-crops1004.json', crops)
    for path in protected:
        assert sha(path.read_bytes()) == unchanged[str(path)]
    save(OUT / 'intake-result1004.json', {'source': result, 'status': 'source-preserved-not-adopted',
                                        'bundleManifestSha256': sha(bundle), 'crops': crops,
                                        'runtimeAndAuthoringBeforeAndAfter': unchanged,
                                        'runtimeOrRootOrMovesModified': False})
    print(json.dumps({'source': result, 'crops': crops, 'adopted': False,
                      'runtimeAndAuthoringUnchanged': True}, ensure_ascii=False))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    main()
