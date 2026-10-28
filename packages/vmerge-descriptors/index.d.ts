/** Copy own string and symbol property descriptors, without invoking accessors.
 * Returns destination. Native definition errors can leave earlier keys copied.
 */
declare function mergeDescriptors<T extends object, U extends object>(destination: T, source: U, overwrite?: true): mergeDescriptors.Merged<T, U>;
declare function mergeDescriptors<T extends object, U extends object>(destination: T, source: U, overwrite: false): mergeDescriptors.Preserved<T, U>;
declare function mergeDescriptors<T extends object, U extends object>(destination: T, source: U, overwrite: boolean | undefined): mergeDescriptors.Merged<T, U> | mergeDescriptors.Preserved<T, U>;
declare namespace mergeDescriptors {
  /** Ordinary object shape after right-hand properties replace left-hand ones.
   * Call/construct signatures retain their final overload. Types cannot describe
   * own-versus-inherited keys, enumerability, proxies or mutations through aliases.
   */
  type Merged<T, U> = Omit<T, keyof U> & Pick<U, keyof U> & Signatures<T>;
  type Preserved<T, U> = Omit<U, keyof T> & Pick<T, keyof T> & Signatures<T>;
  type Signatures<T> =
    (T extends (this: infer This, ...args: infer A) => infer R ? (this: This, ...args: A) => R : unknown) &
    (T extends new (...args: infer A) => infer R ? new (...args: A) => R : unknown);
}
export = mergeDescriptors;
