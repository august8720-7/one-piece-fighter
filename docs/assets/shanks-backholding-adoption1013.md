# 香克斯后投采用1013

本轮在唯一可写工作区 `D:/Projects/one-piece-fighter` 采用已通过三体型静态包握的独立后握原图。人物仍未正式放行；定向规则检查与IAB实际后投由根统一完成。没有重装依赖、启动模型、写C盘或公开发布。

## 实际变更

- 新原件 `roster-shanks-back-contact-marked-1013.png`，SHA256 `b41b9f6b572e423f31d232ed340e52afc71fe98a9eba150562c75eca773b2d5d`，来源登记在 `scripts/roster_shanks_hold_sources1013.json`；独立来源凭据为 `docs/assets/shanks_back_contact_marked_1013来源凭据1013.txt`。实际IAB/GPT-6/极高截图、完整已发送提示词、原件/参考SHA与下载票据绑定，图像模型仍为 `unverified`。
- 实际上传的红绿孔定位图已按复制前后SHA保存同字节副本到 `D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-back-contact1013/`；原上传路径和迁移前下载票据的C路径仅作为历史事实保留。
- 作者表新增 `throw_back_hold_1013`，页统一 `unitScale=380/987`，保留人物 `scale=188/380`、density2。裁切 `[800,291,694,689]`，root `[455,681]`，真实前臂/掌指按显式多边形分层，不创造或移动源像素。
- 后投起手序列为 `start4 → hold17 → release7 → recover14`；连接后为 `hold21 → release7 → recover14`。旧connect/load完整存入 `unusedReviewCrops`，旧图及回退页保留。
- 只把香克斯 `throw_back.throwData.holdOffset` 从34改30。伤害114、总42、释放21、拆投8、范围46保持；前投与其余招式不改。

## 验证与保全

实际执行入口：`run-d1013.ps1` 调用既有D盘Python，执行 `scripts/shanks_apply_backholding1013.py`。标准来源验证、图集生成与本次直接受影响检查一次通过。

- 131个非后投原运行帧的准备RGBA、尺寸、root、socket及attachment逐项完全相同；所有非后投动画及时序完全相同，含已验前投主体和前景。
- 后投原start、release、recover虽因移除两个未采用保持姿而压缩索引，其RGBA/root/socket保持完全相同；仅连接保持改为新独立原画及前景。
- 源RGBA与统一准备后的主体＋前景均已逐字节重构；三体型实际静态配对见本角色外存目录的 `shanks-back-marked-acceptance1013.md`。
- 旧作者表、moves和全部香克斯runtime文件在写入前清单保全、复制后SHA一致。未改core、旧四角、共享selector、共享测试或 `pcRosterAccepted`。

回退根：`D:/one-piece-fighter-crossover-0922/roster-0929/baseline/shanks-back1013-20261013T065914704336Z/`。

候选与逐帧证明：`D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks/adoption-20261013T065914704336Z/`；`unchanged-logical-frames1013.json`为逐帧比较，`adoption1013.json`含标准工具报告。

最终SHA：作者表 `1b3850987ffe0b75b47fcf4510ee09e5bc12682e8b26b85ac27e451cf624d3c0`；runtime `16af6c2282743c04187fde2b9a4a887cb0d22e2c4e24a120e98b67c005e32dea`；moves `216d920e9f45439e5fa2b3d08a4d910dba220d9925e3536a4da860d384cee733`。

根已另行认领共享后投条件选择器和对应测试。后投真实抓住/释放/换边、必要反向墙角与拆投、最终资源装载仍待根一次最小验证；静态及标准工具检查不能替代这些实机结果。日语声音的独立候选/听核状态见同角色外存目录，后握采用没有把声音或完整人物自动标为完成。
