/** Create an HTTP error or annotate an existing Error. */
declare const createError: createError.Factory;
declare namespace createError {
  interface HttpError extends Error {
    status: number;
    statusCode: number;
    expose: boolean;
    headers?: Record<string, string | readonly string[] | number>;
    [key: string]: unknown;
  }
  interface Properties { [key: string]: unknown; }
  type Detail = string | Error | Properties | null;
  interface ErrorConstructor {
    (message?: string | null): HttpError;
    new (message?: string | null): HttpError;
    readonly prototype: HttpError;
  }
  type Name =
    | "BadRequest" | "Unauthorized" | "PaymentRequired"
    | "Forbidden" | "NotFound" | "MethodNotAllowed"
    | "NotAcceptable" | "ProxyAuthenticationRequired" | "RequestTimeout"
    | "Conflict" | "Gone" | "LengthRequired"
    | "PreconditionFailed" | "PayloadTooLarge" | "URITooLong"
    | "UnsupportedMediaType" | "RangeNotSatisfiable" | "ExpectationFailed"
    | "ImATeapot" | "MisdirectedRequest" | "UnprocessableEntity"
    | "Locked" | "FailedDependency" | "TooEarly"
    | "UpgradeRequired" | "PreconditionRequired" | "TooManyRequests"
    | "RequestHeaderFieldsTooLarge" | "UnavailableForLegalReasons" | "InternalServerError"
    | "NotImplemented" | "BadGateway" | "ServiceUnavailable"
    | "GatewayTimeout" | "HTTPVersionNotSupported" | "VariantAlsoNegotiates"
    | "InsufficientStorage" | "LoopDetected" | "BandwidthLimitExceeded"
    | "NotExtended" | "NetworkAuthenticationRequired";
  type Code =
    | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409
    | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421
    | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451 | 500
    | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510
    | 511;
  type Factory = {
    (...args: Detail[] | [number, ...Detail[]]): HttpError;
    readonly HttpError: (abstract new () => HttpError) & { readonly prototype: HttpError };
    isHttpError(value: unknown): value is HttpError;
  } & Record<Name | Code, ErrorConstructor>;
}
export = createError;
