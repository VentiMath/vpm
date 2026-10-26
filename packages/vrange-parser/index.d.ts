/** Return inclusive ranges, -1 when unsatisfiable, or -2 for malformed syntax. */
declare function rangeParser(size: number, value: string, options?: rangeParser.Options | null): rangeParser.Ranges | -1 | -2;
declare namespace rangeParser {
  interface Range { start: number; end: number; }
  interface Ranges extends Array<Range> { type: string; }
  interface Options { combine?: boolean; }
}
export = rangeParser;
