import type {
  Input,
  Options as CurrentOptions,
  ResponsePromise,
  BeforeRetryHook,
} from "./index.mjs";
export {
  KyError,
  HTTPError,
  TimeoutError,
  NetworkError,
  ResponseSizeError,
  isKyError,
  isHTTPError,
  isTimeoutError,
  isNetworkError,
  isResponseSizeError,
  replaceOption,
} from "./index.mjs";
export type {
  Input,
  ResponsePromise,
  SearchParamsOption,
  RetryOptions,
} from "./index.mjs";
export interface Options extends Omit<CurrentOptions, "hooks" | "prefix"> {
  prefixUrl?: string | URL;
  hooks?: {
    beforeRequest?: ((
      request: Request,
      options: Options,
      state: { retryCount: number },
    ) => void | Request | Response | Promise<void | Request | Response>)[];
    beforeRetry?: BeforeRetryHook[];
    afterResponse?: ((
      request: Request,
      options: Options,
      response: Response,
      state: { retryCount: number },
    ) => void | Response | Promise<void | Response>)[];
    beforeError?: ((
      error: import("./index.mjs").HTTPError,
    ) => Error | Promise<Error>)[];
  };
}
export interface KyInstance {
  <T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  get<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  post<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  put<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  patch<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  delete<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  head<T = unknown>(input: Input, options?: Options): ResponsePromise<T>;
  create(options?: Options): KyInstance;
  extend(options?: Options | ((defaults: Options) => Options)): KyInstance;
  readonly stop: symbol;
}
declare const ky: KyInstance;
export default ky;
