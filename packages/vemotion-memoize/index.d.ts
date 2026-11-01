/** Caches a single-argument function's results by argument (including undefined results). */
export default function memoize<V>(fn: (argument: string) => V): (argument: string) => V;
