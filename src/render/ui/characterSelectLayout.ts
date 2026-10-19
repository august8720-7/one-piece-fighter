export interface UiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterSelectLayout {
  playerPanels: readonly [UiRect, UiRect];
  rosterTiles: readonly UiRect[];
  rosterColumns: number;
  rosterRows: number;
  compactRoster: boolean;
  statusY: number;
  difficultyY: number;
  controlsY: number;
}

/**
 * Pure 960x540 layout used by CharacterSelectScene. Keeping this calculation
 * outside Phaser makes roster growth and small-screen overflow testable.
 */
export function characterSelectLayout(rosterSize: number): CharacterSelectLayout {
  if (!Number.isInteger(rosterSize) || rosterSize < 1 || rosterSize > 24) {
    throw new RangeError('character select supports 1 to 24 fighters');
  }

  const rosterColumns = Math.min(rosterSize, 8);
  const rosterRows = Math.ceil(rosterSize / rosterColumns);
  const compactRoster = rosterSize > 4;
  const twoRows = rosterRows > 1;
  const threeRows = rosterRows > 2;
  const margin = 38;
  const panelGap = 142;
  const panelWidth = (960 - margin * 2 - panelGap) / 2;
  const playerPanels: [UiRect, UiRect] = [
    { x: margin, y: threeRows ? 92 : 106, width: panelWidth, height: threeRows ? 120 : twoRows ? 154 : 198 },
    { x: 960 - margin - panelWidth, y: threeRows ? 92 : 106, width: panelWidth, height: threeRows ? 120 : twoRows ? 154 : 198 },
  ];

  const available = compactRoster ? 852 : 720;
  // Eighteen pixels leave space for both players' cursor outlines between cards.
  const gap = compactRoster ? 18 : rosterSize > 1 ? 12 : 0;
  const tileWidth = Math.min(compactRoster ? 112 : 162, Math.floor((available - gap * (rosterColumns - 1)) / rosterColumns));
  const tileHeight = threeRows ? 54 : twoRows ? 68 : 88;
  const total = tileWidth * rosterColumns + gap * (rosterColumns - 1);
  const x0 = (960 - total) / 2;
  // Keep a partial last row aligned with the full row so up/down follows columns.
  const rosterTiles = Array.from({ length: rosterSize }, (_, index) => ({
    x: x0 + (index % rosterColumns) * (tileWidth + gap),
    y: (threeRows ? 232 : twoRows ? 278 : 320) + Math.floor(index / rosterColumns) * (tileHeight + 16),
    width: tileWidth,
    height: tileHeight,
  }));

  return {
    playerPanels, rosterTiles, rosterColumns, rosterRows, compactRoster,
    statusY: twoRows ? 444 : 428,
    difficultyY: twoRows ? 468 : 451,
    controlsY: twoRows ? 492 : 474,
  };
}
