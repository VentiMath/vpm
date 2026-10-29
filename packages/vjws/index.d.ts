import type jwa = require('vjwa');

declare namespace jws {
  type Algorithm = jwa.Algorithm;
  type SignedAlgorithm = Exclude<Algorithm, 'none'>;
  type Key = jwa.Key;
  type Bytes = jwa.Bytes;
  type Token = string | Bytes;
  interface Header {
    alg: string;
    typ?: string;
    kid?: string;
    b64?: true;
    crit?: readonly ['b64'];
    [name: string]: unknown;
  }
  interface SignBase {
    header: Header & { alg: Algorithm };
    payload: unknown;
    /** String payload encoding; byte payloads are never transcoded. */
    encoding?: string;
  }
  type SignOptions = SignBase & ({ secret: Key; privateKey?: Key; key?: Key } |
    { privateKey: Key; secret?: Key; key?: Key } | { key: Key; secret?: Key; privateKey?: Key } |
    { header: Header & { alg: 'none' }; secret?: Key; privateKey?: Key; key?: Key });
  interface DecodeOptions {
    /** Parse payload JSON; typ:JWT also enables this. JSON always uses UTF-8. */
    json?: boolean;
    /** Encoding for non-JSON payload text. Defaults to UTF-8. */
    encoding?: string;
  }
  interface Decoded {
    /** Untrusted data. Decoding does not verify a signature or JWT claims. */
    header: Header;
    payload: unknown;
    signature: string;
  }
  const ALGORITHMS: readonly SignedAlgorithm[];
  function sign(options: SignOptions): string;
  function verify(token: unknown, algorithm: 'none', key?: unknown): boolean;
  function verify(token: unknown, algorithm: Algorithm, key: Key): boolean;
  function decode(token: unknown, options?: DecodeOptions): Decoded | null;
  /** Structural parsing only; does not authenticate the token. */
  function isValid(token: unknown): boolean;

  type Listener = (...args: any[]) => void;
  /** Structural event/stream types require no ambient Node or DOM declarations. */
  interface Emitter {
    addListener(event: string | symbol, listener: Listener): this;
    on(event: string | symbol, listener: Listener): this;
    once(event: string | symbol, listener: Listener): this;
    off(event: string | symbol, listener: Listener): this;
    removeListener(event: string | symbol, listener: Listener): this;
    removeAllListeners(event?: string | symbol): this;
    prependListener(event: string | symbol, listener: Listener): this;
    prependOnceListener(event: string | symbol, listener: Listener): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    eventNames(): Array<string | symbol>;
    listenerCount(event: string | symbol, listener?: Listener): number;
    listeners(event: string | symbol): Listener[];
    rawListeners(event: string | symbol): Listener[];
    setMaxListeners(count: number): this;
    getMaxListeners(): number;
  }
  interface ReadableInput {
    pipe(destination: any, options?: { end?: boolean }): unknown;
    unpipe?(destination?: any): unknown;
    on(event: string, listener: Listener): unknown;
    removeListener(event: string, listener: Listener): unknown;
  }
  interface WritableInput extends Emitter {
    readonly writable: boolean;
    readonly destroyed: boolean;
    readonly buffer: unknown;
    write(chunk: string | Bytes, callback?: (error?: Error | null) => void): boolean;
    write(chunk: string | Bytes, encoding?: string, callback?: (error?: Error | null) => void): boolean;
    end(callback?: () => void): this;
    end(chunk: string | Bytes, callback?: () => void): this;
    end(chunk: string | Bytes, encoding?: string, callback?: () => void): this;
    destroy(error?: Error): this;
  }
  interface Output<T> extends Emitter, AsyncIterable<T> {
    readonly readable: boolean;
    readonly readableEnded: boolean;
    readonly destroyed: boolean;
    readonly finished: boolean;
    read(size?: number): T | null;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    pipe<W>(destination: W, options?: { end?: boolean }): W;
    unpipe(destination?: unknown): this;
    destroy(error?: Error): this;
  }
  interface StreamOptions {
    secret?: Key | ReadableInput;
    key?: Key | ReadableInput;
    encoding?: string;
    /** Byte limit per collected stream. Direct values are not collected. */
    maxBuffer?: number;
  }
  interface CreateSignOptions extends StreamOptions {
    header: Header & { alg: Algorithm };
    payload?: unknown;
    privateKey?: Key | ReadableInput;
  }
  interface CreateVerifyOptions extends StreamOptions {
    algorithm?: Algorithm;
    signature?: Token | ReadableInput;
    publicKey?: Key | ReadableInput;
  }
  interface SignStream extends Output<string> {
    readonly payload: WritableInput;
    readonly key: WritableInput;
    readonly secret: WritableInput;
    readonly privateKey: WritableInput;
    on(event: 'done', listener: (token: string) => void): this;
    on(event: string | symbol, listener: Listener): this;
    /** Returns undefined until both inputs finish; never signs partial data. */
    sign(): string | undefined;
  }
  interface VerifyStream extends Output<boolean> {
    readonly signature: WritableInput;
    readonly key: WritableInput;
    readonly secret: WritableInput;
    readonly publicKey: WritableInput;
    on(event: 'done', listener: (valid: boolean, decoded: Decoded | null) => void): this;
    on(event: string | symbol, listener: Listener): this;
    verify(): boolean | undefined;
  }
  function createSign(options: CreateSignOptions): SignStream;
  function createVerify(options?: CreateVerifyOptions): VerifyStream;
}
export = jws;
