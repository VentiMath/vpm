/** Conditional GET/HEAD freshness; callers must check request method and response status. */
declare function fresh(request: fresh.Headers, response: fresh.Headers): boolean;
declare namespace fresh {
  /** Lowercase field names, as provided by Node.js HTTP APIs. */
  interface Headers { [name: string]: string | readonly string[] | number | undefined; }
}
export = fresh;
