declare class OrderedMap<T = any> {
  private constructor();
  static from<T = any>(value?: OrderedMap.MapLike<T> | null): OrderedMap<T>;
  readonly size: number;
  get(key: string): T | undefined;
  update(key: string, value: T, newKey?: string): OrderedMap<T>;
  remove(key: string): OrderedMap<T>;
  addToStart(key: string, value: T): OrderedMap<T>;
  addToEnd(key: string, value: T): OrderedMap<T>;
  addBefore(place: string, key: string, value: T): OrderedMap<T>;
  forEach(callback: (key: string, value: T) => void): void;
  prepend(value: OrderedMap.MapLike<T>): OrderedMap<T>;
  append(value: OrderedMap.MapLike<T>): OrderedMap<T>;
  subtract(value: OrderedMap.MapLike<T>): OrderedMap<T>;
  toObject(): Record<string, T>;
}

declare namespace OrderedMap {
  type MapLike<T = any> = Record<string, T> | OrderedMap<T>;
}
export = OrderedMap;
