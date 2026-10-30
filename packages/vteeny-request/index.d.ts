import type fetch = require('vnode-fetch');
export interface Headers { [name: string]: string | number | readonly string[] | undefined; }
export type HeadersInput = Headers | Iterable<readonly [string, string]> | {entries(): IterableIterator<[string, string]>};
export interface PoolOptions {keepAlive?: boolean; maxSockets?: number; maxTotalSockets?: number; maxFreeSockets?: number; keepAliveMsecs?: number; timeout?: number; scheduling?: 'fifo' | 'lifo'; rejectUnauthorized?: boolean; servername?: string; ca?: string | Uint8Array | readonly (string | Uint8Array)[]; cert?: string | Uint8Array; key?: string | Uint8Array; [name: string]: unknown;}
export interface InputStream extends AsyncIterable<any> {pipe(destination: any, ...args: any[]): any; destroy(error?: Error): this; on(event: string | symbol, listener: (...args: any[]) => void): this; readonly destroyed: boolean;}
export interface RequestPart {body: string | ArrayBufferView | InputStream; 'Content-Type'?: string;}
export interface CoreOptions {
  method?: string; timeout?: number; gzip?: boolean; json?: unknown; headers?: HeadersInput;
  body?: unknown; useQuerystring?: boolean; qs?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  proxy?: string | false; multipart?: readonly RequestPart[]; forever?: boolean; pool?: PoolOptions;
  signal?: fetch.Signal; maxResponseSize?: number;
}
export interface OptionsWithUri extends CoreOptions {uri: string; url?: string;}
export interface OptionsWithUrl extends CoreOptions {url: string; uri?: string;}
export type Options = OptionsWithUri | OptionsWithUrl;
export interface Request extends fetch.StreamLike {
  readonly readable: boolean; readonly readableEnded: boolean; readonly readableLength: number;
  abort(): this; resume(): this; pause(): this; setEncoding(encoding: string): this;
  write(chunk: unknown, ...args: any[]): boolean; end(...args: any[]): this;
  emit(event: string | symbol, ...args: any[]): boolean;
}
export interface Response<T = any> extends fetch.StreamLike {
  statusCode: number; statusMessage?: string; headers: Record<string, string>; body: T;
  request: {agent: object | false; headers: Headers; href: string};
  toJSON(): {headers: Record<string, string>};
}
export interface RequestCallback<T = any> {(error: RequestError | null, response: Response<T> | null, body?: T): void;}
export class RequestError extends Error {code?: string | number; type?: string;}
export interface StatisticsOptions {concurrentRequests?: number;}
export interface Statistics {
  getOptions(): Required<StatisticsOptions>; setOptions(options?: StatisticsOptions): Required<StatisticsOptions>;
  readonly counters: {concurrentRequests: number}; requestStarting(): void; requestFinished(): void;
}
export interface DefaultRequest {
  (options: CoreOptions & {uri?: string; url?: string}): Request;
  <T = any>(options: CoreOptions & {uri?: string; url?: string}, callback: RequestCallback<T>): void;
}
export function teenyRequest(options: Options): Request;
export function teenyRequest<T = any>(options: Options, callback: RequestCallback<T>): void;
export namespace teenyRequest {
  function defaults(options: CoreOptions & {uri?: string; url?: string}): DefaultRequest;
  let stats: Statistics;
  function resetStats(): void;
  /** Retire pooled agents; active requests keep their connections until completion. */
  function close(): void;
}
