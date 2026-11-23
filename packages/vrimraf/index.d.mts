import type { GlobOptions } from 'vglob';
export interface Entry {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isFile(): boolean;
}
export interface Signal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener?(name: 'abort', callback: () => void, options?: { once?: boolean }): void;
  removeEventListener?(name: 'abort', callback: () => void): void;
}
export interface RimrafOptions {
  preserveRoot?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  glob?: boolean | GlobOptions;
  signal?: Signal;
  filter?: (path: string, entry: Entry) => unknown | Promise<unknown>;
}
export type RimrafAsyncOptions = RimrafOptions;
export interface RimrafSyncOptions extends Omit<RimrafOptions, 'filter'> {
  filter?: (path: string, entry: Entry) => boolean;
}
export function rimraf(paths: string | string[], options?: RimrafOptions): Promise<boolean>;
export function rimrafSync(paths: string | string[], options?: RimrafSyncOptions): boolean;
export { rimrafSync as sync };
export function isRimrafOptions(value: unknown): value is RimrafOptions;
export function assertRimrafOptions(value: unknown): asserts value is RimrafOptions;
declare const fn: typeof rimraf, syncFn: typeof rimrafSync;
export namespace rimraf {
  const rimraf: typeof fn;
  const rimrafSync: typeof syncFn;
  const sync: typeof syncFn;
}
