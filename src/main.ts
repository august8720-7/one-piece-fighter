import Phaser from 'phaser';
import { sfx } from './audio/Sfx';
import { SCREEN_H, SCREEN_W } from '@render/screen';
import { BootScene } from '@render/scenes/BootScene';
import { CharacterSelectScene } from '@render/scenes/CharacterSelectScene';
import { FightScene } from '@render/scenes/FightScene';
import { MenuScene } from '@render/scenes/MenuScene';
import { PreloadScene } from '@render/scenes/PreloadScene';
import { ResultScene } from '@render/scenes/ResultScene';
import { SettingsScene } from '@render/scenes/SettingsScene';
import { TitleScene } from '@render/scenes/TitleScene';
import { sharedDownloads } from '@render/assetDownloads';

const startupParams = new URLSearchParams(window.location.search);
if (startupParams.get('art') === 'anime') document.body.dataset.art = 'anime';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN_W,
  height: SCREEN_H,
  backgroundColor: '#07080c',
  antialias: true,
  pixelArt: false,
  roundPixels: false,
  // Bound redundant high-refresh rendering. A 60 limit in Phaser discards the
  // remainder and can undershoot 60 on 120/144/165 Hz displays; logic stays 60 Hz.
  fps: { limit: 120 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { gamepad: false },
  scene: [BootScene, TitleScene, MenuScene, CharacterSelectScene, SettingsScene, PreloadScene, FightScene, ResultScene],
});

// FightScene owns its explicit pause menu; other scenes resume music when focus returns.
game.events.on(Phaser.Core.Events.BLUR, () => sfx().pause());
game.events.on(Phaser.Core.Events.HIDDEN, () => sfx().pause());
const resumeMenuAudio = (): void => { if (!game.scene.isActive('Fight')) sfx().resume(); };
game.events.on(Phaser.Core.Events.FOCUS, resumeMenuAudio);
game.events.on(Phaser.Core.Events.VISIBLE, resumeMenuAudio);
game.events.once(Phaser.Core.Events.DESTROY, () => { sharedDownloads(game).destroy(); void sfx().destroy(); });

