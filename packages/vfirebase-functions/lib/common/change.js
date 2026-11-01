'use strict';
const put = (object, key, value) => Object.defineProperty(object, key, {value, enumerable: true, configurable: true, writable: true});
function applyFieldMask(sparseBefore, after, fieldMask) {
  const result = {...after};
  for (const mask of fieldMask.split(',')) {
    const parts = mask.split('.');
    let target = result, source = sparseBefore;
    for (let index = 0; index < parts.length - 1; index++) {
      const key = parts[index];
      const child = {...(Object.hasOwn(target, key) ? target[key] : undefined)};
      put(target, key, child);
      target = child;
      source = source != null && Object.hasOwn(source, key) ? source[key] : undefined;
    }
    const key = parts[parts.length - 1];
    const value = source != null && Object.hasOwn(source, key) ? source[key] : undefined;
    if (value === undefined) delete target[key]; else put(target, key, value);
  }
  return result;
}
class Change {
  constructor(before, after) {this.before = before; this.after = after;}
  static fromObjects(before, after) {return new Change(before, after);}
  static fromJSON(json, customizer = value => value) {
    const before = json.fieldMask ? applyFieldMask(json.before, json.after, json.fieldMask) : {...json.before};
    return new Change(customizer(before), customizer(json.after || {}));
  }
}
module.exports = {Change, applyFieldMask};
