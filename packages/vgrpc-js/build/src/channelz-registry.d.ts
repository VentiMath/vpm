/** Numeric-ID registry used internally by Channelz; not a general ordered map. */
export declare class ChannelzRegistry<T> implements Iterable<[number, T]> {
  set(id: number, value: T): this;
  get(id: number): T | undefined;
  getElementByKey(id: number): T | undefined;
  delete(id: number): boolean;
  size(): number;
  clear(): void;
  entriesFrom(id?: number): IterableIterator<[number, T]>;
  [Symbol.iterator](): IterableIterator<[number, T]>;
  forEach(callback: (entry: [number, T], index: number, registry: ChannelzRegistry<T>) => void): void;
  page<R>(start: number, limit: number, project: (value: T) => R): {values: R[]; end: boolean};
}
