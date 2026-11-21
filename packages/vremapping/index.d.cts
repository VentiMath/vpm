import type {
  SourceMapInput,
  EncodedSourceMap,
  DecodedSourceMap,
  SourceMapSegment,
} from "vtrace-mapping";
declare function remapping(
  input: SourceMapInput | readonly SourceMapInput[],
  loader: remapping.SourceMapLoader,
  options?: boolean | remapping.Options,
): remapping.SourceMap;
declare namespace remapping {
  export type {
    SourceMapInput,
    EncodedSourceMap,
    EncodedSourceMap as RawSourceMap,
    DecodedSourceMap,
    SourceMapSegment,
  };
  export interface LoaderContext {
    readonly importer: string;
    readonly depth: number;
    source: string;
    content: string | null | undefined;
    ignore: boolean | undefined;
  }
  export type SourceMapLoader = (
    file: string,
    ctx: LoaderContext,
  ) => SourceMapInput | null | undefined | void;
  export interface Options {
    excludeContent?: boolean;
    decodedMappings?: boolean;
  }
  export interface SourceMap {
    version: 3;
    file?: string | null;
    sourceRoot?: string;
    names: string[];
    sources: (string | null)[];
    sourcesContent?: (string | null)[];
    mappings: string | SourceMapSegment[][];
    ignoreList?: number[];
    toString(): string;
  }
}
export = remapping;
