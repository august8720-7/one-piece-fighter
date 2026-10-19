"""Explicit Z/X/C/V original-body registration, including inspected neighbor cuts."""
from __future__ import annotations
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw

PROJECT = Path(__file__).resolve().parents[1]
MANIFEST = PROJECT / "scripts/roster_aokiji_manifest0929.json"
EVIDENCE = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-zxcv1003")
KEY = "aokiji_zxcv_body_1003"
HASH = "ebe916de97d47c3f9ba4d7be7da87d6de93064e587eb7b4c8443564ffd6eabf6"
NAMES = ["ice_body_start_1003", "ice_body_evade_1003", "ice_body_return_1003", "pheasant_start_1003", "pheasant_release_1003", "pheasant_recover_1003", "glacier_start_1003", "glacier_release_1003", "glacier_recover_1003", "ice_age_start_1003", "ice_age_hold_1003", "ice_age_recover_1003"]
ROOTS = [[194,345],[184,335],[206,346],[176,324],[183,316],[181,324],[193,294],[208,228],[199,301],[187,321],[190,306],[188,318]]
SOCKETS = {4: {"palm_release": [372,74], "fingertips": [381,43]}, 7: {"near_palm": [209,212], "near_fingertips": [207,230], "far_palm": [265,211], "far_fingertips": [269,222]}, 10: {"palm_forward": [372,56], "fingertips": [381,31]}}

def sha(blob): return hashlib.sha256(blob).hexdigest()
def save(path, value):
    with Path(path).open("x",encoding="utf-8") as out: json.dump(value,out,ensure_ascii=False,indent=2)

def main():
    sys.stdout.reconfigure(encoding="utf-8")
    before=MANIFEST.read_bytes();manifest=json.loads(before);char=manifest["characters"]["aokiji"]
    assert not any(name in char["frames"] for name in NAMES),"Already registered; preserve receipt"
    catalog=json.loads((PROJECT/"scripts/roster_marine_sources0929.json").read_text(encoding="utf-8"))
    source=json.loads(json.dumps(catalog["sources"][KEY]));path=PROJECT/source["file"]
    assert source["sha256"]==HASH==sha(path.read_bytes())
    original=Image.open(path).convert("RGBA");original.load()
    reviewed=json.loads((EVIDENCE/"explicit-crop-neighbor-review1003.json").read_text(encoding="utf-8"))
    assert len(reviewed)==12 and all(row["ownVisibleAlpha16PixelsExcluded"]==0 for row in reviewed)
    assert reviewed[0]["alpha64Height"]==337
    source["unitScale"]=407/337
    source["scaleBasis"]="One Z normal-material standing guard at cell1, explicit crop[48,9,355,353], alpha>=64 bbox[8,8,346,345], height337px against established neutral407px. All12poses share407/337 including ice material/kneeling/wide stances, no per-row/pose scale."
    char["sources"][KEY]=source;world=char["scale"]*source["unitScale"]/2
    (EVIDENCE/"authoring-before.json").write_bytes(before)
    rows=[]
    for i,(name,r,root) in enumerate(zip(NAMES,reviewed,ROOTS)):
        frame={"source":KEY,"crop":r["crop"],"root":root,"sockets":SOCKETS.get(i,{}),"transparency":{"mode":"source-alpha"},"note":"Actual original cell. Inspected explicit neighbor exclusion removes only foreign-pose scraps; own visible alpha16 body pixels preserved. One sheet scale, no pose rotation/mirror. Independent FX/contact and normal-speed review remain separate."}
        if r["excludeRects"]:frame["excludeRects"]=r["excludeRects"]
        x,y,w,h=r["crop"];cut=original.crop((x,y,x+w,y+h))
        for ex,ey,ew,eh in r["excludeRects"]:cut.paste((0,0,0,0),(ex,ey,ex+ew,ey+eh))
        bbox=cut.getchannel("A").point(lambda a:255 if a>=16 else 0).getbbox()
        assert bbox and all(v>0 for v in [bbox[0],bbox[1],w-bbox[2],h-bbox[3]])
        char["frames"][name]=frame;rx,ry=root
        white=Image.new("RGBA",cut.size,"white");white.alpha_composite(cut);draw=ImageDraw.Draw(white)
        draw.line((rx-6,ry,rx+6,ry),fill="red",width=2);draw.line((rx,ry-6,rx,ry+6),fill="red",width=2)
        for p in frame["sockets"].values():draw.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),outline="blue",width=2)
        draw.text((4,4),name,fill="black");white.convert("RGB").save(EVIDENCE/(name+"-root-review1003.png"))
        rows.append({"name":name,"sourceCell":i+1,"crop":r["crop"],"root":root,"excludeRects":r["excludeRects"],"ownAlpha16BodyExcluded":0,"socketsSourceLocal":frame["sockets"],"socketsWorldRelativeToRoot":{key:[round((p[0]-rx)*world,4),round((p[1]-ry)*world,4)] for key,p in frame["sockets"].items()}})
    def anim(names, exposures):return {"frames":names,"loop":False,"exposures":[{"frame":frame,"ticks":ticks} for frame,ticks in exposures]}
    char["anims"]["sp_ice_body"]=anim(NAMES[:3],[(0,7),(1,7),(2,18)])
    char["anims"]["sp_ice_pheasant"]=anim(NAMES[3:6],[(0,15),(1,5),(2,34)])
    char["anims"]["sp_glacier_line"]=anim(NAMES[6:9],[(0,16),(1,18),(2,32)])
    char["anims"]["ult_ice_age"]=anim(NAMES[9:12],[(0,23),(1,6),(1,8),(1,7),(2,45)])
    assert MANIFEST.read_bytes()==before,"Another writer changed manifest"
    encoded=(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode();MANIFEST.write_bytes(encoded)
    record={"status":"static-body-candidate-not-FX-sound-or-gameplay-acceptance","sourceKey":KEY,"sourceHash":HASH,"sourceNeutralAlpha64Height":337,"sourceUnitScale":source["unitScale"],"worldPixelsPerSourcePixel":world,"pointPrecision":"approximately5source pixels, manually observed semantic palms/soles","frames":rows,"timing":{"sp_ice_body":[7,7,18],"sp_ice_pheasant":[15,5,34],"sp_glacier_line":[16,18,32],"ult_ice_age":[23,6,8,7,45]},"VBodySemantics":"Real source cell11 holds continuous press across both damage phases and intervening8tick buildup; one body gesture, not five independent pictures or fabricated second physical swing","ZBodySemantics":"Before/after normal guards are similar; source cell2 is real changed limb posture and ice material. Do not claim three different limb attacks from the normal-material restoration.","neighborExclusion":"Explicit tiny foreign-pose scraps; diagnostic alpha16 main-component membership verifies zero own visible body pixels removed; source file unchanged","newUniqueCrops":12,"totalCrops":len(char["frames"]),"animationItems":len(char["anims"]),"skillBodyCoverage":"9/9 candidates; not complete skills acceptance","recordedAtUtc":datetime.now(timezone.utc).isoformat(),"manifestAfterSha256":sha(encoded)}
    save(EVIDENCE/"measurements1003.json",record);save(PROJECT/"docs/assets/aokiji-zxcv-measurements1003.json",record)
    print(json.dumps({"totalCrops":len(char["frames"]),"anims":len(char["anims"]),"skillBodyCoverage":"9/9 candidates","worldPixelsPerSourcePixel":world,"measurements":"docs/assets/aokiji-zxcv-measurements1003.json"},ensure_ascii=False))

if __name__=="__main__":main()
