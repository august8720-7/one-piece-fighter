# One Piece Fighter — 项目规范

网页版海贼王 1v1 格斗游戏（玩法参考拳皇）。总体规划见 `docs/PLAN.md`，本文件只写约束和约定。

## 技术栈

- TypeScript（strict）+ Phaser 3 + Vite
- 测试：Vitest，只测 `src/core`
- 包管理：npm，锁文件 `package-lock.json` 必须提交

## 目录约定

```
docs/            规划与设计文档（PLAN.md 为总纲；design/ 帧数据与平衡记录；research/ 调研笔记）
public/assets/   运行时静态资源（characters/ stages/ ui/ audio/），含版权素材不进 Git
src/core/        纯格斗逻辑：固定步长、确定性、零 Phaser 依赖
src/characters/  角色数据（def.ts 基础参数 + moves.ts 招式表 + animations.ts），一个角色一个目录
src/render/      Phaser 层：scenes/ hud/ fx/ FighterView DebugOverlay
src/input/       键盘 / 手柄 → InputFrame
src/ai/          CPU 对手与训练木桩（只产生 InputFrame，不直接改 core 状态）
src/audio/       音频封装
scripts/         开发辅助脚本：TS 用 `npx vite-node scripts/<name>.ts`（可复用 @core 等别名），图像处理用 Python + Pillow；产物写入 public/assets（placeholder* 提交，atlas.* 由 assets-src 再生成）
assets-src/      正式素材来源（设定图等），frames.json 由 export-frames.ts 生成
tests/           Vitest 测试，镜像 src/core 结构
```

## 精灵图集约定

- 每角色一个 TexturePacker JSON Hash 图集：`public/assets/characters/<id>/atlas.png` + `atlas.json`（正式素材，不进 Git）；缺失时回退到 `placeholder.png/json`（脚本生成，可进 Git）；两者都缺时渲染层画色块。
- 帧名 `<id>/<anim>/<n>`，n 从 0 起。`<anim>` 是 StateId（`idle`、`walk_fwd`、`hit_air`…）或招式 id（`st_a`、`sp_gatling`…）。
- 招式的帧号就是 FrameData.sprite；非招式状态的帧数、fps、是否循环由 `src/characters/<id>/animations.ts` 声明。
- 帧尺寸可以不同：每帧在 JSON 里给 `pivot: {x, y}`（归一化，脚底中心通常 y = 1），Phaser 会按 pivot 设置 origin；没有 pivot 的帧按 origin 0.5 / 1 处理（占位图集）。
- 正式素材来源放 `assets-src/characters/<id>/`（设定图 / 原始精灵表，可提交），用 `npm run gen:atlas` 切成图集；切图规则（裁切框、抠图、姿势 → 帧映射）在 `scripts/cut_concept_art.py`。

## 硬约束

1. `src/core` 禁止 import `phaser` 或任何浏览器 API（`window`、`document`、`performance`）。逻辑层只吃 `InputFrame`、吐 `WorldState`。
2. 逻辑固定 60 Hz。所有帧数据、硬直、速度以"逻辑帧"为单位，不用毫秒。
3. 确定性：位置与速度用整数（单位 1/256 像素，常量 `SUBPIXEL = 256`）；随机数只用 `core/Rng.ts` 的可种子生成器；禁止 `Math.random`、`Date.now` 进入 core。
4. 角色 = 数据。新增角色只允许新增 `src/characters/<id>/` 与 `public/assets/characters/<id>/`，不改 core。
5. 判定框统一 `[x, y, w, h]`，原点角色脚下中心，面朝右，y 向上为负；镜像由 core 处理。
8. 输入层必须锁存按键：一次按下-松开短于一逻辑帧时，下一次 `snapshot()` 仍要返回该键一帧。
6. 不为让代码跑起来而注释报错或加 `// @ts-ignore`；找根因。
7. 版权素材（官方精灵、原声）只放本地 `public/assets/`，已在 `.gitignore` 中排除；占位素材和自制素材可以提交。

## 命名

- 文件：类 / 场景 `PascalCase.ts`，其余 `camelCase.ts`，测试 `*.test.ts`
- 招式 id：`snake_case` 英文（如 `gomu_bazooka`），显示名放 `name` 字段
- 状态 id：`snake_case`（`idle`、`walk_fwd`、`jump_neutral`、`hit_stand_high`）
- 动画 key：`<characterId>/<stateId>`

## 验证命令

改完必须跑，全绿再算完成：

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run build       # vite build
```

开发预览：`npm run dev`，默认 http://localhost:5173

## 调试快捷键（游戏内）

F1 判定框 · F2 帧数据面板 · F3 输入显示 · F4 精灵 / 色块切换
训练模式（`?mode=training`）：F5 木桩行为循环 · F6 位置重置 · F7 无限气 · F8 无限血

## 里程碑与范围

当前阶段和验收标准见 `docs/PLAN.md` 第 6 节。第一版锁定 2 角色、1 舞台、1v1；超出范围的想法记到 `docs/PLAN.md` 的 M7 清单，不直接开工。

## 清理

- `dist/`、`node_modules/`、`.vite/` 不提交
- 临时脚本、试验文件放系统临时目录，不放仓库
- 一个里程碑结束时更新 `docs/PLAN.md` 的文档状态行和里程碑表
