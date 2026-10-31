declare function retryRequest(requestOpts: string | object | null, opts?: retryRequest.Options): retryRequest.RetryStream;
declare function retryRequest(requestOpts: string | object | null, callback: retryRequest.Callback): retryRequest.Abortable;
declare function retryRequest(requestOpts: string | object | null, opts: retryRequest.Options | undefined, callback: retryRequest.Callback): retryRequest.Abortable;

declare namespace retryRequest {
  interface Abortable { abort(): void; }
  interface Response { statusCode?: number; }
  type Callback = (error: Error | null | undefined, response?: Response, body?: any) => void;
  interface RequestHandle { abort?(): void; cancel?(): void; destroy?(): unknown; readonly destroyed?: boolean; }
  interface RequestStream extends RequestHandle {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    pipe<T>(destination: T, options?: {end?: boolean}): T;
    unpipe(destination?: any): this;
    readonly readableEnded?: boolean;
  }
  interface RetryStream extends RequestStream, AsyncIterable<any> {
    abort(): void;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    destroy(error?: Error): this;
    pause(): this;
    resume(): this;
    read(size?: number): any;
    readonly destroyed: boolean;
    readonly readableEnded: boolean;
  }
  interface Options {
    request?: (requestOpts: any, callback?: any) => RequestHandle | RequestStream | void;
    objectMode?: boolean;
    /** Wait for a transport's response/status after readable end (e.g. gRPC). The transport must enforce its deadline. */
    responseAfterEnd?: boolean;
    retries?: number;
    noResponseRetries?: number;
    currentRetryAttempt?: number;
    maxRetryDelay?: number;
    retryDelayMultiplier?: number;
    /** Retry scheduling budget in seconds; the transport controls active request timeouts. */
    totalTimeout?: number;
    shouldRetryFn?: (response: any) => boolean | undefined;
  }
  const defaults: Options;
  interface DelayConfig {
    maxRetryDelay: number;
    retryDelayMultiplier: number;
    retryNumber: number;
    timeOfFirstRequest: number;
    totalTimeout: number;
  }
  /** Milliseconds; zero when the retry budget has expired. */
  function getNextRetryDelay(config: DelayConfig): number;
}
export = retryRequest;
