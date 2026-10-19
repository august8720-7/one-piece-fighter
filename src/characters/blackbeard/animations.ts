import type { AnimTable } from '@render/animations';

/** 尚无正式原画；空表不虚报帧数。全部状态、26招、投与受投另行制作。 */
export const blackbeardAnims: AnimTable = {};

export const blackbeardRequiredStates = ['idle', 'walk_fwd', 'walk_back', 'crouch', 'prejump', 'jump_neutral', 'jump_fwd', 'jump_back', 'landing', 'dash', 'backdash', 'roll_fwd', 'roll_back', 'block_stand', 'block_crouch', 'hit_stand', 'hit_crouch', 'hit_air', 'knockdown', 'getup', 'throw', 'thrown', 'throw_tech', 'ko', 'win', 'portrait'] as const;
