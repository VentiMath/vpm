"use strict";
// Replacing the accessor makes subsequent reads ordinary property access.
// Leave configurable unspecified: an initializer may have redefined the key.
function store(target, key, value) {
  Object.defineProperty(target, key, {value, writable: true, enumerable: true});
}
function defineLazyProperty(target, key, initialize) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    get() {
      const value = initialize();
      store(target, key, value);
      return value;
    },
    set(value) { store(target, key, value); },
  });
  return target;
}
module.exports = defineLazyProperty;
