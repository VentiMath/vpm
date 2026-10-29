type Agent = {destroy(): void};
import type {URLLike as URL} from 'vnode-fetch';
import type {StreamLike as Readable} from 'vnode-fetch';
/**
 * Support `instanceof` operator for `GaxiosError`s in different versions of this library.
 *
 * @see {@link GaxiosError[Symbol.hasInstance]}
 */
export declare const GAXIOS_ERROR_SYMBOL: unique symbol;
export declare class GaxiosError<T = any> extends Error {
    config: GaxiosOptions;
    response?: GaxiosResponse<T> | undefined;
    error?: (Error | (Error & {code?: string})) | undefined;
    /**
     * An Error code.
     * See {@link https://nodejs.org/api/errors.html#errorcode error.code}
     *
     * @example
     * 'ECONNRESET'
     */
    code?: string | number;
    /**
     * An HTTP Status code.
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/status Response: status property}
     *
     * @example
     * 500
     */
    status?: number;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[Symbol.hasInstance]}
     * @see {@link https://github.com/microsoft/TypeScript/issues/13965#issuecomment-278570200}
     * @see {@link https://stackoverflow.com/questions/46618852/require-and-instanceof}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/@@hasInstance#reverting_to_default_instanceof_behavior}
     */
    [GAXIOS_ERROR_SYMBOL]: string;
    /**
     * Support `instanceof` operator for `GaxiosError` across builds/duplicated files.
     *
     * @see {@link GAXIOS_ERROR_SYMBOL}
     * @see {@link GaxiosError[GAXIOS_ERROR_SYMBOL]}
     */
    static [Symbol.hasInstance](instance: unknown): boolean;
    constructor(message: string, config: GaxiosOptions, response?: GaxiosResponse<T> | undefined, cause?: unknown);
    static extractAPIErrorFromResponse(response: GaxiosResponse, fallback?: string): AIPErrorInterface;
}
export interface Headers extends Iterable<[string, string]> {
    [Symbol.iterator](): IterableIterator<[string, string]>;
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    getSetCookie(): string[];
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    entries(): IterableIterator<[string, string]>;
    forEach(callback: (value: string, key: string, headers: Headers) => void, thisArg?: any): void;
}
export type HeadersInit = Headers | [string, string][] | Record<string, string>;
export type GaxiosPromise<T = any> = Promise<GaxiosResponse<T>>;
export interface GaxiosResponse<T = any> extends FetchResponse {
    config: GaxiosOptionsPrepared;
    data: T;
    readonly headers: Headers;
    readonly ok: boolean;
    readonly redirected: boolean;
    readonly type: string;
    readonly bodyUsed: boolean;
    bytes(): Promise<Uint8Array>;
    formData(): Promise<any>;
    clone(): FetchResponse;
}
export interface AIPErrorInterface {message: string; code: number; status: string; [key: string]: unknown;}
export interface URLSearchParamsLike extends Iterable<[string, string]> {
    get(name: string): string | null; getAll(name: string): string[]; has(name: string): boolean;
    set(name: string, value: string): void; append(name: string, value: string): void; delete(name: string): void;
    toString(): string;
}
export interface PreparedURL extends URL {
    protocol: string; host: string; hostname: string; port: string; pathname: string; search: string; hash: string;
    username: string; password: string; readonly origin: string; readonly searchParams: URLSearchParamsLike;
}
export interface GaxiosOptionsPrepared extends GaxiosOptions {url: PreparedURL; headers: Headers;}
export interface GaxiosMultipartOptions {
    headers: HeadersInit;
    content: string | Uint8Array | Readable;
}
/**
 * Request options that are used to form the request.
 */
export interface GaxiosOptions {
    /**
     * Optional method to override making the actual HTTP request. Useful
     * for writing tests.
     */
    adapter?: <T = any>(options: GaxiosOptions, defaultAdapter: (options: GaxiosOptions) => GaxiosPromise<T>) => GaxiosPromise<T>;
    url?: string | URL;
    /**
     * @deprecated
     */
    baseUrl?: string;
    baseURL?: string | URL;
    method?: string;
    headers?: HeadersInit;
    data?: any;
    body?: any;
    /**
     * The maximum size of the http response content in bytes allowed.
     */
    maxContentLength?: number;
    /**
     * The maximum number of redirects to follow. Defaults to 20.
     */
    maxRedirects?: number;
    follow?: number;
    /**
     * A collection of parts to send as a `Content-Type: multipart/related` request.
     */
    multipart?: GaxiosMultipartOptions[];
    params?: any;
    paramsSerializer?: (params: {
        [index: string]: string | number;
    }) => string;
    timeout?: number;
    /**
     * @deprecated ignored
     */
    onUploadProgress?: (progressEvent: any) => void;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream' | 'unknown';
    agent?: Agent | false | ((parsedUrl: URL) => Agent | false | undefined);
    validateStatus?: (status: number) => boolean;
    retryConfig?: RetryConfig;
    retry?: boolean;
    signal?: any;
    size?: number;
    compress?: boolean;
    /**
     * Override the transport. Native fetch is the default; Node agents, proxies,
     * client certificates and compress:false use vnode-fetch.
     */
    fetchImplementation?: FetchImplementation;
    redirect?: 'follow' | 'manual' | 'error';
    duplex?: 'half';
    cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
    credentials?: 'omit' | 'include' | 'same-origin';
    integrity?: string;
    keepalive?: boolean;
    mode?: 'cors' | 'navigate' | 'no-cors' | 'same-origin';
    referrer?: string;
    referrerPolicy?: string;
    cert?: string;
    key?: string;
    /**
     * An optional proxy to use for requests.
     * Available via `process.env.HTTP_PROXY` and `process.env.HTTPS_PROXY` as well - with a preference for the this config option when multiple are available.
     * The {@link GaxiosOptions.agent `agent`} option overrides this.
     *
     * @see {@link GaxiosOptions.noProxy}
     * @see {@link GaxiosOptions.agent}
     */
    proxy?: string | URL;
    /**
     * A list for excluding traffic for proxies.
     * Available via `process.env.NO_PROXY` as well as a common-separated list of strings - merged with any local `noProxy` rules.
     *
     * - When provided a string, it is matched by
     *   - Wildcard `*.` and `.` matching are available. (e.g. `.example.com` or `*.example.com`)
     * - When provided a URL, it is matched by the `.origin` property.
     *   - For example, requesting `https://example.com` with the following `noProxy`s would result in a no proxy use:
     *     - new URL('https://example.com')
     *     - new URL('https://example.com:443')
     *   - The following would be used with a proxy:
     *     - new URL('http://example.com:80')
     *     - new URL('https://example.com:8443')
     * - When provided a regular expression it is used to match the stringified URL
     *
     * @see {@link GaxiosOptions.proxy}
     */
    noProxy?: (string | URL | RegExp)[];
    /** Redact the copied error configuration/response; false disables it. */
    errorRedactor?: typeof defaultErrorRedactor | false;
}
/**
 * A partial object of `GaxiosResponse` with only redactable keys
 *
 * @experimental
 */
export type RedactableGaxiosOptions = Pick<GaxiosOptions, 'body' | 'data' | 'headers' | 'url'>;
/**
 * A partial object of `GaxiosResponse` with only redactable keys
 *
 * @experimental
 */
export type RedactableGaxiosResponse<T = any> = Pick<GaxiosResponse<T>, 'config' | 'data' | 'headers'>;
/**
 * Configuration for the Gaxios `request` method.
 */
export interface RetryConfig {
    /**
     * The number of times to retry the request.  Defaults to 3.
     */
    retry?: number;
    /**
     * The number of retries already attempted.
     */
    currentRetryAttempt?: number;
    /**
     * The amount of time to initially delay the retry, in ms.  Defaults to 100ms.
     */
    retryDelay?: number;
    /**
     * The HTTP Methods that will be automatically retried.
     * Defaults to ['GET','PUT','HEAD','OPTIONS','DELETE']
     */
    httpMethodsToRetry?: string[];
    /**
     * The HTTP response status codes that will automatically be retried.
     * Defaults to: [[100, 199], [408, 408], [429, 429], [500, 599]]
     */
    statusCodesToRetry?: number[][];
    /**
     * Function to invoke when a retry attempt is made.
     */
    onRetryAttempt?: (err: GaxiosError) => Promise<void> | void;
    /**
     * Function to invoke which determines if you should retry
     */
    shouldRetry?: (err: GaxiosError) => Promise<boolean> | boolean;
    /**
     * When there is no response, the number of retries to attempt. Defaults to 2.
     */
    noResponseRetries?: number;
    /**
     * Function to invoke which returns a promise. After the promise resolves,
     * the retry will be triggered. If provided, this will be used in-place of
     * the `retryDelay`
     */
    retryBackoff?: (err: GaxiosError, defaultBackoffMs: number) => Promise<void>;
    /**
     * Time that the initial request was made. Users should not set this directly.
     */
    timeOfFirstRequest?: number;
    /** Budget from initial request preparation through default transport attempts and retry waits, in ms. */
    totalTimeout?: number;
    maxRetryDelay?: number;
    retryDelayMultiplier?: number;
}
export type FetchImplementation = (input: FetchRequestInfo, init?: FetchRequestInit) => Promise<FetchResponse>;
export type FetchRequestInfo = any;
export interface FetchResponse {
    readonly status: number;
    readonly statusText: string;
    readonly url: string;
    readonly body: {readonly locked: boolean; getReader(): {read(): Promise<{done: boolean; value?: Uint8Array}>; cancel(reason?: any): Promise<void>; releaseLock(): void}; cancel(reason?: any): Promise<void>} | null;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<{readonly size:number; readonly type:string; text():Promise<string>; arrayBuffer():Promise<ArrayBuffer>}>;
    readonly headers: FetchHeaders;
    json(): Promise<any>;
    text(): Promise<string>;
}
export interface FetchRequestInit {
    method?: string;headers?: HeadersInit;body?: any;signal?: any;agent?: GaxiosOptions['agent'];size?:number;timeout?:number;follow?:number;compress?:boolean;
}
export interface FetchHeaders {
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    forEach(callbackfn: (value: string, key: string) => void, thisArg?: any): void;
}
/**
 * An experimental error redactor.
 *
 * @param config Config to potentially redact properties of
 * @param response Config to potentially redact properties of
 *
 * @experimental
 */
export declare function defaultErrorRedactor<T = any>(data: {
    config?: RedactableGaxiosOptions;
    response?: RedactableGaxiosResponse<T>;
}): {
    config?: RedactableGaxiosOptions;
    response?: RedactableGaxiosResponse<T>;
};
