"""Preserve root's official observed pageAssets PNG and manifest without art adoption."""
from pathlib import Path
from datetime import datetime
import hashlib
import io
import json
import argparse
from PIL import Image
from record_roster_source0929 import record_source

ROOT=Path(__file__).resolve().parents[1]
FOLDER=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004')
ORIGINAL=Path('C:/Users/august/AppData/Local/Temp/browser-use/assets/0106aa57-c72e-4fb0-ae0e-74ef4862c3ec/3c6b561253df08f3')
BUNDLE=ORIGINAL.parent/'manifest.json'
DEST=ROOT/'public/assets/generated/source/roster-aokiji-low-hold-1004.png'
EXPECTED='d504a6abfbe0560f471ee57cff06c135771dbe1cd3a99781c596cdc7e6b283e6'

def sha(value):return hashlib.sha256(value).hexdigest()
def save(path,value):
    with path.open('x',encoding='utf8') as stream:json.dump(value,stream,ensure_ascii=False,indent=2)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record-only',action='store_true')
    args=parser.parse_args()
    assert (FOLDER/'README.md').is_file()
    blob=ORIGINAL.read_bytes();bundle=BUNDLE.read_bytes()
    assert sha(blob)==EXPECTED and len(blob)==1216940
    assert blob.startswith(b'\x89PNG\r\n\x1a\n') and blob.endswith(bytes.fromhex('0000000049454e44ae426082'))
    with Image.open(io.BytesIO(blob)) as image:assert image.format=='PNG';image.verify()
    image=Image.open(io.BytesIO(blob)).convert('RGBA');image.load()
    assert image.size==(1586,992) and image.getchannel('A').getextrema()==(0,255)
    assert ORIGINAL.read_bytes()==blob and BUNDLE.read_bytes()==bundle
    destination_manifest=FOLDER/'official-bundle-manifest1004.json'
    before=[{'source':str(ORIGINAL),'destination':str(DEST),'bytes':len(blob),'sha256':sha(blob)},
            {'source':str(BUNDLE),'destination':str(destination_manifest),'bytes':len(bundle),'sha256':sha(bundle)}]
    if not args.record_only:
        save(FOLDER/'copy-before1004.json',before)
        for item,value in zip(before,[blob,bundle]):
            with Path(item['destination']).open('xb') as stream:stream.write(value)
            assert sha(Path(item['destination']).read_bytes())==item['sha256']
        save(FOLDER/'copy-after1004.json',[{**item,'copiedSha256':item['sha256'],'equal':True,'originalPreserved':True} for item in before])
        white=Image.new('RGBA',image.size,'white');white.alpha_composite(image)
        white.convert('RGB').save(FOLDER/'source-white1004.png')
    else:
        assert json.loads((FOLDER/'copy-before1004.json').read_text(encoding='utf8'))==before
        for item in before:assert sha(Path(item['destination']).read_bytes())==item['sha256']
    completed=FOLDER/'aokiji-low-hold-completed1004.jpg'
    observed=datetime.fromtimestamp(completed.stat().st_mtime).astimezone().isoformat()
    result=record_source(argparse.Namespace(
        key='aokiji_low_holds_1004',source=DEST.relative_to(ROOT).as_posix(),
        prompt='docs/assets/aokiji-low-hold-prompt1004.txt',catalog='scripts/roster_marine_sources0929.json',
        session='https://chatgpt.com/c/6abbd1ab-c850-83ee-be64-98d5e18d691c',
        observed_completed_at=observed,entry_url='https://chatgpt.com/images/',entry_title='ChatGPT',
        text_model_label='最新',reasoning_effort='极高',browser_label='Codex内置浏览器',
        model_unavailable_statement='主集成在原官方会话刷新后实际核验最新radio与极高第4/5，model1004截图保全；具体图像后台型号没有公开，不记2.5。',
        ui_observation='root在原青雉官方IAB会话实际核验最新/极高，原生filechooser上传完整既有站姿与wide抽象低握指南，完整1269字提示读回匹配后只发送一次。model/draft/completed1004截图同层保全。已有完成图在查看器实际可见，但原生下载与downloadMedia未落盘；不重发，使用同一官方文件操作在空间打开，实际https://chatgpt.com/space/file/libfile_40782eb1cef881918fe225032f203377显示同一青雉风格角色三姿态精灵图.png，已显示img源为相应/api/library/files/libfile_40782.../content。支持的pageAssets.list/bundle只取该PNG，downloaded1 failed0，原bundle manifest已保全。这是只读文件取回，空间sidebar模型不作生成依据。本人独立实查PNG签名/IEND/Pillowverify/全RGBAdecode/1586x992真实alpha0..255/重复稳定字节，与rootSHA相等，先清单复制原件与manifest再SHA核验。完成时刻取实际原会话完成复核截图，不是服务器首次生成。原件有手靠自己小腿和边界紧的待审问题，来源登记不等于美术/接触采用。',
        screenshot=completed.as_posix(),reference=['aokiji_blow_throws_1003'],
    ))
    save(FOLDER/'intake-result1004.json',{'source':result,'bundleManifestSha256':sha(bundle),'status':'source-preserved-not-adopted',
                                        'runtimeOrRootOrMovesModified':False})
    print(json.dumps({'source':result,'size':image.size,'alpha':image.getchannel('A').getextrema(),
                      'bundleManifestSha256':sha(bundle),'adopted':False},ensure_ascii=False))

if __name__=='__main__':main()
