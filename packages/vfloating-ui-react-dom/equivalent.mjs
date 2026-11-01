// Fresh middleware factories are normal during React render. Functions retain
// Floating UI's source-comparison convention; captured values need explicit deps.
// Only plain records and arrays are structural. DOM objects and other instances
// carry identity, and paired ancestor tracking makes cyclic options safe.
export function equivalent(a, b, ancestors = []) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'function') return String(a) === String(b);
  if (!a || !b || typeof a !== 'object') return false;
  const array = Array.isArray(a);
  if (array !== Array.isArray(b)) return false;
  if (!array && (Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null ||
      Object.getPrototypeOf(b) !== Object.prototype && Object.getPrototypeOf(b) !== null)) return false;
  for (const [left, right] of ancestors) {
    if (left === a || right === b) return left === a && right === b;
  }
  const keys = Object.keys(a), otherKeys = Object.keys(b);
  if (keys.length !== otherKeys.length || array && a.length !== b.length) return false;
  ancestors.push([a, b]);
  for (const key of keys) {
    if (key === '_owner' && a.$$typeof) continue;
    if (!Object.prototype.hasOwnProperty.call(b, key) || !equivalent(a[key], b[key], ancestors)) {
      ancestors.pop();
      return false;
    }
  }
  ancestors.pop();
  return true;
}
