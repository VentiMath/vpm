declare function defineLazyProperty<T extends object, K extends PropertyKey, V>(target: T, key: K, initialize: () => V): T & Record<K, V>;
export default defineLazyProperty;
