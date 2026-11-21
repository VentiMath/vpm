export type SourceMapSegment =
  | [number]
  | [number, number, number, number]
  | [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];
export function decode(mappings: string): SourceMapMappings;
export function encode(
  lines: readonly (readonly Readonly<SourceMapSegment>[])[],
): string;
