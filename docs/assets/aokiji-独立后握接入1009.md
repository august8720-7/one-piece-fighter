# 青雉独立后握接入1009

青雉独立后握已进入作者表和运行图集。主图页字节保持；附加页重排，但125个其余既有逻辑帧的实际RGBA、根点和全部挂点逐个相同。前投、旧四角和core未写入。真实后投输入、普通速度抓持与释放仍由主集成继续验收，本文件不登记完整人物完成。

## 原件与来源

原件 `public/assets/generated/source/roster-aokiji-independent-back-holding-1008.png`，SHA256 `45b28d32caa687992f9affefa52e0b52e6d2d15e9dfd3a5334242a5fca0e42b3`，1,039,875字节，1774×887完整PNG/RGBA，alpha范围0至255。1004请求，1008只取回既有完成第5图，没有新生成。

真实创建证据读取 `D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004/aokiji-backholding-send-observation1004.json`：Microsoft Edge、最新、极高、提示读回一致、单次发送、实际img4只作参考。会话为 `https://chatgpt.com/c/6ac1c91d-9a4c-83ee-90f8-5e05fd1c1774`。原图通过同一官方文件的Space `libfile_8d1067dee0c4819183288832b87e556c` 取回。

1008完成复查截图为 `acceptance/backholding-browser1008/aokiji-back-original-space1008.png`，实际采集时刻 `2026-10-08T12:24:13.145Z`，该时刻不表示服务器生成时刻。本次复查取回者为Codex内置浏览器；Space侧栏及1009新菜单不追改1004创建字段。图像具体后台型号保持unverified。

独立来源表 `scripts/roster_aokiji_hold_sources1008.json` 与凭据 `docs/assets/aokiji_low_hold_back_retrieved_1008来源凭据0929.txt` 已由现有 `load_sources` 完整验证。中央来源表由主集成维护。

## 实际尺与静态接触

左格实际alpha64站高824，统一world尺100/824，对应现作者表canonical scale200/407、density2时的source `unitScale=407/824`。未沿用前图822，也没有给新姿单独缩放。右格裁切 `[887,0,887,887]`，鞋轴 `[576,816]` 由后鞋实际中心511与前鞋641取中点；前鞋底808比后鞋816高8源像素，约0.971 world，原件如实保留。

近掌孔观察约 `[735,702]`，约有正负3源像素人工量测不确定性；world约 `(19.2961,-13.8350)`。静态根距30的既有足踝目标约 `(16.0328,-13.1803)`，孔中心差约 `(+3.2633,-0.6546)`，没有为机械相等挪鞋轴或改持距。

实际近前臂、近掌、拇指和下侧指缘作为foreground，后侧手、裤子和披风留body；原图和统一整帧重采样后的body＋foreground均逐字节重构。六组LABUBU/路飞/赤犬双朝向静态配对采用body→真实受投者→真实近掌/前臂顺序。三体型均有实际掌指/足踝接触；路飞细踝位于孔左侧、孔右半有余空，中心差如实登记。主集成实看六图后确认可继续，跳过可选局部细修，没有将数值中心相等作为额外门槛。

静态证据在 `D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-independent-back-review1008/near-foreground-trial1008/`，含逐图、近掌放大、分层和 `static-review1008.json`。复制原件前后清单与官方manifest保存在上一级。静态配对仍不代替真实抓住、释放、换边或墙角验收。

## 作者与运行接入

新增作者帧 `throw_back_hold_1009` 替换 `throw_back` 的连接保持帧。原 `throw_back_hold_1003` 完整移存 `unusedReviewCrops`，来源、裁切、根点及挂点保留。其余作者帧与动画映射均不改；22/8/15、总45帧和canonical人物scale不改。运行近掌帧为 `aokiji/throw_back/0/foreground`。

必要备份18文件、38,076,955字节，先清单复制并SHA校验，不拷全仓。基线目录：`D:/one-piece-fighter-crossover-0922/roster-0929/baseline/first-pair-backholding-1009-1009-095414-647057/`。两角完整anime目录、两作者表及本次独立来源表均保全，原件与旧包不删除。

候选实际输出19,693,562字节：`D:/one-piece-fighter-crossover-0922/roster-0929/candidate/aokiji-backholding-1009-1009-095414-647057/`。采用前逐个比较旧runtime实际图集裁切与新候选图集裁切，除显式替换的back保持帧，125个旧逻辑帧的RGBA、尺寸、root、socket及全部attachment完全一致；包含全部前投body/foreground与后投release/recover。所有runtime动画数量、暴露时序与阶段字段完全一致。

主 `atlas.png` 整文件SHA仍为 `52336f19cf560d30a5f7e108d8e796f45b9337bdfb4aec142b5892dea7918e00`。`atlas-p1.png` 由旧 `f3ef89c00ba5abb69943f99009e0a10988467633a25458ce445ddde67ac7d6bc` 变为 `f7f5ff1ef57469c71741dbcd23a5e0273cd322e6607f3b17387fe81167345214`，旧p1原字节完整留在已核验基线；不声称全部旧页PNG均未变。

作者表SHA `2a204ec4fb46a1415fb0fae62e8d0754bc3e99f8c7fec0c9a891b7ae8d99fd68`，runtime SHA `56eb066b27882809bce3eedaea2f6df3a50364f0010b3d05e41216c7cacf1833`。候选 `unchanged-logical-frames1009.json`、`author-change1009.json`、`assembled-output-inventory1009.json` 与 `adoption1009.json` 记录逐帧、实际字节和源哈希。采用脚本为 `scripts/aokiji_apply_backholding1009.py`，复用原图集工具完成源码约束与来源检查，没有重验此前九技能。

后投holdOffset、条件受投selector、中央来源/发布表与真实比赛由主集成单写。本步骤没有修改这些项目，也没有推送或公开发布。
