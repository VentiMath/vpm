export interface Options {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly platform?: string;
}
export default function pathKey(options?: Options): string;
