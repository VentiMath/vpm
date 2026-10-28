/** A parsed disposition. Each parameters map has a null prototype. */
export interface ContentDisposition {
  type: string;
  parameters: Record<string, string>;
}
export interface CreateOptions {
  /** Defaults to attachment. Must be a nonempty HTTP token. */
  type?: string;
  /** Printable ASCII fallback, automatic fallback (true), or none (false). */
  fallback?: string | boolean;
}
export interface ParseOptions {
  /** Decode extended values; defaults to true. */
  extended?: boolean;
  /** Browser multipart quoting; defaults to false. */
  multipart?: boolean;
}
export interface FormatOptions extends ParseOptions {}
/** Create a header; path handling belongs to the caller. */
export declare function create(filename?: string, options?: CreateOptions | null): string;
/** Lenient parsing with first-value recovery and extended-value precedence. */
export declare function parse(header: string, options?: ParseOptions | null): ContentDisposition;
export declare function format(disposition: { type: string; parameters?: Readonly<Record<string, string>> | null }, options?: FormatOptions | null): string;
/** Encode UTF-8. Lone UTF-16 surrogates throw URIError. */
export declare function encodeExtended(value: string): string;
/** Decode UTF-8/Latin-1; unsupported encodings or malformed escapes return undefined. */
export declare function decodeExtended(value: string): string | undefined;
