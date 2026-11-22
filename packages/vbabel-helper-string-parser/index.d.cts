export interface StringLocation {
  pos: number;
  lineStart: number;
  curLine: number;
}
export type Diagnostic = (
  pos: number,
  lineStart: number,
  curLine: number,
) => void;
export interface NumericErrors {
  numericSeparatorInEscapeSequence: Diagnostic;
  unexpectedNumericSeparator: Diagnostic;
  invalidDigit: (
    pos: number,
    lineStart: number,
    curLine: number,
    radix: number,
  ) => void;
}
export interface EscapeErrors extends NumericErrors {
  invalidEscapeSequence: Diagnostic;
  invalidCodePoint: Diagnostic;
}
export interface StringErrors extends EscapeErrors {
  strictNumericEscape: Diagnostic;
  unterminated: Diagnostic;
}
export function readInt(
  input: string,
  pos: number,
  lineStart: number,
  curLine: number,
  radix: 2 | 8 | 10 | 16,
  len: number | null | undefined,
  forceLen: boolean,
  allowNumSeparator: boolean | "bail",
  errors: NumericErrors,
  bailOnError?: boolean,
): { n: number | null; pos: number };
export function readCodePoint(
  input: string,
  pos: number,
  lineStart: number,
  curLine: number,
  throwOnInvalid: boolean,
  errors: EscapeErrors,
): { code: number | null; pos: number };
export function readStringContents(
  type: "template" | "single" | "double",
  input: string,
  pos: number,
  lineStart: number,
  curLine: number,
  errors: StringErrors,
): StringLocation & {
  str: string;
  firstInvalidLoc: StringLocation | null;
  containsInvalid: boolean;
};
