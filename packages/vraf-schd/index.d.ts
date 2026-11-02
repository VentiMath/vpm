/** Coalesce calls into one animation frame using the latest arguments. */
declare function rafSchd<Args extends unknown[]>(callback: (...args: Args) => unknown): rafSchd.Scheduled<Args>;
declare namespace rafSchd {
  interface Scheduled<Args extends unknown[]> {
    (...args: Args): void;
    cancel(): void;
  }
}
export = rafSchd;
