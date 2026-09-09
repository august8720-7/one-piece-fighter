import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '@core/index';
import { BootScene } from '@render/scenes/BootScene';
import { FightScene } from '@render/scenes/FightScene';
import { PreloadScene } from '@render/scenes/PreloadScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b1220',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Phaser.Scale.MAX_ZOOM,
  },
  scene: [BootScene, PreloadScene, FightScene],
});
