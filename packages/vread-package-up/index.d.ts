/** Structural type for a real URL instance. Only file: URLs are accepted. */
export interface FileURL { readonly href: string; readonly protocol: string; }
export interface Options {
  /** Starting directory; defaults to process.cwd(). */
  readonly cwd?: string | FileURL;
  /** Inclusive ancestor boundary; relative paths resolve against cwd. */
  readonly stopAt?: string | FileURL;
  /** Required. Raw metadata is always returned; npm metadata normalization is unsupported. */
  readonly normalize: false;
  readonly type?: 'file';
}
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
/** An object parsed from JSON; individual package fields are not schema-validated. */
export interface PackageJson { [key: string]: JsonValue; }
export interface ReadResult { packageJson: PackageJson; path: string; }
export class PackageJsonError extends SyntaxError {
  constructor(filePath: string, reason: string, position?: number);
  readonly code: 'ERR_INVALID_PACKAGE_JSON';
  readonly path: string;
  /** Offset in decoded text after removing a BOM, when supplied by the runtime. */
  readonly position?: number;
}
export function readPackageUp(options: Options): Promise<ReadResult | undefined>;
export function readPackageUpSync(options: Options): ReadResult | undefined;
