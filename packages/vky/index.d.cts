export type Input = string | URL | Request;
export type SearchParamsOption =
  | string
  | URLSearchParams
  | ReadonlyArray<readonly [string, string]>
  | Record<string, string | number | boolean | null | undefined>;
export type KyHeadersInit = HeadersInit | Record<string, string | undefined>;
export type KyRequest = Request;
export type KyResponse<T = unknown> = Omit<Response, "json"> & {
  json(): Promise<T>;
};
export interface RetryOptions {
  limit?: number;
  methods?: string[];
  statusCodes?: number[];
  afterStatusCodes?: number[];
  maxRetryAfter?: number;
  backoffLimit?: number;
  delay?: (retryCount: number) => number;
  jitter?: boolean | ((delay: number) => number);
  retryOnTimeout?: boolean;
  shouldRetry?: (state: {
    error: Error;
    retryCount: number;
  }) => boolean | undefined | Promise<boolean | undefined>;
}
export type ShouldRetryState = { error: Error; retryCount: number };
export interface BeforeRequestState {
  request: Request;
  options: NormalizedOptions;
  retryCount: number;
}
export interface BeforeRetryState extends BeforeRequestState {
  error: Error;
}
export interface BeforeErrorState extends BeforeRetryState {}
export interface AfterResponseState extends BeforeRequestState {
  response: Response;
}
export type InitHook = (options: Options) => void;
export type BeforeRequestHook = (
  state: BeforeRequestState,
) => void | Request | Response | Promise<void | Request | Response>;
export type BeforeRetryHook = (
  state: BeforeRetryState,
) =>
  | void
  | Request
  | Response
  | symbol
  | { options: Pick<Options, "timeout" | "fetch" | "throwHttpErrors"> }
  | Promise<
      | void
      | Request
      | Response
      | symbol
      | { options: Pick<Options, "timeout" | "fetch" | "throwHttpErrors"> }
    >;
export type AfterResponseHook = (
  state: AfterResponseState,
) => void | Response | Promise<void | Response>;
export type BeforeErrorHook = (
  state: BeforeErrorState,
) => void | Error | Promise<void | Error>;
export interface Hooks {
  init?: InitHook[];
  beforeRequest?: BeforeRequestHook[];
  beforeRetry?: BeforeRetryHook[];
  afterResponse?: AfterResponseHook[];
  beforeError?: BeforeErrorHook[];
}
export interface Options extends Omit<RequestInit, "headers"> {
  headers?: KyHeadersInit;
  json?: unknown;
  searchParams?: SearchParamsOption;
  prefix?: string | URL;
  baseUrl?: string | URL;
  timeout?: number | false;
  totalTimeout?: number | false;
  maxResponseSize?: number;
  retry?: number | RetryOptions;
  hooks?: Hooks;
  context?: Record<string, unknown>;
  throwHttpErrors?: boolean | ((status: number) => boolean);
  fetch?: (request: Request, init?: RequestInit) => Promise<Response>;
  parseJson?: (
    text: string,
    context: { request: Request; response: Response },
  ) => unknown | Promise<unknown>;
  stringifyJson?: (value: unknown) => string | undefined;
  dispatcher?: unknown;
  next?: Record<string, unknown>;
  duplex?: "half";
}
export interface NormalizedOptions
  extends Omit<Options, "headers" | "hooks" | "retry" | "context" | "method"> {
  headers: Headers;
  hooks: Required<Hooks>;
  retry: Required<Omit<RetryOptions, "jitter" | "shouldRetry">> &
    Pick<RetryOptions, "jitter" | "shouldRetry">;
  context: Record<string, unknown>;
  method: string;
}
export interface ResponsePromise<T = unknown> extends Promise<KyResponse<T>> {
  json<U = T>(): Promise<U>;
  text(): Promise<string>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  bytes(): Promise<Uint8Array>;
  formData(): Promise<FormData>;
}
export interface KyInstance {
  <T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  get<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  post<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  put<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  patch<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  delete<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  head<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  query<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  create(options?: Options): KyInstance;
  extend(options?: Options | ((defaults: Options) => Options)): KyInstance;
  readonly stop: symbol;
}
export declare class KyError extends Error {
  readonly isKyError: true;
}
export declare class HTTPError<T = unknown> extends KyError {
  constructor(response: Response, request: Request, options: NormalizedOptions);
  response: KyResponse<T>;
  request: Request;
  options: NormalizedOptions;
  data: T | string | undefined;
}
export declare class TimeoutError extends KyError {
  constructor(request: Request);
  request: Request;
}
export declare class NetworkError extends KyError {
  constructor(request: Request, options?: ErrorOptions);
  request: Request;
}
export declare class ResponseSizeError extends KyError {
  constructor(request: Request, maxResponseSize: number);
  request: Request;
  maxResponseSize: number;
}
export declare function isKyError(value: unknown): value is KyError;
export declare function isHTTPError<T = unknown>(
  value: unknown,
): value is HTTPError<T>;
export declare function isTimeoutError(value: unknown): value is TimeoutError;
export declare function isNetworkError(value: unknown): value is NetworkError;
export declare function isResponseSizeError(
  value: unknown,
): value is ResponseSizeError;
export declare function replaceOption<T>(value: T): T;
declare const ky: KyInstance;
export default ky;
