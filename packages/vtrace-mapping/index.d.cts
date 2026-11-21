import type { SourceMapSegment } from "vsourcemap-codec";
export type { SourceMapSegment } from "vsourcemap-codec";
export const GREATEST_LOWER_BOUND: 1, LEAST_UPPER_BOUND: -1;
export type Bias = 1 | -1;
export interface SourceMapV3 {
  version: 3;
  file?: string | null;
  sourceRoot?: string;
  sources: (string | null)[];
  names: string[];
  sourcesContent?: (string | null)[];
  ignoreList?: number[];
}
export interface EncodedSourceMap extends SourceMapV3 {
  mappings: string;
}
export interface DecodedSourceMap extends SourceMapV3 {
  mappings: SourceMapSegment[][];
}
type ReadonlyInput<T> = T extends object
  ? { readonly [K in keyof T]: ReadonlyInput<T[K]> }
  : T;
export type SourceMapInput =
  | string
  | TraceMap
  | ReadonlyInput<
      (EncodedSourceMap | DecodedSourceMap) & { x_google_ignoreList?: number[] }
    >;
export class TraceMap implements SourceMapV3 {
  constructor(input: SourceMapInput, mapUrl?: string | null);
  version: 3;
  file?: string | null;
  sourceRoot?: string;
  sources: (string | null)[];
  names: string[];
  sourcesContent?: (string | null)[];
  ignoreList?: number[];
  resolvedSources: string[];
}
export interface Needle {
  line: number;
  column: number;
  bias?: Bias;
}
export interface SourceNeedle extends Needle {
  source: string;
}
export type GeneratedMapping = { line: number; column: number };
export type InvalidGeneratedMapping = { line: null; column: null };
export type OriginalMapping = GeneratedMapping & {
  source: string | null;
  name: string | null;
};
export type Mapping = OriginalMapping;
export type InvalidOriginalMapping = InvalidGeneratedMapping & {
  source: null;
  name: null;
};
export interface EachMapping {
  generatedLine: number;
  generatedColumn: number;
  originalLine: number | null;
  originalColumn: number | null;
  source: string | null;
  name: string | null;
}
export function presortedDecodedMap(
  input: ReadonlyInput<DecodedSourceMap>,
  url?: string,
): TraceMap;
export function encodedMappings(map: TraceMap): string;
export function decodedMappings(map: TraceMap): readonly SourceMapSegment[][];
export function encodedMap(map: TraceMap): EncodedSourceMap;
export function decodedMap(
  map: TraceMap,
): Omit<DecodedSourceMap, "mappings"> & {
  mappings: readonly SourceMapSegment[][];
};
export function traceSegment(
  map: TraceMap,
  line: number,
  column: number,
): Readonly<SourceMapSegment> | null;
export function originalPositionFor(
  map: TraceMap,
  needle: Needle,
): OriginalMapping | InvalidOriginalMapping;
export function generatedPositionFor(
  map: TraceMap,
  needle: SourceNeedle,
): GeneratedMapping | InvalidGeneratedMapping;
export function allGeneratedPositionsFor(
  map: TraceMap,
  needle: SourceNeedle,
): GeneratedMapping[];
export function eachMapping(
  map: TraceMap,
  fn: (entry: EachMapping) => void,
): void;
export function sourceContentFor(map: TraceMap, source: string): string | null;
export function isIgnored(map: TraceMap, source: string): boolean;
