declare class RopeSequence<T> {
  private constructor();
  readonly length: number;
  append(other: readonly T[] | RopeSequence<T>): RopeSequence<T>;
  prepend(other: readonly T[] | RopeSequence<T>): RopeSequence<T>;
  slice(from?: number, to?: number): RopeSequence<T>;
  get(index: number): T | undefined;
  forEach(
    fn: (value: T, index: number) => boolean | void,
    from?: number,
    to?: number,
  ): void;
  map<U>(fn: (value: T, index: number) => U, from?: number, to?: number): U[];
  flatten(): T[];
  static from<T = never>(
    values?: readonly T[] | RopeSequence<T> | null,
  ): RopeSequence<T>;
  static readonly empty: RopeSequence<any>;
}
export = RopeSequence;
