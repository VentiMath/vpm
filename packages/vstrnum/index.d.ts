declare function toNumber(value: string, options?: toNumber.Options | null): string | number | null;
declare function toNumber<T>(value: T, options?: toNumber.Options | null): T extends string ? string | number | null : T;
declare namespace toNumber {
  interface Options {
    hex?: boolean;
    binary?: boolean;
    octal?: boolean;
    leadingZeros?: boolean;
    eNotation?: boolean;
    unicode?: boolean;
    infinity?: 'original' | 'null' | 'infinity' | 'string' | (string & {});
    skipLike?: {test(value: string): boolean};
    /** Reserved upstream option; decimal syntax uses a period. */
    decimalPoint?: string;
  }
}
export = toNumber;
