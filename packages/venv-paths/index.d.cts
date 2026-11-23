declare namespace envPaths {
  interface Options {
    /** Appended with a hyphen; defaults to nodejs. Empty string disables it. */
    readonly suffix?: string;
  }
  interface Paths {
    readonly data: string;
    readonly config: string;
    readonly cache: string;
    readonly log: string;
    readonly temp: string;
  }
}
/** Generates directory names only; does not create or write files. */
declare const envPaths: {
  (name: string, options?: envPaths.Options): envPaths.Paths;
  readonly default: typeof envPaths;
};
export = envPaths;
