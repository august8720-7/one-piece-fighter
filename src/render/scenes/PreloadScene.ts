import Phaser from 'phaser';
import { characters } from '@characters/index';
import type { FightSceneData } from './FightScene';

/** 注册表键：每个角色实际可用的图集纹理 key（null = 无素材，画色块） */
export const SPRITE_KEYS = 'spriteKeys';
export type SpriteKeys = Record<string, string | null>;

const VARIANTS = ['atlas', 'placeholder'] as const;

/**
 * 加载角色图集：优先 atlas（正式素材，不进 Git），缺失则回退 placeholder（脚本生成）。
 * 先用 fetch 探测 JSON 是否真实存在（Vite 对缺失文件会回退成 index.html，直接交给 Phaser 会报错），
 * 只把存在的图集加入加载队列。两者都缺时该角色用矢量色块渲染。
 */
export class PreloadScene extends Phaser.Scene {
  private data_!: FightSceneData;

  constructor() {
    super('Preload');
  }

  init(data: FightSceneData): void {
    this.data_ = data;
  }

  create(): void {
    void this.run();
  }

  private async run(): Promise<void> {
    const keys: SpriteKeys = {};
    const ids = [...new Set([this.data_.p1, this.data_.p2])].filter((id) => characters[id]);
    for (const id of ids) {
      keys[id] = null;
      for (const variant of VARIANTS) {
        const base = `assets/characters/${id}/${variant}`;
        if (await atlasExists(`${base}.json`)) {
          const key = `${id}-${variant}`;
          this.load.atlas(key, `${base}.png`, `${base}.json`);
          keys[id] = key;
          break;
        }
      }
    }

    const finish = () => {
      // 加载后再核对一次纹理确实可用
      for (const id of ids) {
        const key = keys[id];
        if (key && !(this.textures.exists(key) && this.textures.get(key).frameTotal > 1)) keys[id] = null;
      }
      this.registry.set(SPRITE_KEYS, keys);
      this.scene.start('Fight', this.data_);
    };

    if (this.load.list.size === 0) {
      finish();
      return;
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    this.load.start();
  }
}

async function atlasExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return false;
    const json = (await res.json()) as { frames?: unknown };
    return typeof json === 'object' && json !== null && 'frames' in json;
  } catch {
    return false;
  }
}
