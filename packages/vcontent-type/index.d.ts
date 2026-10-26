export interface ContentType {
  type: string;
  /** Absolute offset of the stopping delimiter, or header.length. */
  index: number;
  /** Mutable, independent dictionary with a null prototype. */
  parameters: Record<string, string>;
}

export interface ParseOptions {
  /** Parse parameters by default; false stops at the first semicolon. */
  parameters?: boolean;
  /** Stop at a comma outside a quoted parameter value. Default: false. */
  comma?: boolean;
  /** Integer offset from 0 through header.length. Default: 0. */
  start?: number;
}

/** Lenient extraction; does not validate incoming media-type syntax. */
export declare function parse(header: string, options?: ParseOptions | null): ContentType;
/** Validate and serialize a media type and its own enumerable parameters. */
export declare function format(object: {
  readonly type: string;
  readonly parameters?: Readonly<Record<string, string>> | null;
}): string;
