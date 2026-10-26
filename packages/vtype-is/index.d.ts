declare function typeis(request: typeis.Request, types?: readonly string[]): string | false | null;
declare function typeis(request: typeis.Request, ...types: string[]): string | false | null;

declare namespace typeis {
  interface Request {
    /** Node-style lowercase, own header fields. */
    readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  }
  /** Match a header string, or a request-like object for compatibility. Invalid values return false. */
  function is(value: unknown, types?: readonly string[]): string | false;
  function is(value: unknown, ...types: string[]): string | false;
  /** Decimal Content-Length (including zero), or a defined own Transfer-Encoding header. */
  function hasBody(request: Request): boolean;
  function normalize(value: unknown): string | false;
  /** Case-insensitive bare media-type matching; wildcards are allowed only in expected. */
  function match(expected: unknown, actual: unknown): boolean;
}

export = typeis;
