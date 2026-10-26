export interface MediaType {
  type: string;
  /** Subtype portion before the final +, if present. */
  subtype: string;
  /** Undefined when absent, empty string for a trailing +. */
  suffix: string | undefined;
}
export interface FormatInput {
  readonly type: string;
  readonly subtype: string;
  /** Null/undefined omit the suffix; an empty string appends +. */
  readonly suffix?: string | null;
}
/** Validate a bare media type, allowing outer ASCII spaces. Throws for non-strings. */
export declare function test(value: string): boolean;
/** Parse a bare media type into a mutable object with lowercase components. */
export declare function parse(value: string): MediaType;
/** Preserve component casing and validate the complete subtype's 127-character limit. */
export declare function format(value: FormatInput): string;
