import { Minipass } from 'vminipass';
import { LRUCache } from 'vlru-cache';
export type Type = 'Unknown' | 'File' | 'Directory' | 'SymbolicLink' | 'FIFO' | 'CharacterDevice' | 'BlockDevice' | 'Socket';
export interface URLLike { readonly href: string; readonly protocol: string; }
export interface DirentLike {
 name: string; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean;
 isFIFO(): boolean; isCharacterDevice(): boolean; isBlockDevice(): boolean; isSocket(): boolean;
}
export interface StatsLike extends Omit<DirentLike, 'name'> {
 dev?: number; mode?: number; nlink?: number; uid?: number; gid?: number; rdev?: number;
 blksize?: number; ino?: number; size?: number; blocks?: number;
 atimeMs?: number; mtimeMs?: number; ctimeMs?: number; birthtimeMs?: number;
 atime?: Date; mtime?: Date; ctime?: Date; birthtime?: Date;
}
export interface FSOption {
 lstatSync?(path: string): StatsLike;
 readdirSync?(path: string, options: { withFileTypes: true }): DirentLike[];
 readdir?(path: string, options: { withFileTypes: true }, callback: (error: Error | null, entries: DirentLike[]) => void): void;
 readlinkSync?(path: string): string;
 realpathSync?(path: string): string;
 promises?: {
  lstat?(path: string): Promise<StatsLike>;
  readdir?(path: string, options: { withFileTypes: true }): Promise<DirentLike[]>;
  readlink?(path: string): Promise<string>;
  realpath?(path: string): Promise<string>;
 };
}
export type FSValue = Required<Omit<FSOption, 'promises'>> & { promises: Required<NonNullable<FSOption['promises']>> };
export type Children = PathBase[] & { provisional: number };
export class ChildrenCache extends LRUCache<PathBase, Children> { constructor(maxSize?: number); }
export class ResolveCache extends LRUCache<string, string> { constructor(); }
export interface PathOpts { parent?: PathBase; fs?: FSOption; fullpath?: string; relative?: string; relativePosix?: string; }
export class PathBase implements DirentLike {
 constructor(name: string, type?: number, root?: PathBase, roots?: Record<string, PathBase>, nocase?: boolean, children?: ChildrenCache, opts?: PathOpts);
 name: string; readonly root: PathBase; readonly roots: Record<string, PathBase>; readonly parent?: PathBase;
 readonly nocase: boolean; readonly sep: string; readonly splitSep: string | RegExp; isCWD: boolean;
 readonly fs: FSValue; readonly path: string; readonly parentPath: string;
 readonly dev?: number; readonly mode?: number; readonly nlink?: number; readonly uid?: number; readonly gid?: number; readonly rdev?: number;
 readonly blksize?: number; readonly ino?: number; readonly size?: number; readonly blocks?: number;
 readonly atimeMs?: number; readonly mtimeMs?: number; readonly ctimeMs?: number; readonly birthtimeMs?: number;
 readonly atime?: Date; readonly mtime?: Date; readonly ctime?: Date; readonly birthtime?: Date;
 depth(): number; childrenCache(): ChildrenCache; children(): Children;
 child(name: string, opts?: PathOpts): PathBase; newChild(name: string, type?: number, opts?: PathOpts): PathBase;
 getRootString(path: string): string; getRoot(root: string): PathBase; sameRoot(root: string): boolean;
 resolve(path?: string): PathBase; fullpath(): string; fullpathPosix(): string; relative(): string; relativePosix(): string;
 isUnknown(): boolean; isType(type: Type): boolean; getType(): Type; isENOENT(): boolean; isNamed(name: string): boolean;
 isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean; isFIFO(): boolean;
 isCharacterDevice(): boolean; isBlockDevice(): boolean; isSocket(): boolean;
 lstatCached(): PathBase | undefined; readlinkCached(): PathBase | undefined; realpathCached(): PathBase | undefined; readdirCached(): PathBase[];
 calledReaddir(): boolean; canReaddir(): boolean; canReadlink(): boolean;
 shouldWalk(visited: Set<PathBase>, walkFilter?: (entry: PathBase) => boolean): boolean;
 lstat(): Promise<PathBase | undefined>; lstatSync(): PathBase | undefined;
 readdir(): Promise<PathBase[]>; readdirSync(): PathBase[];
 readdirCB(callback: (error: Error | null, entries: PathBase[]) => unknown, allowZalgo?: boolean): void;
 readlink(): Promise<PathBase | undefined>; readlinkSync(): PathBase | undefined;
 realpath(): Promise<PathBase | undefined>; realpathSync(): PathBase | undefined;
}
export class PathPosix extends PathBase {}
export class PathWin32 extends PathBase {}
export type Path = PathBase;
export const Path: typeof PathPosix | typeof PathWin32;
export interface PathScurryOpts { nocase?: boolean; childrenCacheSize?: number; fs?: FSOption; }
export interface WalkOptions { withFileTypes?: boolean; follow?: boolean; filter?: (entry: PathBase) => boolean; walkFilter?: (entry: PathBase) => boolean; }
export type WalkOptionsWithFileTypesUnset = WalkOptions & { withFileTypes?: undefined };
export type WalkOptionsWithFileTypesTrue = WalkOptions & { withFileTypes: true };
export type WalkOptionsWithFileTypesFalse = WalkOptions & { withFileTypes: false };
type Entry = string | PathBase;
type WalkRow<O> = O extends { withFileTypes: false } ? string : O extends { withFileTypes?: true | undefined } ? PathBase : string | PathBase;
type LinkRow<O> = O extends { withFileTypes: true } ? PathBase : O extends { withFileTypes?: false | undefined } ? string : string | PathBase;
export class PathScurryBase implements Iterable<PathBase>, AsyncIterable<PathBase> {
 constructor(cwd?: string | URLLike, opts?: PathScurryOpts);
 cwd: PathBase; readonly rootPath: string; readonly root: PathBase; readonly roots: Record<string, PathBase>; readonly nocase: boolean; readonly sep: string | RegExp; readonly fs: FSValue;
 isAbsolute(path: string): boolean; parseRootPath(path: string): string;
 chdir(path?: Entry): void; depth(path?: Entry): number;
 resolve(...paths: string[]): string; resolvePosix(...paths: string[]): string;
 relative(path?: Entry): string; relativePosix(path?: Entry): string; basename(path?: Entry): string; dirname(path?: Entry): string;
 lstat(path?: Entry): Promise<PathBase | undefined>; lstatSync(path?: Entry): PathBase | undefined;
 readdirSync<O extends { withFileTypes?: boolean } = { withFileTypes?: true }>(opts?: O): WalkRow<O>[];
 readdirSync<O extends { withFileTypes?: boolean } = { withFileTypes?: true }>(entry: Entry, opts?: O): WalkRow<O>[];
 readdir<O extends { withFileTypes?: boolean } = { withFileTypes?: true }>(opts?: O): Promise<WalkRow<O>[]>;
 readdir<O extends { withFileTypes?: boolean } = { withFileTypes?: true }>(entry: Entry, opts?: O): Promise<WalkRow<O>[]>;
 walkSync<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): WalkRow<O>[];
 walkSync<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): WalkRow<O>[];
 walk<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): Promise<WalkRow<O>[]>;
 walk<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): Promise<WalkRow<O>[]>;
 iterateSync<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): Generator<WalkRow<O>>;
 iterateSync<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): Generator<WalkRow<O>>;
 iterate<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): AsyncGenerator<WalkRow<O>>;
 iterate<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): AsyncGenerator<WalkRow<O>>;
 streamSync<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): Minipass<WalkRow<O>>;
 streamSync<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): Minipass<WalkRow<O>>;
 stream<O extends WalkOptions = { withFileTypes?: true }>(opts?: O): Minipass<WalkRow<O>>;
 stream<O extends WalkOptions = { withFileTypes?: true }>(entry: Entry, opts?: O): Minipass<WalkRow<O>>;
 readlinkSync<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(opts?: O): LinkRow<O> | undefined;
 readlinkSync<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(entry: Entry, opts?: O): LinkRow<O> | undefined;
 readlink<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(opts?: O): Promise<LinkRow<O> | undefined>;
 readlink<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(entry: Entry, opts?: O): Promise<LinkRow<O> | undefined>;
 realpathSync<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(opts?: O): LinkRow<O> | undefined;
 realpathSync<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(entry: Entry, opts?: O): LinkRow<O> | undefined;
 realpath<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(opts?: O): Promise<LinkRow<O> | undefined>;
 realpath<O extends { withFileTypes?: boolean } = { withFileTypes?: false }>(entry: Entry, opts?: O): Promise<LinkRow<O> | undefined>;
 [Symbol.iterator](): Generator<PathBase>; [Symbol.asyncIterator](): AsyncGenerator<PathBase>;
}
export class PathScurryPosix extends PathScurryBase {}
export class PathScurryDarwin extends PathScurryPosix {}
export class PathScurryWin32 extends PathScurryBase {}
export type PathScurry = PathScurryBase;
export const PathScurry: typeof PathScurryPosix | typeof PathScurryDarwin | typeof PathScurryWin32;
