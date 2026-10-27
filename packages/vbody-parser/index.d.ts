import type getRawBody = require('vraw-body');
import type typeis = require('vtype-is');

/** Use json(), raw(), text(), or urlencoded(); the old generic factory throws. */
declare function bodyParser(): never;
declare namespace bodyParser {
  type ByteBuffer = getRawBody.ByteBuffer;
  interface Request extends getRawBody.ReadableStream, typeis.Request {
    body?: unknown;
    method?: string;
    url?: string;
    readonly aborted?: boolean;
    readonly complete?: boolean;
    pipe(...args: any[]): unknown;
    resume(): unknown;
  }
  type NextFunction = (error?: unknown) => void;
  type Middleware<R extends Request = Request, S = unknown> = (request: R, response: S, next: NextFunction) => void;
  interface Options<R extends Request = Request, S = unknown> {
    inflate?: boolean;
    /** Nonnegative safe integer bytes or a vbytes size string. Null/omission: 100 KiB. */
    limit?: number | string | null;
    type?: string | readonly string[] | ((request: R) => unknown);
    /** Synchronous callback; buffer is the inflated body before charset decoding. */
    verify?: false | ((request: R, response: S, buffer: ByteBuffer, encoding: string | null) => void);
    defaultCharset?: string;
  }
  interface JsonOptions<R extends Request = Request, S = unknown> extends Options<R, S> {
    /** Default true: require an object or array. */
    strict?: boolean;
    /** Native JSON.parse hook; returning undefined removes a field. */
    reviver?: (this: unknown, key: string, value: any, context?: { source?: string }) => any;
  }
  interface UrlencodedOptions<R extends Request = Request, S = unknown> extends Options<R, S> {
    extended?: boolean;
    /** Positive safe integer or Infinity. Default 1000. */
    parameterLimit?: number;
    /** Nonnegative safe integer or Infinity. Default 32 with extended parsing. */
    depth?: number;
    charsetSentinel?: boolean;
    interpretNumericEntities?: boolean;
  }
  interface BodyParserError extends Error {
    status: number;
    statusCode: number;
    expose: boolean;
    type?: string;
    body?: string | ByteBuffer;
    code?: string;
    charset?: string;
    encoding?: string;
    limit?: number;
    received?: number;
    expected?: number | null;
    cause?: unknown;
  }
  function json<R extends Request = Request, S = unknown>(options?: JsonOptions<R, S> | null): Middleware<R, S>;
  function raw<R extends Request = Request, S = unknown>(options?: Options<R, S> | null): Middleware<R, S>;
  function text<R extends Request = Request, S = unknown>(options?: Options<R, S> | null): Middleware<R, S>;
  function urlencoded<R extends Request = Request, S = unknown>(options?: UrlencodedOptions<R, S> | null): Middleware<R, S>;
}
export = bodyParser;
