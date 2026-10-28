'use strict';

// Derived from once (ISC); see LICENSE and PROVENANCE.json.
module.exports = once;
module.exports.strict = strict;
module.exports.proto = proto;
Object.freeze(once);

function once(fn) { return wrap(fn, false); }
function strict(fn) { return wrap(fn, true); }

function wrap(fn, strictMode) {
  if (typeof fn !== 'function') throw new TypeError('callback must be a function');
  let called = false;
  let value;
  let message;
  if (strictMode) {
    const name = fn.name;
    message = (typeof name === 'string' && name ? name : 'Function wrapped with `once`') + " shouldn't be called more than once";
  }
  function wrapped() {
    if (called) {
      if (strictMode) throw new Error(message);
      return value;
    }
    called = true;
    value = Reflect.apply(fn, this, arguments);
    return value;
  }
  Object.defineProperty(wrapped, 'called', { enumerable: true, get() { return called; } });
  Object.defineProperty(wrapped, 'value', { enumerable: true, get() { return value; } });
  if (strictMode) Object.defineProperty(wrapped, 'onceError', { enumerable: true, value: message });

  // Copy enumerable decorations without invoking accessors or treating
  // __proto__ as a setter. State and function-intrinsic properties are reserved.
  for (const key of Reflect.ownKeys(fn)) {
    if (key === 'called' || key === 'value' || key === 'onceError' || Object.hasOwn(wrapped, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(fn, key);
    if (descriptor?.enumerable) Object.defineProperty(wrapped, key, descriptor);
  }
  return wrapped;
}

function onceMethod() { return once(this); }
function strictMethod() { return strict(this); }
function proto() {
  const first = Object.getOwnPropertyDescriptor(Function.prototype, 'once');
  const second = Object.getOwnPropertyDescriptor(Function.prototype, 'onceStrict');
  if (first?.value === onceMethod && second?.value === strictMethod) return;
  if ((first && first.value !== onceMethod) || (second && second.value !== strictMethod)) {
    throw new TypeError('Function.prototype already has once or onceStrict');
  }
  Object.defineProperties(Function.prototype, {
    once: { value: onceMethod, configurable: true },
    onceStrict: { value: strictMethod, configurable: true },
  });
}
