# One Piece Fighter

网页版海贼王 1v1 格斗游戏原型（玩法参考拳皇）。首发角色：路飞 vs 赤犬。

- 规划与设计：`docs/PLAN.md`
- 项目约定：`AGENTS.md`

## 运行

```
npm install
npm run dev        # http://localhost:5173
```

## 验证

```
npm run typecheck && npm run lint && npm test && npm run build
```

## 当前阶段

M2 上半完成：防御（上 / 中 / 下段）、投技与拆投、翻滚、前冲 / 后撤步、小跳、吹飞撞墙。下一步 M2 下半：搓招识别、取消链、连段衰减、气槽、超必杀框架、回合制与计时器。

## 操作

| 动作 | P1 | P2 |
|---|---|---|
| 移动 / 跳 / 蹲 | W A S D | 方向键 |
| A 轻拳 / B 轻脚 / C 重拳 / D 重脚 | J K U I | 小键盘 1 2 4 5 |
| 防御 | 按住后方向（蹲防：后下） | 同 |
| 投技 / 拆投 | 贴身 前或后 + C / 被抓瞬间 C 或 D | 同 |
| 翻滚 | A+B（J+K） | 小键盘 1+2 |
| 吹飞 | C+D（U+I） | 小键盘 4+5 |
| 前冲 / 后撤步 | 前前 / 后后 | 同 |
| 小跳 | 轻点上 | 同 |
| KO 后重开 | Enter | 小键盘 Enter |

F1 判定框（黄 pushbox / 蓝 hurtbox / 红 hitbox）· F2 帧数据 · F3 输入显示
