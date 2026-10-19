import { describe, expect, it } from 'vitest';
import { characterSelectLayout } from '../../src/render/ui/characterSelectLayout';

describe('character select layout', () => {
  it.each([4, 10, 16, 17, 23, 24])('keeps %s fighters, picks and help separate inside the 960x540 canvas', count => {
    const layout = characterSelectLayout(count);
    expect(layout.rosterTiles).toHaveLength(count);
    for (const rect of [...layout.playerPanels, ...layout.rosterTiles]) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(960);
      expect(rect.y + rect.height).toBeLessThanOrEqual(540);
    }
    for (const [index, tile] of layout.rosterTiles.entries()) {
      // Selected cards have an outer seven-pixel border, including mirrored picks.
      expect(tile.x - 7).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width + 7).toBeLessThanOrEqual(960);
      expect(tile.y + tile.height + 7).toBeLessThan(layout.statusY);
      for (const other of layout.rosterTiles.slice(index + 1)) {
        // The original four-card row predates the compact dual-cursor spacing.
        const clearance = layout.compactRoster ? 14 : 0;
        const separate = tile.x + tile.width + clearance <= other.x || other.x + other.width + clearance <= tile.x
          || tile.y + tile.height + clearance <= other.y || other.y + other.height + clearance <= tile.y;
        expect(separate).toBe(true);
      }
    }
    expect(layout.rosterTiles[0]!.y - 7).toBeGreaterThan(
      layout.playerPanels[0].y + layout.playerPanels[0].height,
    );
    expect(layout.statusY + 22).toBeLessThanOrEqual(layout.difficultyY);
    expect(layout.difficultyY + 18).toBeLessThan(layout.controlsY);
    expect(layout.controlsY + 34).toBeLessThan(533); // bottom frame begins at y=533
  });

  it('preserves the current four-fighter geometry', () => {
    const layout = characterSelectLayout(4);
    expect(layout.playerPanels).toEqual([
      { x: 38, y: 106, width: 371, height: 198 },
      { x: 551, y: 106, width: 371, height: 198 },
    ]);
    expect(layout.rosterTiles[0]).toEqual({ x: 138, y: 320, width: 162, height: 88 });
    expect(layout).toMatchObject({ rosterColumns: 4, rosterRows: 1, compactRoster: false, statusY: 428, controlsY: 474 });
  });

  it('uses two aligned rows of eight with readable compact portrait cards', () => {
    const layout = characterSelectLayout(16);
    expect(layout).toMatchObject({ rosterColumns: 8, rosterRows: 2, compactRoster: true, statusY: 444, difficultyY: 468, controlsY: 492 });
    expect(layout.playerPanels).toEqual([
      { x: 38, y: 106, width: 371, height: 154 },
      { x: 551, y: 106, width: 371, height: 154 },
    ]);
    expect(layout.rosterTiles[0]).toEqual({ x: 57, y: 278, width: 90, height: 68 });
    expect(layout.rosterTiles[15]).toEqual({ x: 813, y: 362, width: 90, height: 68 });
    for (let column = 0; column < 8; column++) {
      const first = layout.rosterTiles[column]!;
      const second = layout.rosterTiles[column + 8]!;
      expect(second.x).toBe(first.x);
      expect(second.y - (first.y + first.height)).toBeGreaterThanOrEqual(14);
      expect(second.width).toBeGreaterThanOrEqual(90);
      expect(second.height).toBeGreaterThanOrEqual(68);
    }
  });

  it.each([23, 24])('fits %s fighters in three aligned rows without changing help positions', count => {
    const layout = characterSelectLayout(count);
    expect(layout).toMatchObject({ rosterColumns: 8, rosterRows: 3, statusY: 444, difficultyY: 468, controlsY: 492 });
    expect(layout.playerPanels).toEqual([
      { x: 38, y: 92, width: 371, height: 120 },
      { x: 551, y: 92, width: 371, height: 120 },
    ]);
    expect(layout.rosterTiles[0]).toEqual({ x: 57, y: 232, width: 90, height: 54 });
    const lastRow = layout.rosterTiles.slice(16);
    expect(lastRow).toHaveLength(count - 16);
    for (const [column, tile] of lastRow.entries()) {
      expect(tile.x).toBe(layout.rosterTiles[column]!.x);
      expect(tile.y).toBe(372);
      expect(tile.y + tile.height + 7).toBe(433);
    }
  });

  it('aligns a partial last row with its actual grid columns', () => {
    const layout = characterSelectLayout(10);
    expect(layout.rosterTiles[8]!.x).toBe(layout.rosterTiles[0]!.x);
    expect(layout.rosterTiles[9]!.x).toBe(layout.rosterTiles[1]!.x);
    expect(characterSelectLayout(8)).toMatchObject({ rosterColumns: 8, rosterRows: 1 });
    expect(characterSelectLayout(1)).toMatchObject({ rosterColumns: 1, rosterRows: 1 });
  });

  it('rejects unsupported roster sizes instead of silently overflowing', () => {
    expect(() => characterSelectLayout(0)).toThrow(RangeError);
    expect(() => characterSelectLayout(25)).toThrow(RangeError);
    expect(() => characterSelectLayout(4.5)).toThrow(RangeError);
  });
});
