const own = Object.prototype.hasOwnProperty;
const objectValue = Object.prototype.valueOf;
const objectString = Object.prototype.toString;

// Ordinary props take the recursive path without allocating traversal state.
// Deep graphs switch to an explicit work list and memoized pairs. Shared object
// identity is immaterial, as for ordinary deep equality; Map/Set keys stay identities.
function graph(left, right) {
  const pending = [[left, right]], seen = new WeakMap();
  while (pending.length) {
    const [a, b] = pending.pop();
    if (a === b) continue;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      let partners = seen.get(a);
      if (partners?.has(b)) continue;
      if (!partners) seen.set(a, partners = new WeakSet());
      partners.add(b);
    }
    if (!compare(a, b, 0, pending)) return false;
  }
  return true;
}

function compare(a, b, depth, pending) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a !== a && b !== b;
  if (!pending && depth === 64) return graph(a, b);
  if (a.constructor !== b.constructor) return false;
  if (Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype &&
      a.valueOf === objectValue && a.toString === objectString) return properties(a, b, depth, pending);
  const array = Array.isArray(a);
  if (array !== Array.isArray(b)) return false;
  if (array) {
    if (a.length !== b.length) return false;
    for (let i = a.length - 1; i >= 0; i--) {
      const left = a[i], right = b[i];
      if (left === right) continue;
      if (pending) pending.push([left, right]);
      else if (!compare(left, right, depth + 1)) return false;
    }
    return true;
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key)) return false;
      const other = b.get(key);
      if (value === other) continue;
      if (pending) pending.push([value, other]);
      else if (!compare(value, other, depth + 1)) return false;
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    if (!(ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) || a.byteLength !== b.byteLength) return false;
    if (typeof a.length === 'number' && typeof b.length === 'number') {
      if (a.length !== b.length) return false;
      for (let i = a.length - 1; i >= 0; i--) if (a[i] !== b[i]) return false;
      return true;
    }
    return bytes(a.buffer, a.byteOffset, b.buffer, b.byteOffset, a.byteLength);
  }
  if (a instanceof ArrayBuffer || b instanceof ArrayBuffer) {
    return a instanceof ArrayBuffer && b instanceof ArrayBuffer && a.byteLength === b.byteLength && bytes(a, 0, b, 0, a.byteLength);
  }
  if (a instanceof RegExp || b instanceof RegExp) return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  if (typeof Element !== 'undefined' && (a instanceof Element || b instanceof Element)) return false;
  if (a.valueOf !== objectValue && typeof a.valueOf === 'function' && typeof b.valueOf === 'function') return a.valueOf() === b.valueOf();
  if (a.toString !== objectString && typeof a.toString === 'function' && typeof b.toString === 'function') return a.toString() === b.toString();
  return properties(a, b, depth, pending);
}

function properties(a, b, depth, pending) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    if (!own.call(b, key)) return false;
    if ((key === '_owner' || key === '__v' || key === '__o') && a.$$typeof) continue;
    const left = a[key], right = b[key];
    if (left === right) continue;
    if (pending) pending.push([left, right]);
    else if (!compare(left, right, depth + 1)) return false;
  }
  return true;
}

function bytes(a, aOffset, b, bOffset, length) {
  const left = new Uint8Array(a, aOffset, length), right = new Uint8Array(b, bOffset, length);
  for (let i = length - 1; i >= 0; i--) if (left[i] !== right[i]) return false;
  return true;
}

export default function equal(left, right) { return compare(left, right, 0); }
