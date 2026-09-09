import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '@core/index';
import { BootScene } from '@render/scenes/BootScene';
import { CharacterSelectScene } from '@render/scenes/CharacterSelectScene';
import { FightScene } from '@render/scenes/FightScene';
import { MenuScene } from '@render/scenes/MenuScene';
import { PreloadScene } from '@render/scenes/PreloadScene';
import { ResultScene } from '@render/scenes/ResultScene';
import { SettingsScene } from '@render/scenes/SettingsScene';
import { TitleScene } from '@render/scenes/TitleScene';

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
  input: { gamepad: false },
  scene: [BootScene, TitleScene, MenuScene, CharacterSelectScene, SettingsScene, PreloadScene, FightScene, ResultScene],
});
