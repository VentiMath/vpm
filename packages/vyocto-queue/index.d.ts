declare class Queue<ValueType = unknown> implements Iterable<ValueType> {
  readonly size: number;
  enqueue(value: ValueType): void;
  dequeue(): ValueType | undefined;
  peek(): ValueType | undefined;
  clear(): void;
  [Symbol.iterator](): IterableIterator<ValueType>;
  drain(): IterableIterator<ValueType>;
}
export = Queue;
