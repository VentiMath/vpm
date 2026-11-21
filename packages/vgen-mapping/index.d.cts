import type { SourceMapInput, SourceMapSegment } from "vtrace-mapping";
export interface Options {
  file?: string | null;
  sourceRoot?: string | null;
}
export class GenMapping {
  constructor(options?: Options);
  file: string | null | undefined;
  sourceRoot: string | null | undefined;
  private readonly _generator: unknown;
}
interface Pos {
  line: number;
  column: number;
}
interface Unmapped {
  generated: Pos;
  source?: null;
  original?: null;
  name?: null;
  content?: null;
}
interface Mapped {
  generated: Pos;
  source: string;
  original: Pos;
  name?: string | null;
  content?: string | null;
}
export type Mapping =
  | { generated: Pos; source: undefined; original: undefined; name: undefined }
  | { generated: Pos; source: string; original: Pos; name: string | undefined };
interface MapFields {
  version: 3;
  file?: string | null;
  sourceRoot?: string;
  names: readonly string[];
  sources: readonly (string | null)[];
  sourcesContent: readonly (string | null)[];
  ignoreList: readonly number[];
}
export interface EncodedSourceMap extends MapFields {
  mappings: string;
}
export interface DecodedSourceMap extends MapFields {
  mappings: readonly SourceMapSegment[][];
}
export function addSegment(
  map: GenMapping,
  line: number,
  column: number,
  source?: null,
  originalLine?: null,
  originalColumn?: null,
  name?: null,
  content?: null,
): void;
export function addSegment(
  map: GenMapping,
  line: number,
  column: number,
  source: string,
  originalLine: number,
  originalColumn: number,
  name?: string | null,
  content?: string | null,
): void;
export const maybeAddSegment: typeof addSegment;
export function addMapping(map: GenMapping, mapping: Mapped | Unmapped): void;
export const maybeAddMapping: typeof addMapping;
export function setSourceContent(
  map: GenMapping,
  source: string,
  content: string | null,
): void;
export function setIgnore(
  map: GenMapping,
  source: string,
  ignore?: boolean,
): void;
export function fromMap(input: SourceMapInput): GenMapping;
export function toDecodedMap(map: GenMapping): DecodedSourceMap;
export function toEncodedMap(map: GenMapping): EncodedSourceMap;
export function allMappings(map: GenMapping): Mapping[];
