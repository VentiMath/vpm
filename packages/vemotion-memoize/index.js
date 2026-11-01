/**
 * Caches a single-argument function's results by argument.
 * @template V
 * @param {(argument: string) => V} fn
 * @returns {(argument: string) => V}
 */
export default function memoize(fn) {
  const cache = new Map();
  return argument => {
    if (cache.has(argument)) return cache.get(argument);
    const result = fn(argument);
    cache.set(argument, result);
    return result;
  };
}
