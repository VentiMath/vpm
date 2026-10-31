/** Structural Node capabilities; consumers do not need ambient platform types. */
export type BufferEncoding = 'ascii'|'utf8'|'utf-8'|'utf16le'|'utf-16le'|'ucs2'|'ucs-2'|'base64'|'base64url'|'latin1'|'binary'|'hex';
export type Buffer = import('vgrpc-proto-loader').ByteBuffer;
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
export class Stream extends EventEmitter { pipe<T>(destination: T, options?: {end?: boolean}): T; }
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
export interface Headers extends Iterable<[string, string]> { get(name: string): string | null; set(name: string, value: string): void; append(name: string, value: string): void; has(name: string): boolean; delete(name: string): void; forEach(callback: (value: string, key: string, parent: Headers) => void): void; }
export interface Timeout { ref(): this; unref(): this; }

export interface AbortSignal { readonly aborted: boolean; readonly reason: any; addEventListener(type: string, listener: (...args: any[]) => void, options?: any): void; removeEventListener(type: string, listener: (...args: any[]) => void): void; }
export interface AbortController { readonly signal: AbortSignal; abort(reason?: any): void; }
export interface ReadableStream<T = Uint8Array> { getReader(): { read(): Promise<{done: boolean; value?: T}>; releaseLock(): void; cancel(reason?: any): Promise<void> }; }
export namespace NodeJS { export interface ReadableStream extends EventEmitter { readable: boolean; read(size?: number): any; pipe<T>(destination:T, options?:{end?:boolean}):T; pause(): this; resume(): this; } }
