/** Create CORS middleware. Static options and arrays are snapshotted at creation. */
declare function cors<R extends cors.Request = cors.Request>(options?: cors.Options | cors.OptionsDelegate<R> | null): cors.Middleware<R>;
declare namespace cors {
  interface Request {
    method?: string;
    headers: Record<string, string | readonly string[] | undefined>;
  }
  interface Response {
    statusCode: number;
    getHeader(name: string): string | number | readonly string[] | undefined;
    setHeader(name: string, value: string): unknown;
    removeHeader(name: string): unknown;
    end(): unknown;
  }
  type NextFunction = (error?: unknown) => void;
  type Middleware<R extends Request = Request> = (request: R, response: Response, next: NextFunction) => void;
  type OriginList = readonly (string | RegExp | OriginList)[];
  type StaticOrigin = boolean | string | RegExp | OriginList | null;
  type OriginCallback = (origin: string | undefined, callback: (error: unknown, origin?: StaticOrigin) => void) => void;
  interface Options {
    /** Default '*'. Explicit false, null, undefined or '' disables CORS. */
    origin?: StaticOrigin | OriginCallback;
    methods?: string | readonly string[];
    /** Omitted: reflect requested headers. Empty string/array: allow no headers. */
    allowedHeaders?: string | readonly string[];
    /** Legacy alias, used when allowedHeaders is null/undefined. */
    headers?: string | readonly string[];
    exposedHeaders?: string | readonly string[];
    credentials?: boolean;
    /** Nonnegative safe integer seconds or a decimal integer string. */
    maxAge?: number | string;
    preflightContinue?: boolean;
    /** Integer 200..299; default 204. */
    optionsSuccessStatus?: number;
  }
  type OptionsDelegate<R extends Request = Request> = (request: R, callback: (error: unknown, options?: Options | null) => void) => void;
}
export = cors;