// Local authoring evidence is captured from a real render, with no scene/state mutation.
if (import.meta.env.DEV && startupParams.get('rosterPreview') === '0929') {
  const capture = document.createElement('button');
  capture.textContent = '保存样板画面';
  capture.style.cssText = 'position:fixed;left:8px;bottom:4px;z-index:10;font-size:11px;padding:3px 7px;color:#e4d392;background:#12212c;border:1px solid #5d6870;cursor:pointer';
  capture.addEventListener('click', () => {
    game.renderer.snapshot(image => {
      if (!(image instanceof HTMLImageElement)) return;
      const link = document.createElement('a');
      link.href = image.src;
      link.download = `opf-roster0929-${Date.now()}.png`;
      link.click();
    }, 'image/png');
  });
  document.body.append(capture);
  const captureMix = document.createElement('button');
  captureMix.textContent = '录制10秒游戏声音';
  captureMix.style.cssText = 'position:fixed;left:112px;bottom:4px;z-index:10;font-size:11px;padding:3px 7px;color:#e4d392;background:#12212c;border:1px solid #5d6870';
  const mixDownload = document.createElement('a');
  mixDownload.textContent = '下载最近游戏录音';
  mixDownload.hidden = true;
  mixDownload.style.cssText = 'position:fixed;left:112px;bottom:32px;z-index:10;font-size:11px;padding:3px 7px;color:#e4d392;background:#12212c;border:1px solid #5d6870';
  const mixEvidence = document.createElement('a');
  mixEvidence.textContent = '下载录音事件记录';
  mixEvidence.hidden = true;
  mixEvidence.style.cssText = 'position:fixed;left:250px;bottom:32px;z-index:10;font-size:11px;padding:3px 7px;color:#e4d392;background:#12212c;border:1px solid #5d6870';
  let mixUrl: string | null = null;
  let mixEvidenceUrl: string | null = null;
  captureMix.addEventListener('click', () => {
    captureMix.disabled = true;
    captureMix.textContent = '正在录制游戏声音…';
    const startedAt = new Date().toISOString();
    const startedMs = performance.now();
    const voices: Array<{ elapsedMs: number; line: unknown }> = [];
    const stopObserving = sfx().onVoice(line => voices.push({ elapsedMs: performance.now() - startedMs, line: line ? { ...line } : null }));
    // Start recording without retaining the input event, so play can continue.
    void sfx().captureMix(10000).then(({ blob, mimeType }) => {
      if (mixUrl) URL.revokeObjectURL(mixUrl);
      mixUrl = URL.createObjectURL(blob);
      mixDownload.href = mixUrl;
      mixDownload.download = `opf-game-mix-${Date.now()}.${mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm'}`;
      mixDownload.hidden = false;
      if (mixEvidenceUrl) URL.revokeObjectURL(mixEvidenceUrl);
      mixEvidenceUrl = URL.createObjectURL(new Blob([JSON.stringify({ startedAt, elapsedMs: performance.now() - startedMs,
        recording: mixDownload.download, voices, audio: sfx().diagnostics() }, null, 2)], { type: 'application/json' }));
      mixEvidence.href = mixEvidenceUrl;
      mixEvidence.download = mixDownload.download.replace(/\.[^.]+$/, '.json');
      mixEvidence.hidden = false;
      captureMix.textContent = '录音就绪 · 再录10秒';
    }).catch((error: unknown) => {
      captureMix.textContent = `录音未完成：${error instanceof Error ? error.message : String(error)}`;
    }).finally(() => { stopObserving(); captureMix.disabled = false; });
  });
  document.body.append(captureMix, mixDownload, mixEvidence);
  const inputProbe = document.createElement('output');
  inputProbe.id = 'roster-input-probe';
  inputProbe.style.cssText = 'position:fixed;right:8px;top:4px;z-index:12;color:#ddd;background:#12212c;font:10px monospace;padding:3px';
  inputProbe.textContent = '输入观察：尚无事件';
  const observeKey = (event: KeyboardEvent): void => { inputProbe.textContent = `键：${event.code || '(empty code)'} / ${event.key} / repeat=${event.repeat}`; };
  const observePointer = (event: PointerEvent): void => { inputProbe.textContent = `点击：${Math.round(event.clientX)},${Math.round(event.clientY)}`; };
  window.addEventListener('keydown', observeKey);
  window.addEventListener('pointerdown', observePointer);
  document.body.append(inputProbe);
  const records = document.createElement('details');
  records.id = 'roster-sample-records';
  records.hidden = true;
  records.style.cssText = 'position:fixed;left:285px;bottom:4px;z-index:11;max-width:min(580px,75vw);color:#e4d392;background:#12212c;border:1px solid #5d6870;font:11px monospace;padding:4px 7px';
  const summary = document.createElement('summary');
  summary.textContent = '样板记录';
  summary.style.cursor = 'pointer';
  const refresh = document.createElement('button');
  refresh.textContent = '刷新记录';
  const saveRecords = document.createElement('button');
  saveRecords.textContent = '保存记录';
  const abilitySelect = document.createElement('select');
  abilitySelect.id = 'roster-sample-ability';
  abilitySelect.setAttribute('aria-label', '木桩样板技能');
  const startAbility = document.createElement('button');
  startAbility.textContent = '循环选定技能';
  const stopAbility = document.createElement('button');
  stopAbility.textContent = '木桩站立';
  const audioMonitor = document.createElement('button');
  audioMonitor.textContent = '开始声音记录';
  audioMonitor.setAttribute('aria-pressed', 'false');
  const output = document.createElement('pre');
  output.id = 'roster-sample-records-json';
  output.style.cssText = 'max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 0;color:#e4edf2';
  const showSnapshot = (): void => {
    const fight = game.scene.getScene('Fight') as FightScene;
    const snapshot = game.scene.isActive('Fight') ? fight.authoringSnapshot() : null;
    output.textContent = snapshot ? JSON.stringify(snapshot, null, 2) : '当前没有活动的开发训练样板。';
    const audioRecording = snapshot?.audio.diagnosticsEnabled === true;
    audioMonitor.textContent = audioRecording ? '停止声音记录' : '开始声音记录';
    audioMonitor.setAttribute('aria-pressed', String(audioRecording));
    const selected = snapshot?.dummy?.selectedAbilityId ?? abilitySelect.value;
    abilitySelect.replaceChildren(...(snapshot?.dummy?.abilities ?? []).map(ability => {
      const option = document.createElement('option');
      option.value = ability.id;
      option.textContent = ability.name;
      return option;
    }));
    if ([...abilitySelect.options].some(option => option.value === selected)) abilitySelect.value = selected;
    startAbility.disabled = abilitySelect.options.length === 0;
  };
  startAbility.addEventListener('click', () => {
    const fight = game.scene.getScene('Fight') as FightScene;
    if (game.scene.isActive('Fight')) fight.startAuthoringAbility(abilitySelect.value);
    showSnapshot();
  });
  stopAbility.addEventListener('click', () => {
    const fight = game.scene.getScene('Fight') as FightScene;
    if (game.scene.isActive('Fight')) fight.stopAuthoringAbility();
    showSnapshot();
  });
  // Observes real playback in full matches too; never edits fighters or inputs.
  audioMonitor.addEventListener('click', () => {
    const enabled = !sfx().diagnostics().diagnosticsEnabled;
    sfx().setDiagnosticsEnabled(enabled);
    audioMonitor.textContent = enabled ? '停止声音记录' : '开始声音记录';
    audioMonitor.setAttribute('aria-pressed', String(enabled));
    showSnapshot();
  });
  refresh.addEventListener('click', showSnapshot);
  saveRecords.addEventListener('click', () => {
    showSnapshot();
    if (!output.textContent?.startsWith('{')) return;
    const url = URL.createObjectURL(new Blob([output.textContent], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `opf-roster-records-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  records.addEventListener('toggle', () => { if (records.open) showSnapshot(); });
  records.append(summary, refresh, saveRecords, abilitySelect, startAbility, stopAbility, audioMonitor, output);
  document.body.append(records);
  // Scene lifecycle events only: no polling, simulation writes, or automated input.
  game.events.once(Phaser.Core.Events.READY, () => {
    const fight = game.scene.getScene('Fight') as FightScene;
    fight.events.on(Phaser.Scenes.Events.CREATE, () => {
      records.hidden = fight.authoringSnapshot() === null;
      output.textContent = '点击刷新记录，读取最近32条真实命中。';
    });
    fight.events.on(Phaser.Scenes.Events.SHUTDOWN, () => { records.hidden = true; });
  });
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    capture.remove(); captureMix.remove(); mixDownload.remove(); mixEvidence.remove(); records.remove(); inputProbe.remove();
    if (mixUrl) URL.revokeObjectURL(mixUrl);
    if (mixEvidenceUrl) URL.revokeObjectURL(mixEvidenceUrl);
    window.removeEventListener('keydown', observeKey); window.removeEventListener('pointerdown', observePointer);
  });
}
