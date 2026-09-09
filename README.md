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

M0 完成：Vite + Phaser 3 + TypeScript 脚手架，固定 60 Hz 逻辑步长，逻辑 / 渲染分离，两个占位色块可移动、跳跃、蹲下、互相推挤。下一步 M1：普通技、判定框命中、血条、KO。

## 操作（M0）

| 动作 | P1 | P2 |
|---|---|---|
| 移动 / 跳 / 蹲 | W A S D | 方向键 |
| A / B / C / D | J K U I | 小键盘 1 2 4 5 |

F1 判定框 · F2 帧数据 · F3 输入显示
