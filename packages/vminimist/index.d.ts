/** Parse command-line arguments using minimist-compatible option syntax. */
declare function parse(args: readonly (string | number)[] | '', options?: parse.Options | null): parse.ParsedArgs;
declare namespace parse {
  interface Options {
    string?: string | readonly string[];
    boolean?: boolean | string | readonly string[];
    alias?: Readonly<Record<string, string | readonly string[]>>;
    default?: Readonly<Record<string, unknown>>;
    stopEarly?: boolean;
    '--'?: boolean;
    unknown?: (argument: string | number) => unknown;
  }
  interface ParsedArgs {
    _: (string | number)[];
    '--'?: (string | number)[];
    /** Dynamic values include defaults, repeated options and dotted objects. */
    [name: string]: unknown;
  }
}
export = parse;
