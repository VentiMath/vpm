export interface Options {
  transformDirInUrl?: boolean;
  transformEdgeInUrl?: boolean;
}
export declare function transform(css: string, options?: Options): string;
/** Legacy positional URL switches. */
export declare function transform(
  css: string,
  transformDirInUrl: boolean,
  transformEdgeInUrl?: boolean,
): string;
