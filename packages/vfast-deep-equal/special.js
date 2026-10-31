'use strict';
const valueOf = Object.prototype.valueOf;
const toString = Object.prototype.toString;
const bufferEquals = typeof Buffer === 'function' ? Buffer.prototype.equals : undefined;
function bytesEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const x = a instanceof DataView ? new Uint8Array(a.buffer, a.byteOffset, a.byteLength) : new Uint8Array(a);
  const y = b instanceof DataView ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength) : new Uint8Array(b);
  for (let i = x.length; i-- > 0;) if (x[i] !== y[i]) return false;
  return true;
}

function specialEqual(a, b, equal) {
  if (Array.isArray(b)) return false;
  // Buffer's UTF-8 toString() loses information for invalid byte sequences.
  // Compare typed elements directly, and DataView's selected bytes explicitly.
  if (ArrayBuffer.isView(a)) {
    if (!ArrayBuffer.isView(b)) return false;
    if (bufferEquals && Buffer.isBuffer(a)) return bufferEquals.call(a, b);
    if (a instanceof DataView) {
      return b instanceof DataView && bytesEqual(a, b);
    }
    if (a.length !== b.length) return false;
    for (let i = a.length; i-- > 0;) if (a[i] !== b[i]) return false;
    return true;
  }
  if (a instanceof ArrayBuffer) {
    return b instanceof ArrayBuffer && bytesEqual(a, b);
  }
  if (typeof SharedArrayBuffer === 'function' && a instanceof SharedArrayBuffer) {
    return b instanceof SharedArrayBuffer && bytesEqual(a, b);
  }
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const key of a.keys()) {
      if (!b.has(key) || !equal(a.get(key), b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }
  if (a instanceof RegExp) {
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }
  // These expose no enumerable contents that can establish value equality.
  if (a instanceof WeakMap || a instanceof WeakSet || a instanceof Promise) return false;
  const av = a.valueOf;
  if (av !== valueOf && typeof av === 'function') {
    return typeof b.valueOf === 'function' && a.valueOf() === b.valueOf();
  }
  const at = a.toString;
  if (at !== toString && typeof at === 'function') {
    return typeof b.toString === 'function' && a.toString() === b.toString();
  }
}

exports.specialEqual = specialEqual;
