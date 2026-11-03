// Structural Node stream contract; no ambient Node dependency.
type Buffer = typeof globalThis extends {Buffer: {alloc(size: number): infer B}} ? B : Uint8Array;
type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'utf-16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';
/** The members of Node's `NodeJS.ReadableStream`, so a result is assignable to it. */
export interface Readable<T=any> extends AsyncIterable<T> {
  readable: boolean;
  read(size?: number): string | Buffer;
  setEncoding(encoding: BufferEncoding): this;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  pipe<T extends {write(chunk: any, ...rest: any[]): any; end(...args: any[]): any}>(destination: T, options?: {end?: boolean | undefined}): T;
  unpipe(destination?: {write(chunk: any, ...rest: any[]): any}): this;
  unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void;
  wrap(oldStream: Readable<any>): this;
  [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  on(eventName: string | symbol, listener: (...args: any[]) => void): this;
  once(eventName: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  off(eventName: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(eventName?: string | symbol): this;
  setMaxListeners(n: number): this;
  getMaxListeners(): number;
  listeners(eventName: string | symbol): Function[];
  rawListeners(eventName: string | symbol): Function[];
  emit(eventName: string | symbol, ...args: any[]): boolean;
  listenerCount(eventName: string | symbol, listener?: Function): number;
  prependListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  eventNames(): (string | symbol)[];
}
