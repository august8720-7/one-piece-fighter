"""Record historical Edge creation and IAB completion recheck in an own catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from record_roster_source0929 import record_source
from build_anime_atlas import load_sources


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "scripts/roster_aokiji_hold_sources1008.json"
KEY = "aokiji_low_hold_back_retrieved_1008"
PARENT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004")
SCREEN = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/backholding-browser1008/aokiji-back-original-space1008.png")
OUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-independent-back-review1008")


def main() -> None:
    observation = json.loads((PARENT / "aokiji-backholding-send-observation1004.json").read_text(encoding="utf-8"))
    assert observation["browser"] == "Edge" and observation["textModel"] == "最新" and observation["reasoningEffort"] == "极高"
    assert observation["readbackMatch"] and observation["singleSend"]
    assert observation["editContext"] == "actual front img4 only as reference; new independent back-holding requested"
    assert observation["session"] == "https://chatgpt.com/c/6ac1c91d-9a4c-83ee-90f8-5e05fd1c1774"
    author = json.loads((ROOT / "scripts/roster_aokiji_manifest0929.json").read_text(encoding="utf-8"))
    reference_key = "aokiji_low_hold_front_joint3_1004"
    reference = author["characters"]["aokiji"]["sources"][reference_key]
    load_sources({reference_key: reference})
    with CATALOG.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump({"schemaVersion": 1, "workflowDecision": "pc-roster-0929", "sources": {reference_key: reference}}, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    result = record_source(argparse.Namespace(
        key=KEY,
        source="public/assets/generated/source/roster-aokiji-independent-back-holding-1008.png",
        prompt="docs/assets/aokiji-low-hold-backholding-prompt1004.txt",
        catalog=CATALOG.relative_to(ROOT).as_posix(),
        session=observation["session"],
        observed_completed_at="2026-10-08T12:24:13.145Z",
        entry_url="https://chatgpt.com/images/", entry_title="ChatGPT",
        text_model_label=observation["textModel"], reasoning_effort=observation["reasoningEffort"],
        browser_label="Microsoft Edge",
        model_unavailable_statement="1004实际创建字段来自Edge单次发送JSON：最新、极高，prompt读回一致；具体图像后台型号未公开。1008只在Codex内置浏览器取回旧完成图，不用Space的Pro或新GPT-6菜单追改旧创建字段。",
        ui_observation="原海军代理1004在同fresh官方会话的实际img4编辑侧栏，434字独立backholding完整提示fill读回匹配后单次发送；本人1008读取aokiji-backholding-send-observation1004.json，确认Edge/latest/极高/readbackMatch/singleSend与实际prompt路径，model/draft/sent1004原截图及JSON均保留。root1008重新核对同会话已完成的第5图，通过官方文件菜单→Space libfile_8d1067dee0c4819183288832b87e556c→pageAssets.bundle导出对应原PNG，1项image/png、failures为空，没有重发或新生成。observedCompletedAt为1008实际完成复查截图采集时刻，不是服务器生成时刻；创建浏览器为Edge，本次取回者为Codex内置浏览器，Space模型不作创建依据。本助手已完整PNG签名/IEND/verify/RGBA解码、1039875字节、1774x887、真实alpha0..255，并先清单复制到source及D原件备份，SHA一致。独立后握已按真实站高824、鞋轴576/816，原像素近掌/前臂分层与LABUBU/路飞/赤犬双朝向静配，body+foreground逐字节重构。该登记只是来源与静态候选，不代表实机抓住/释放/墙角完成。",
        screenshot=SCREEN.as_posix(), reference=[reference_key],
    ))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    entry = catalog["sources"][KEY]
    entry["unitScale"] = 407 / 824
    entry["scaleBasis"] = "Measured complete left standing alpha64H824 versus established407; source-wide uniform scale only. Canonical character scale unchanged."
    entry["creationObservationFile"] = {"file": (PARENT / "aokiji-backholding-send-observation1004.json").as_posix(), "sha256": hashlib.sha256((PARENT / "aokiji-backholding-send-observation1004.json").read_bytes()).hexdigest()}
    entry["creationObservedSentAt"] = observation["observedSentAt"]
    entry["completionRecheckBrowserLabel"] = "Codex内置浏览器"
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    load_sources({KEY: entry})
    intake_path = OUT / "intake1008.json"
    intake = json.loads(intake_path.read_text(encoding="utf-8"))
    intake["provenance"]["completionObservationScreenshot"] = {"file": SCREEN.as_posix(), "sha256": hashlib.sha256(SCREEN.read_bytes()).hexdigest(), "observedCompletedAt": entry["observedCompletedAt"]}
    intake["provenance"]["creationBrowser"] = "Microsoft Edge"
    intake["provenance"]["completionRecheckBrowser"] = "Codex内置浏览器"
    intake_path.write_text(json.dumps(intake, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (OUT / "source-registration1008.json").open("x", encoding="utf-8", newline="\n") as stream:
        json.dump({**result, "unitScale": entry["unitScale"], "sourceFullyValidated": True, "runtimeChanged": False}, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({**result, "unitScale": entry["unitScale"], "sourceFullyValidated": True}, ensure_ascii=False))


if __name__ == "__main__":
    main()
