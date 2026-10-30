declare const duplexify: {
  (writable?: duplexify.WritableLike | null | false, readable?: duplexify.ReadableLike | null | false, options?: duplexify.Options): duplexify.Duplexify;
  new(writable?: duplexify.WritableLike | null | false, readable?: duplexify.ReadableLike | null | false, options?: duplexify.Options): duplexify.Duplexify;
  readonly prototype: duplexify.Duplexify;
  obj(writable?: duplexify.WritableLike | null | false, readable?: duplexify.ReadableLike | null | false, options?: duplexify.Options): duplexify.Duplexify;
};
declare namespace duplexify {
  type Listener = (...args: any[]) => void;
  interface StreamLike {
    on(event: string | symbol, listener: Listener): this;
    removeListener(event: string | symbol, listener: Listener): this;
    destroy?(error?: Error): unknown;
  }
  interface WritableLike extends StreamLike {
    write(chunk: any, ...args: any[]): boolean;
    end(...args: any[]): unknown;
  }
  interface ReadableLike extends StreamLike {
    read?(size?: number): any;
    pause?(): unknown;
  }
  interface Options {
    objectMode?: boolean;
    readableObjectMode?: boolean;
    writableObjectMode?: boolean;
    highWaterMark?: number;
    readableHighWaterMark?: number;
    writableHighWaterMark?: number;
    readable?: boolean;
    writable?: boolean;
    allowHalfOpen?: boolean;
    decodeStrings?: boolean;
    emitClose?: boolean;
    /** False disables child-error destruction. True also destroys on normal completion. */
    autoDestroy?: boolean;
    /** Forward explicit/error destruction to attached streams. Default true. */
    destroy?: boolean;
    /** End the attached sink when the adapter ends. Default true. */
    end?: boolean;
  }
  interface Duplexify extends WritableLike, ReadableLike, AsyncIterable<any> {
    setWritable(stream: WritableLike | null | false): void;
    setReadable(stream: ReadableLike | null | false): void;
    cork(): void;
    uncork(): void;
    read(size?: number): any;
    write(chunk: any, callback?: (error?: Error | null) => void): boolean;
    write(chunk: any, encoding?: string, callback?: (error?: Error | null) => void): boolean;
    end(callback?: () => void): this;
    end(chunk: any, callback?: () => void): this;
    end(chunk: any, encoding?: string, callback?: () => void): this;
    [Symbol.asyncIterator](): AsyncIterableIterator<any>;
    destroy(error?: Error | null, callback?: (error: null) => void): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    setEncoding(encoding: string): this;
    pipe<T>(destination: T, options?: {end?: boolean}): T;
    unpipe(destination?: any): this;
    unshift(chunk: any, encoding?: string): void;
    wrap(stream: ReadableLike): this;
    addListener(event: string | symbol, listener: Listener): this;
    once(event: string | symbol, listener: Listener): this;
    off(event: string | symbol, listener: Listener): this;
    prependListener(event: string | symbol, listener: Listener): this;
    prependOnceListener(event: string | symbol, listener: Listener): this;
    removeAllListeners(event?: string | symbol): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    listenerCount(event: string | symbol, listener?: Listener): number;
    listeners(event: string | symbol): Listener[];
    rawListeners(event: string | symbol): Listener[];
    eventNames(): (string | symbol)[];
    setMaxListeners(count: number): this;
    getMaxListeners(): number;
    readonly readable: boolean;
    readonly readableEnded: boolean;
    readonly readableLength: number;
    readonly readableHighWaterMark: number;
    readonly readableObjectMode: boolean;
    readonly writable: boolean;
    readonly writableEnded: boolean;
    readonly writableFinished: boolean;
    readonly writableLength: number;
    readonly writableHighWaterMark: number;
    readonly writableObjectMode: boolean;
    readonly writableNeedDrain: boolean;
    readonly destroyed: boolean;
    readonly closed: boolean;
    readonly errored: Error | null;
  }
}
export = duplexify;
