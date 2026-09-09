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

M1 完成："两个方块打架"。每角色 12 个普通技（站 / 蹲 / 空 × A B C D），hitbox 命中、hitstop、硬直、击退、浮空、倒地、KO、重开。下一步 M2：防御、投技、翻滚、搓招识别、取消链、气槽、回合制。

## 操作

| 动作 | P1 | P2 |
|---|---|---|
| 移动 / 跳 / 蹲 | W A S D | 方向键 |
| A 轻拳 / B 轻脚 / C 重拳 / D 重脚 | J K U I | 小键盘 1 2 4 5 |
| KO 后重开 | Enter | 小键盘 Enter |

F1 判定框（黄 pushbox / 蓝 hurtbox / 红 hitbox）· F2 帧数据 · F3 输入显示
