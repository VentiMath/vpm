/** Append selecting request fields to a response's Vary header. */
declare function vary(response: vary.Response, field: string | readonly string[]): void;
declare namespace vary {
  interface Response {
    getHeader(name: string): string | number | readonly string[] | undefined;
    setHeader(name: string, value: string): unknown;
  }
  /** Preserves existing casing and formatting; new fields use comma-space.
   * Header names are case-insensitive. Wildcards collapse the result to '*'.
   */
  function append(header: string, field: string | readonly string[]): string;
}
export = vary;
