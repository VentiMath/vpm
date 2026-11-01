/**
 * Caches a function's results by object argument, without keeping the
 * arguments alive.
 * @template {object} Argument
 * @template Result
 * @param {(argument: Argument) => Result} fn
 * @returns {(argument: Argument) => Result}
 */
export default function weakMemoize(fn) {
  const cache = new WeakMap();
  return argument => {
    if (cache.has(argument)) return cache.get(argument);
    const result = fn(argument);
    cache.set(argument, result);
    return result;
  };
}
