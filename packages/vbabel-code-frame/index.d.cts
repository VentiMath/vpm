export interface SourceLocation {
  line: number;
  column?: number;
}
export interface SourceRange {
  start: SourceLocation;
  end?: SourceLocation;
}
export interface Options {
  highlightCode?: boolean;
  forceColor?: boolean;
  message?: string;
  linesAbove?: number;
  linesBelow?: number;
  startLine?: number;
}
export function codeFrameColumns(
  source: string,
  location: SourceRange,
  options?: Options,
): string;
export function highlight(source: string): string;
/** @deprecated Use codeFrameColumns with a SourceRange. */
export default function codeFrame(
  source: string,
  line: number,
  column: number,
  options?: Options,
): string;
