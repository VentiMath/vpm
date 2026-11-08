declare namespace createSectionIterator {
  type Position = [number | null, number | null];
  type Options =
    | { data: number; multiSection?: false }
    | { data: readonly number[]; multiSection: true };
  interface Iterator {
    next(position: readonly [number | null, number | null]): Position;
    prev(position: readonly [number | null, number | null]): Position;
    isLast(position: readonly [number | null, number | null]): boolean;
  }
}
declare function createSectionIterator(
  options: createSectionIterator.Options,
): createSectionIterator.Iterator;
export = createSectionIterator;
