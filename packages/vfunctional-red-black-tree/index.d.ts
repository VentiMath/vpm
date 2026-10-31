declare namespace createRBTree {
  /** A persistent red-black tree. Modifications return a new tree. */
  interface Tree<K, V> {
    /** The root node, or null for an empty tree. */
    readonly root: Node<K, V> | null;
    /** All keys in comparator order. */
    readonly keys: K[];
    /** All values, in key order. */
    readonly values: V[];
    /** The number of entries. */
    readonly length: number;
    /** A new tree with the entry added. Equal keys are kept as separate entries. */
    insert(key: K, value: V): Tree<K, V>;
    /** Visits entries in order; a truthy result stops the walk and is returned. */
    forEach<T>(visitor: (key: K, value: V) => T): T | undefined;
    /** Visits entries with keys >= lo, and < hi when given. */
    forEach<T>(visitor: (key: K, value: V) => T, lo: K, hi?: K): T | undefined;
    /** An iterator at the first entry. */
    readonly begin: Iterator<K, V>;
    /** An iterator at the last entry. */
    readonly end: Iterator<K, V>;
    /** An iterator at an integer position; invalid when out of range. */
    at(index: number): Iterator<K, V>;
    /** The first entry with a key >= key. */
    ge(key: K): Iterator<K, V>;
    /** The first entry with a key > key. */
    gt(key: K): Iterator<K, V>;
    /** The last entry with a key < key. */
    lt(key: K): Iterator<K, V>;
    /** The last entry with a key <= key. */
    le(key: K): Iterator<K, V>;
    /** An iterator at an entry with this key; invalid when absent. */
    find(key: K): Iterator<K, V>;
    /** A new tree without one entry for key, or this tree when absent. */
    remove(key: K): Tree<K, V>;
    /** The value of an entry with this key. */
    get(key: K): V | undefined;
  }

  /** A position in a tree. Moving it does not change the tree. */
  interface Iterator<K, V> {
    /** The tree this iterator walks. */
    readonly tree: Tree<K, V>;
    /** Whether the iterator points at an entry. */
    readonly valid: boolean;
    /** The current node, or null when invalid. */
    readonly node: Node<K, V> | null;
    /** The current key, or undefined when invalid. */
    readonly key: K | undefined;
    /** The current value, or undefined when invalid. */
    readonly value: V | undefined;
    /** The current position; the tree length when invalid. */
    readonly index: number;
    /** Whether a later entry exists. */
    readonly hasNext: boolean;
    /** Whether an earlier entry exists. */
    readonly hasPrev: boolean;
    /** An independent copy of this iterator. */
    clone(): Iterator<K, V>;
    /** A new tree without the current entry; the same tree when invalid. */
    remove(): Tree<K, V>;
    /** A new tree with the current entry's value replaced. Throws when invalid. */
    update(value: V): Tree<K, V>;
    /** Moves to the next entry. */
    next(): void;
    /** Moves to the previous entry. */
    prev(): void;
  }

  /** A tree node. Nodes are shared between tree versions; do not modify them. */
  interface Node<K, V> {
    readonly key: K;
    readonly value: V;
    readonly left: Node<K, V> | null;
    readonly right: Node<K, V> | null;
  }
}

/** Creates an empty tree ordered by compare, or by `<` and `>` when omitted. */
declare function createRBTree<K, V>(compare?: ((a: K, b: K) => number) | null): createRBTree.Tree<K, V>;
export = createRBTree;
