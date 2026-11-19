export interface Position { line: number; column: number }
export interface RawMap {
  version: number | string; sources: string[]; mappings: string; names?: string[];
  file?: string; sourceRoot?: string; sourcesContent?: (string | null)[];
}
export interface Mapping {
  generatedLine: number; generatedColumn: number; originalLine: number | null;
  originalColumn: number | null; source: string | null; name: string | null;
}
export interface Options { file?: string; sourceRoot?: string; ignoreInvalidMapping?: boolean }
export class SourceMapGenerator {
  constructor(options?: Options);
  static fromSourceMap(consumer: SourceMapConsumer, options?: Options): SourceMapGenerator;
  addMapping(entry: { generated: Position; original?: Position | null; source?: string | null; name?: string | null }): void;
  applySourceMap(consumer: SourceMapConsumer, file?: string, path?: string): void;
  setSourceContent(source: string, content: string | null | undefined): void;
  toJSON(): RawMap;
  toString(): string;
}
export class SourceMapConsumer {
  constructor(input: RawMap | string);
  file: string | null; readonly sourceRoot: string | null;
  readonly sources: string[]; sourcesContent: (string | null)[] | null;
  static readonly GENERATED_ORDER: 1;
  static readonly GREATEST_LOWER_BOUND: 1;
  static readonly LEAST_UPPER_BOUND: 2;
  originalPositionFor(query: Position & {bias?: 1 | 2}): {source: string | null; name: string | null; line: number | null; column: number | null};
  sourceContentFor(source: string, allowMissing?: boolean): string | null;
  eachMapping(callback: (mapping: Mapping) => void, context?: unknown, order?: 1): void;
}
