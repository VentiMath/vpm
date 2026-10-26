/** Parse ms 2.x duration syntax, returning undefined for unrecognized strings. */
declare function ms(value: string, options?: ms.Options): number | undefined;
/** Format finite milliseconds; rounded half units are symmetric about zero. */
declare function ms(value: number, options?: ms.Options): string;
declare function ms(value: string | number, options?: ms.Options): number | string | undefined;
declare namespace ms {
  interface Options { long?: boolean; }
}
export = ms;
