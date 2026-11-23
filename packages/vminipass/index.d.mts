/** Structural stream types keep Node and DOM ambient declarations optional. */
export interface BufferLike extends Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
  equals(other: Uint8Array): boolean;
}
export type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "utf-16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";
export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason: unknown;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
export interface StreamEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export namespace Minipass {
  type Encoding = BufferEncoding | "buffer" | null;
  type ContiguousData = string | BufferLike | ArrayBufferLike | ArrayBufferView;
  type BufferOrString = BufferLike | string;
  type SharedOptions = { async?: boolean; signal?: AbortSignalLike };
  type ObjectModeOptions = SharedOptions & {
    objectMode: true;
    encoding?: Encoding;
  };
  type EncodingOptions = SharedOptions & {
    objectMode?: false;
    encoding: BufferEncoding;
  };
  type BufferOptions = SharedOptions & {
    objectMode?: false;
    encoding?: null | "buffer";
  };
  type Options<T> =
    | ObjectModeOptions
    | (T extends string
        ? EncodingOptions
        : T extends BufferLike
          ? BufferOptions
          : never);
  type DualIterable<T> = Iterable<T> & AsyncIterable<T>;
  interface Writable extends StreamEmitter {
    write(chunk: any, ...args: any[]): unknown;
    end(...args: any[]): unknown;
  }
  interface Readable extends StreamEmitter {
    pipe(destination: any, ...args: any[]): unknown;
  }
  interface Events<T = BufferLike> {
    [event: string | symbol]: any[];
    data: [chunk: T];
    error: [error: unknown];
    abort: [reason: unknown];
    readable: [];
    drain: [];
    resume: [];
    end: [];
    prefinish: [];
    finish: [];
    close: [];
  }
}
export interface PipeOptions {
  end?: boolean;
  proxyErrors?: boolean;
}
export interface Pipe<T = BufferLike> {
  src: Minipass<T, any>;
  dest: Minipass.Writable;
  opts: PipeOptions;
  ondrain(): void;
  unpipe(): void;
}
export function isReadable(value: unknown): value is Minipass.Readable;
export function isWritable(value: unknown): value is Minipass.Writable;
export function isStream(
  value: unknown,
): value is Minipass.Readable | Minipass.Writable;
export class Minipass<
  R = BufferLike,
  W = R extends Minipass.BufferOrString ? Minipass.ContiguousData : R,
  E extends Minipass.Events<R> = Minipass.Events<R>,
> implements Minipass.DualIterable<R> {
  on<K extends keyof E>(event: K, listener: (...args: E[K]) => void): this;
  addListener<K extends keyof E>(
    event: K,
    listener: (...args: E[K]) => void,
  ): this;
  once<K extends keyof E>(event: K, listener: (...args: E[K]) => void): this;
  prependListener<K extends keyof E>(
    event: K,
    listener: (...args: E[K]) => void,
  ): this;
  prependOnceListener<K extends keyof E>(
    event: K,
    listener: (...args: E[K]) => void,
  ): this;
  removeListener<K extends keyof E>(
    event: K,
    listener: (...args: E[K]) => void,
  ): this;
  off<K extends keyof E>(event: K, listener: (...args: E[K]) => void): this;
  removeAllListeners(event?: keyof E): this;
  emit<K extends keyof E>(event: K, ...args: E[K]): boolean;
  listenerCount(event: keyof E): number;
  listeners<K extends keyof E>(event: K): ((...args: E[K]) => void)[];
  rawListeners<K extends keyof E>(event: K): ((...args: E[K]) => void)[];
  eventNames(): (string | symbol)[];
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  static isStream: typeof isStream;
  constructor(
    ...options: R extends BufferLike
      ? [options?: Minipass.Options<R>]
      : [options: Minipass.Options<R>]
  );
  readable: boolean;
  writable: boolean;
  async: boolean;
  readonly bufferLength: number;
  readonly encoding: BufferEncoding | null;
  readonly objectMode: boolean;
  readonly aborted: boolean;
  readonly destroyed: boolean;
  readonly flowing: boolean;
  readonly paused: boolean;
  readonly emittedEnd: boolean;
  readonly pipes: Pipe<R>[];
  setEncoding(encoding: Minipass.Encoding): never;
  write(chunk: W, callback?: () => void): boolean;
  write(chunk: W, encoding?: Minipass.Encoding, callback?: () => void): boolean;
  read(size?: number | null): R | null;
  end(callback?: () => void): this;
  end(chunk: W, callback?: () => void): this;
  end(chunk: W, encoding?: Minipass.Encoding, callback?: () => void): this;
  pause(): void;
  resume(): void;
  pipe<T extends Minipass.Writable>(destination: T, options?: PipeOptions): T;
  unpipe(destination?: Minipass.Writable): void;
  collect(): Promise<R[] & { dataLength: number }>;
  concat(): Promise<R>;
  promise(): Promise<void>;
  destroy(error?: unknown): this;
  [Symbol.iterator](): Generator<R, void, void>;
  [Symbol.asyncIterator](): AsyncGenerator<R, void, void>;
}
