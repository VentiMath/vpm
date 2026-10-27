declare namespace qs {
  type Charset = 'utf-8' | 'iso-8859-1';
  type Format = 'RFC1738' | 'RFC3986' | 'WHATWG';
  type Kind = 'key' | 'value';
  type ParsedValue<T = string> = T | null | undefined | ParsedObject<T> | ParsedValue<T>[];
  interface ParsedObject<T = string> { [key: string]: ParsedValue<T> }
  type DefaultDecoder = (value: string, defaultDecoder?: DefaultDecoder, charset?: Charset) => string;
  type Decoder<T = unknown> = (value: string, defaultDecoder: DefaultDecoder, charset: Charset, kind: Kind) => T | null;
  type DefaultEncoder = (value: unknown, defaultEncoder?: DefaultEncoder, charset?: Charset, kind?: Kind, format?: Format) => string;
  type Encoder = (value: unknown, defaultEncoder: DefaultEncoder, charset: Charset, kind: Kind, format: Format) => string;

  interface ParseOptions<T = string> {
    allowDots?: boolean;
    allowEmptyArrays?: boolean;
    allowPrototypes?: boolean;
    allowSparse?: boolean;
    /** Non-negative safe integer or Infinity. Default: 20. */
    arrayLimit?: number;
    charset?: Charset;
    charsetSentinel?: boolean;
    comma?: boolean;
    decodeDotInKeys?: boolean;
    decoder?: Decoder<T> | null;
    delimiter?: string | RegExp;
    /** Non-negative safe integer, Infinity, or false (same as 0). Default: 5. */
    depth?: number | false;
    duplicates?: 'combine' | 'first' | 'last';
    ignoreQueryPrefix?: boolean;
    interpretNumericEntities?: boolean;
    /** Non-negative safe integer or Infinity. Default: 1000. */
    parameterLimit?: number;
    parseArrays?: boolean;
    plainObjects?: boolean;
    strictDepth?: boolean;
    strictMerge?: boolean;
    strictNullHandling?: boolean;
    throwOnLimitExceeded?: boolean;
  }
  interface StringifyOptions<Key extends string | number = string> {
    addQueryPrefix?: boolean;
    allowDots?: boolean;
    allowEmptyArrays?: boolean;
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    charset?: Charset;
    charsetSentinel?: boolean;
    commaRoundTrip?: boolean;
    delimiter?: string;
    /** Non-negative safe integer or Infinity. Default: Infinity. */
    depth?: number;
    encode?: boolean;
    encodeDotInKeys?: boolean;
    encoder?: Encoder | null;
    encodeValuesOnly?: boolean;
    filter?: readonly Key[] | ((prefix: string, value: unknown) => unknown);
    format?: Format;
    /** @deprecated Use arrayFormat. */
    indices?: boolean;
    serializeDate?: (date: Date) => string;
    skipNulls?: boolean;
    sort?: (left: Key, right: Key) => number;
    strictNullHandling?: boolean;
  }
  function parse<T = string>(input: string | null | undefined, options?: ParseOptions<T>): ParsedObject<T>;
  /** Object input is copied; its values may have arbitrary types. */
  function parse(input: object, options?: ParseOptions<unknown>): ParsedObject<unknown>;
  function stringify<Key extends string | number = string>(input: object | null | undefined, options?: StringifyOptions<Key>): string;
  const formats: {
    default: Format;
    RFC1738: 'RFC1738';
    RFC3986: 'RFC3986';
    WHATWG: 'WHATWG';
    formatters: Record<Format, (value: string) => string>;
  };
}
export = qs;
