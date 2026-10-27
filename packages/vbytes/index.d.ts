declare function bytes(value: string): number;
declare function bytes(value: number, options?: bytes.Options | null): string | null;
declare function bytes(value: string | number, options?: bytes.Options | null): number | string | null;
declare namespace bytes {
  interface Options {
    /** Integer from 0 to 100. Null/undefined use 2. */
    readonly decimalPlaces?: number | null;
    readonly fixedDecimals?: boolean | null;
    /** Literal text, including dollar signs. */
    readonly thousandsSeparator?: string | null;
    readonly unitSeparator?: string | null;
    /** B, KB, MB, GB, TB or PB, case-insensitive. Empty/null/undefined selects automatically. */
    readonly unit?: string | null;
  }
  /** Parse an entire decimal size; malformed or out-of-range supplied values throw. */
  function parse(value: string | number): number;
  /** Only absent values produce null, preserving the caller's explicit default/unlimited behavior. */
  function parse(value: null | undefined): null;
  function parse(value: string | number | null | undefined): number | null;
  /** Format finite numbers. Non-finite values return null. Invalid options throw. */
  function format(value: number, options?: Options | null): string | null;
}
export = bytes;
