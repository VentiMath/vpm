declare function pathKey(options?: pathKey.Options): string;
declare namespace pathKey {
interface Options {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly platform?: string;
}
}
export = pathKey;
