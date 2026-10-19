import { DEFAULT_ANIMS, type AnimTable } from '@render/animations';

/**
 * 青雉状态制作要求：继承待机/行走/跳蹲/防御/受击/投与受投/胜负等完整状态。
 * 每项复制仅避免候选修改污染共享默认表；数字是既有逻辑回退，不是已取得的原画帧数。
 * 正式动作由经检查的 runtime 清单覆盖；本文件不能证明美术完成，也不注册可玩阵容。
 */
export const aokijiAnims: AnimTable = Object.fromEntries(
  Object.entries(DEFAULT_ANIMS).map(([state, anim]) => [state, { ...anim }]),
);

