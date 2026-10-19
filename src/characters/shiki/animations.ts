import type { AnimTable } from '@render/animations';

/** 尚无正式原画；空表不虚报帧数。全部状态、26招、投与受投另行制作。老年剑腿形态：站立基线为剑尖；走跳蹲/受投不得长回人脚，腿刃攻击不可画成手持双剑。 */
export const shikiAnims: AnimTable = {};

export const shikiRequiredStates = ['idle', 'walk_fwd', 'walk_back', 'crouch', 'prejump', 'jump_neutral', 'jump_fwd', 'jump_back', 'landing', 'dash', 'backdash', 'roll_fwd', 'roll_back', 'block_stand', 'block_crouch', 'hit_stand', 'hit_crouch', 'hit_air', 'knockdown', 'getup', 'throw', 'thrown', 'throw_tech', 'ko', 'win', 'portrait'] as const;
