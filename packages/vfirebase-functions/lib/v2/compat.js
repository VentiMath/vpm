'use strict';
const patched = Symbol.for('firebase.functions.v2.compat');
function addV1Compat(event, getters) {
  if (Object.hasOwn(event, patched)) return event;
  for (const key of Object.keys(getters)) {
    let initialized = false, value;
    Object.defineProperty(event, key, {enumerable: true, configurable: true, get() {
      if (!initialized) {value = getters[key](); initialized = true;}
      return value;
    }});
  }
  Object.defineProperty(event, patched, {value: true});
  return event;
}
exports.addV1Compat = addV1Compat;
