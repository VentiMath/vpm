/** Deprecation warnings deduplicated by deprecation and caller location. */
declare function depd(namespace: string): depd.Deprecate;
declare namespace depd {
  interface Deprecate {
    (message?: string): void;
    /** Preserves calls, construction, overloads, metadata and static properties. */
    readonly function: <F extends Function>(fn: F, message?: string) => F;
    /** Installs warning accessors on a configurable own property. */
    readonly property: <T extends object>(object: T, property: keyof T, message?: string) => void;
  }
  interface DeprecationError extends Error { namespace: string; }
}
export = depd;
