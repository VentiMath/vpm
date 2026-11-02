'use strict';
// One completed result, including undefined and promises. No global cache.
function memoizeOne(fn, equal) {
  if (typeof fn !== 'function') throw new TypeError('Expected a function');
  if (equal !== undefined && typeof equal !== 'function') throw new TypeError('Expected an equality function');
  let args, receiver, value, epoch = 0;
  function memoized(...input) {
    const previous = args, generation = epoch;
    if (previous && receiver === this) {
      // User comparators can reenter this wrapper or clear its cache. Keep the
      // result paired with the arguments actually supplied to the comparator.
      const previousValue = value;
      let matches;
      if (equal) matches = equal(input, previous);
      else {
        matches = input.length === previous.length;
        for (let i = 0; matches && i < input.length; i++) {
          const a = input[i], b = previous[i];
          if (a !== b && !(a !== a && b !== b)) matches = false;
        }
      }
      if (matches && generation === epoch) return previousValue;
    }
    const result = Reflect.apply(fn, this, input);
    // A clear during evaluation invalidates that evaluation's future cache entry.
    // A throw never overwrites the previous completed result.
    if (generation === epoch) { args = input; receiver = this; value = result; }
    return result;
  }
  memoized.clear = () => { epoch++; args = receiver = value = undefined; };
  return memoized;
}

module.exports = memoizeOne;
