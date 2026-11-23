export interface Cursor {
  /** Zero-based position; omitting row preserves the current row. */
  to(column: number, row?: number): string;
  move(horizontal?: number, vertical?: number): string;
  up(count?: number): string;
  down(count?: number): string;
  forward(count?: number): string;
  backward(count?: number): string;
  nextLine(count?: number): string;
  prevLine(count?: number): string;
  left: string; hide: string; show: string; save: string; restore: string;
}
export interface Erase {
  screen: string; line: string; lineEnd: string; lineStart: string;
  up(count?: number): string;
  down(count?: number): string;
  /** Clear this row and preceding rows. At most 1,000,000 rows per call. */
  lines(count?: number): string;
}
export const cursor: Cursor;
export const erase: Erase;
export const scroll: { up(count?: number): string; down(count?: number): string };
export const beep: "\u0007";
export const clear: { screen: string };
