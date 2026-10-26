/** Parse a request URL, reusing the result while the input string stays the same. */
declare function parseurl(request: parseurl.Request & { url: string }): parseurl.ParsedUrl;
declare function parseurl(request: parseurl.Request): parseurl.ParsedUrl | undefined;

declare namespace parseurl {
  interface Request {
    readonly url?: string;
    /** Non-string values fall back to url, as in parseurl. */
    readonly originalUrl?: unknown;
  }

  /** Mutable legacy URL fields, structurally compatible with node:url. */
  interface ParsedUrl {
    auth: string | null;
    hash: string | null;
    host: string | null;
    hostname: string | null;
    href: string;
    path: string | null;
    pathname: string | null;
    protocol: string | null;
    search: string | null;
    slashes: boolean | null;
    port: string | null;
    query: string | null;
    /** Original input; changing this field does not change cache validity. */
    _raw: string;
  }

  /** Parse originalUrl when it is a string, otherwise use the current URL. */
  function original(request: Request & { originalUrl: string }): ParsedUrl;
  function original(request: Request & { url: string }): ParsedUrl;
  function original(request: Request): ParsedUrl | undefined;

  /** Discard both cached results for this request. */
  function clear(request: Request): void;
}

export = parseurl;
