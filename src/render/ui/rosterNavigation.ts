import { Btn } from '@core/index';

/** Directional selection follows the visible grid; horizontal wrap stays in its row. */
export function moveRosterCursor(index: number, bits: number, count: number, columns: number): number {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(columns) || columns < 1 || columns > count
    || !Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError('invalid roster grid or cursor');
  }
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const column = index % columns;
  const horizontal = Number(!!(bits & Btn.Right)) - Number(!!(bits & Btn.Left));
  const vertical = Number(!!(bits & Btn.Down)) - Number(!!(bits & Btn.Up));
  // One move per edge snapshot: a diagonal changes row rather than skipping two cards.
  if (vertical && rows > 1) {
    const nextRow = (row + vertical + rows) % rows;
    const rowLength = Math.min(columns, count - nextRow * columns);
    return nextRow * columns + Math.min(column, rowLength - 1);
  }
  if (horizontal) {
    const rowLength = Math.min(columns, count - row * columns);
    return row * columns + (column + horizontal + rowLength) % rowLength;
  }
  return index;
}

/** A single-row roster retains its original up/down difficulty controls. */
export function rosterDifficultyDirection(bits: number, rows: number): -1 | 0 | 1 {
  if (bits & Btn.D) return 1;
  if (rows > 1) return 0;
  const vertical = Number(!!(bits & Btn.Down)) - Number(!!(bits & Btn.Up));
  return vertical as -1 | 0 | 1;
}
