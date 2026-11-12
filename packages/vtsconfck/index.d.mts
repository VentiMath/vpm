export interface CompilerOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  allowJs?: boolean;
  checkJs?: boolean;
  [key: string]: unknown;
}
export interface TSConfig {
  compilerOptions?: CompilerOptions;
  extends?: string | string[];
  references?: { path: string }[];
  files?: string[];
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}
export interface TSConfckParseResult {
  tsconfigFile: string | null;
  tsconfig: TSConfig;
  extended?: TSConfckParseResult[];
  solution?: TSConfckParseResult;
  referenced?: TSConfckParseResult[];
}
export interface TSConfckFindOptions {
  cache?: TSConfckCache;
  root?: string;
  ignoreNodeModules?: boolean;
  configName?: string;
}
export interface TSConfckParseOptions extends TSConfckFindOptions {}
export interface TSConfckFindAllOptions {
  skip?: (directoryName: string) => boolean;
  configNames?: string[];
}
export declare class TSConfckCache<T = TSConfckParseResult> {
  clear(): void;
  hasConfigPath(dir: string, configName?: string): boolean;
  getConfigPath(
    dir: string,
    configName?: string,
  ): string | null | undefined | Promise<string | null>;
  hasParseResult(file: string): boolean;
  getParseResult(file: string): T | undefined | Promise<T>;
}
export declare class TSConfckParseError extends Error {
  constructor(
    message: string,
    code: string,
    tsconfigFile: string,
    cause?: unknown,
  );
  code: string;
  tsconfigFile: string;
  cause?: unknown;
}
export declare function toJson(text: string): string;
export declare function find(
  filename: string,
  options?: TSConfckFindOptions,
): Promise<string | null>;
export declare function findAll(
  directory: string,
  options?: TSConfckFindAllOptions,
): Promise<string[]>;
export declare function parse(
  filename: string,
  options?: TSConfckParseOptions,
): Promise<TSConfckParseResult>;
/** Compiler-backed mode is outside the documented application contract and rejects with UNSUPPORTED_NATIVE. */
export declare function parseNative(filename: string): Promise<never>;
export declare function findNative(filename: string): Promise<never>;
