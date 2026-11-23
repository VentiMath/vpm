/** Cached Docker filesystem evidence; not a general container detector. */
declare const isDocker: {
  (): boolean;
  readonly default: typeof isDocker;
};
export = isDocker;
