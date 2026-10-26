import createError = require('vhttp-errors');

/** Send a URL-encoded pathname to an HTTP response. */
declare function send(request: send.Request, path: string, options?: send.SendOptions | null): send.SendStream;
declare namespace send {
  type Header = string | number | readonly string[] | undefined;
  interface Emitter {
    on(event: string | symbol, listener: (...args: any[]) => void): unknown;
    once(event: string | symbol, listener: (...args: any[]) => void): unknown;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): unknown;
    emit(event: string | symbol, ...args: any[]): boolean;
  }
  interface Request {
    headers: { [name: string]: Header };
    method?: string;
    httpVersionMajor?: number;
    aborted?: boolean;
    socket?: { destroyed?: boolean } | null;
  }
  interface Response extends Emitter {
    statusCode: number;
    headersSent: boolean;
    writableEnded?: boolean;
    destroyed?: boolean;
    getHeader(name: string): Header;
    getHeaderNames(): string[];
    setHeader(name: string, value: string | number | readonly string[]): unknown;
    removeHeader(name: string): unknown;
    write(chunk: any, ...args: any[]): boolean;
    end(...args: any[]): unknown;
    destroy(error?: Error): unknown;
  }
  interface Stats {
    size: number;
    mtime: Date;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  interface FileStream extends Emitter {
    readonly bytesRead: number;
    readonly destroyed: boolean;
    destroy(error?: Error): this;
    unpipe(destination?: Response): this;
    pause(): this;
    resume(): this;
    pipe<T extends Response>(destination: T): T;
  }
  interface SendOptions {
    acceptRanges?: boolean;
    cacheControl?: boolean;
    dotfiles?: 'allow' | 'deny' | 'ignore';
    start?: number;
    end?: number;
    etag?: boolean;
    extensions?: string | readonly string[] | false;
    immutable?: boolean;
    index?: string | readonly string[] | false;
    lastModified?: boolean;
    maxAge?: number | string;
    /** Legacy spelling; maxAge takes precedence when present. */
    maxage?: number | string;
    root?: string;
    highWaterMark?: number;
  }
  interface SendStream extends Emitter {
    readonly options: Readonly<SendOptions>;
    req: Request;
    path: string;
    res?: Response;
    on(event: 'error', listener: (this: SendStream, error: createError.HttpError) => void): this;
    on(event: 'directory', listener: (this: SendStream, response: Response, path: string) => void): this;
    on(event: 'file', listener: (this: SendStream, path: string, stat: Stats) => void): this;
    on(event: 'headers', listener: (this: SendStream, response: Response, path: string, stat: Stats) => void): this;
    on(event: 'stream', listener: (this: SendStream, stream: FileStream) => void): this;
    on(event: 'end', listener: (this: SendStream) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once: SendStream['on'];
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    listenerCount(event: string | symbol): number;
    pipe<T extends Response>(response: T): T;
    error(status: number, error?: Error | { headers?: Record<string, string | number | readonly string[]> }): void;
    hasTrailingSlash(): boolean;
    isConditionalGET(): boolean;
    isPreconditionFailure(): boolean;
    removeContentHeaderFields(): void;
    notModified(): void;
    headersAlreadySent(): void;
    isCachable(): boolean;
    onStatError(error: Error & { code?: string }): void;
    isFresh(): boolean;
    isRangeFresh(): boolean;
    redirect(path: string): void;
    send(path: string, stat: Stats): void;
    sendFile(path: string): void;
    sendIndex(path: string): void;
    type(path: string): void;
    setHeader(path: string, stat: Stats): void;
  }
}
export = send;
