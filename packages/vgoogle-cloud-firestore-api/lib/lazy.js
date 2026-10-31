'use strict';
// Define an enumerable export that loads on first access and then becomes a
// plain value, so importing the package loads no client or proto module.
module.exports = function lazy(target, name, load) {
  Object.defineProperty(target, name, {
    enumerable: true,
    configurable: true,
    get() {
      const value = load();
      Object.defineProperty(target, name, {value, enumerable: true, writable: false, configurable: false});
      return value;
    },
  });
};
