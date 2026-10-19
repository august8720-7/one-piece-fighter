# 香克斯日语出力接入1013

已把`voice.shanks.effort`和`voice.shanks.attack`两个事件指向同一条实际听核过的日语合成短喊。原声select、其他121条cue、所有旧字幕行与旧音频保持；新五条候选没有进入运行表。

- 新运行文件：`public/assets/audio/voice/shanks/effort-qwen-japanese1013.wav`，34,604字节、24kHz单声道PCM16、17,280帧、0.72秒；SHA256 `bae4b92a168b55dc84e317d27c2b09f7c9b9d08584834d061a919e1c56320e31`。
- 本地既有Qwen3-TTS CustomVoice/Uncle Fu生成；原WAV整文件复制，没有裁切、变速、重采样或改音量像素。请求是「来い！」，原生盲审实际转写「こおい」，按延长元音的通用短喊采用。字幕保留原文「こおい」与中文「来吧！」，不声称文字完全同形或原作演员喊招。
- 实际native证据绑定`native-qa/20261013T045504347029Z/result-04.json`及音频/响应SHA；模型未报告截断、重复、背景音或失真。没有重跑原生审查、没有真人音色认可声明。
- gain仍为effort0.62、attack0.85，priority/maxInstances等调度不变；两cue冷却改为721ms以覆盖720ms完整片段。它是两事件明确复用，不是两条独立配音或九招专属喊招。

新增`first_pair_voice_selection1013.json`只含上述两个明确覆盖事件，`first_pair_voice_subtitles1013.json`只含这个精确文件的字幕；`shanks_voice_sources1013.json`保存原件、完整请求/返回、实际模型、预设与审查来源。1004采用台账与字幕文件保持原SHA，未追改历史。

`apply_voice_manifest.py`默认重建先读取1004，再应用明确1013覆盖；两份台账缺少任何一份都拒绝重建，不能静默恢复旧中文。旧声音门禁测试的默认fixture只补一个空1013台账，既有内容审核规则没有放松。

本次一次定向检查：真实完整默认rebuild与当前123cue逐值一致；空catalog重建仍使用日语片段；模拟缺少1013台账时明确拒绝；除目标2cue外121cue完全不变、旧字幕所有行不变、旧音/1004台账字节不变。没有额外全量测试或生成音频。

保全：`D:/one-piece-fighter-crossover-0922/roster-0929/baseline/shanks-voice-effort1013-20261013T074334410312Z/`。完整结果：`D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks/shanks-effort-adoption-result1013.json`。

当前是运行事件表接入和重建检查通过；根下一步在IAB真实出拳确认sample播放及字幕。未据此认证新五条、人物完整性或公开发布。
