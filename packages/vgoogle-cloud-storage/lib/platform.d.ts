/** Structural Node capabilities; consumers do not need ambient platform types. */
export type BufferEncoding = 'ascii'|'utf8'|'utf-8'|'utf16le'|'utf-16le'|'ucs2'|'ucs-2'|'base64'|'base64url'|'latin1'|'binary'|'hex';
export interface Buffer extends Uint8Array {
  toString(encoding?: BufferEncoding, start?: number, end?: number): string;
  equals(other: Uint8Array): boolean;
  subarray(start?: number, end?: number): Buffer;
  readInt32BE(offset?: number): number;
  readUInt32BE(offset?: number): number;
}
export interface URL { href: string; protocol: string; host: string; hostname: string; port: string; pathname: string; search: string; hash: string; toString(): string; }
export type PathLike = string | Buffer | URL;
export interface OutgoingHttpHeaders { [key: string]: string | number | readonly string[] | undefined; }
export interface ParsedUrlQueryInput { [key: string]: string | number | boolean | readonly string[] | readonly number[] | readonly boolean[] | null | undefined; }
export class EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  listenerCount(event: string | symbol): number;
  listeners(event: string | symbol): Function[];
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  eventNames(): (string | symbol)[];
}
export interface WritableOptions { highWaterMark?: number; objectMode?: boolean; decodeStrings?: boolean; autoDestroy?: boolean; emitClose?: boolean; [name: string]: unknown; }
export interface DuplexOptions extends WritableOptions { readableObjectMode?: boolean; writableObjectMode?: boolean; allowHalfOpen?: boolean; }
export class Readable extends EventEmitter implements AsyncIterable<any> {
  constructor(options?: WritableOptions);
  read(size?: number): any;
  _read(size: number): void;
  push(chunk: any, encoding?: BufferEncoding): boolean;
  destroy(error?: Error): this;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  pipe<T>(destination: T, options?: {end?: boolean}): T;
  unpipe(destination?: any): this;
  setEncoding(encoding: BufferEncoding): this;
  [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  readonly destroyed: boolean;
  readonly readable: boolean;
  readonly readableEnded: boolean;
  readonly readableLength: number;
}
export class Writable extends EventEmitter {
  constructor(options?: WritableOptions);
  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
  write(chunk: any, callback?: (error?: Error | null) => void): boolean;
  write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean;
  end(callback?: () => void): this;
  end(chunk: any, callback?: () => void): this;
  end(chunk: any, encoding?: BufferEncoding, callback?: () => void): this;
  destroy(error?: Error): this;
  readonly destroyed: boolean;
  readonly writable: boolean;
  readonly writableFinished: boolean;
  readonly writableEnded: boolean;
}
export interface Duplex extends Readable, Writable {}
export class Duplex extends Readable {}
export class Transform extends Duplex {}
export class PassThrough extends Transform {}
export type PipelineSource<T> = Iterable<T> | AsyncIterable<T> | (() => Iterable<T> | AsyncIterable<T>) | Readable;
