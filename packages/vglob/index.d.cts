import { Minipass, type AbortSignalLike } from 'vminipass';
import { PathScurryBase, type Path, type FSOption, type URLLike } from 'vpath-scurry';
export { escape, unescape } from 'vminimatch';
export type { Path, FSOption, WalkOptions, WalkOptionsWithFileTypesTrue, WalkOptionsWithFileTypesUnset } from 'vpath-scurry';
export type Form = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
export interface IgnoreLike { ignored?(path: Path): boolean; childrenIgnored?(path: Path): boolean; add?(pattern: string): void; }
export interface GlobOptions {
 absolute?: boolean; cwd?: string | URLLike; dot?: boolean; dotRelative?: boolean; follow?: boolean;
 ignore?: string | string[] | IgnoreLike; magicalBraces?: boolean; mark?: boolean; matchBase?: boolean;
 maxDepth?: number; nobrace?: boolean; nocase?: boolean; nodir?: boolean; noext?: boolean;
 normalize?: boolean | Form; noglobstar?: boolean; platform?: string; realpath?: boolean; root?: string;
 scurry?: PathScurryBase; stat?: boolean; signal?: AbortSignalLike; windowsPathsNoEscape?: boolean;
 allowWindowsEscape?: boolean; withFileTypes?: boolean; fs?: FSOption; posix?: boolean;
 includeChildMatches?: boolean; braceExpandMax?: number;
}
export type GlobOptionsWithFileTypesTrue = GlobOptions & { withFileTypes: true; absolute?: never };
export type GlobOptionsWithFileTypesFalse = GlobOptions & { withFileTypes?: false };
export type GlobOptionsWithFileTypesUnset = GlobOptions & { withFileTypes?: undefined };
type Row<O> = O extends { withFileTypes: true } ? Path : 'withFileTypes' extends keyof O ? O['withFileTypes'] extends false | undefined ? string : Path | string : string;
export type MatchStream<O extends GlobOptions = GlobOptions> = Minipass<Row<O>>;
export class Ignore implements IgnoreLike {
 constructor(patterns: string | string[], options?: GlobOptions, cwd?: Path);
 add(pattern: string): void; ignored(path: Path): boolean; childrenIgnored(path: Path): boolean;
}
export class Glob<O extends GlobOptions = GlobOptionsWithFileTypesUnset> implements Iterable<Row<O>>, AsyncIterable<Row<O>> {
 constructor(pattern: string | string[], options?: O);
 readonly pattern: string[]; readonly opts: O; readonly cwd: string; readonly scurry: PathScurryBase;
 readonly nocase: boolean; readonly withFileTypes: O extends { withFileTypes: true } ? true : 'withFileTypes' extends keyof O ? O['withFileTypes'] extends false | undefined ? false : boolean : false; readonly platform: string;
 walk(): Promise<Row<O>[]>; walkSync(): Row<O>[];
 iterate(): AsyncGenerator<Row<O>, void, unknown>; iterateSync(): Generator<Row<O>, void, unknown>;
 stream(): Minipass<Row<O>>; streamSync(): Minipass<Row<O>>;
 [Symbol.iterator](): Generator<Row<O>, void, unknown>; [Symbol.asyncIterator](): AsyncGenerator<Row<O>, void, unknown>;
}
export interface Glob<O extends GlobOptions = GlobOptionsWithFileTypesUnset> extends GlobOptions {}
export function hasMagic(pattern: string | string[], options?: GlobOptions): boolean;
export function glob<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): Promise<Row<O>[]>;
export function globSync<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): Row<O>[];
export function globStream<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): Minipass<Row<O>>;
export function globStreamSync<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): Minipass<Row<O>>;
export function globIterate<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): AsyncGenerator<Row<O>, void, unknown>;
export function globIterateSync<O extends GlobOptions = GlobOptionsWithFileTypesUnset>(pattern: string | string[], options?: O): Generator<Row<O>, void, unknown>;
export namespace globSync { const stream: typeof globStreamSync; const iterate: typeof globIterateSync; }
export namespace globStream { const sync: typeof globStreamSync; }
export namespace globIterate { const sync: typeof globIterateSync; }
export { globSync as sync, globStream as stream, globStreamSync as streamSync, globIterate as iterate, globIterateSync as iterateSync };
declare const GlobClass: typeof Glob, hasMagicFn: typeof hasMagic;
declare const escapeFn: typeof import('vminimatch').escape, unescapeFn: typeof import('vminimatch').unescape;
declare const globFn: typeof glob, syncFn: typeof globSync, streamFn: typeof globStream, streamSyncFn: typeof globStreamSync, iterateFn: typeof globIterate, iterateSyncFn: typeof globIterateSync;
export namespace glob {
 const Glob: typeof GlobClass; const hasMagic: typeof hasMagicFn; const escape: typeof escapeFn; const unescape: typeof unescapeFn;
 const glob: typeof globFn; const globSync: typeof syncFn; const sync: typeof syncFn;
 const globStream: typeof streamFn; const stream: typeof streamFn; const globStreamSync: typeof streamSyncFn; const streamSync: typeof streamSyncFn;
 const globIterate: typeof iterateFn; const iterate: typeof iterateFn; const globIterateSync: typeof iterateSyncFn; const iterateSync: typeof iterateSyncFn;
}
