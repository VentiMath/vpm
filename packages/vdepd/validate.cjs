'use strict';
exports.namespace = function namespace(value) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError('argument namespace is required and must be a nonempty string');
};
exports.propertyDescriptor = function propertyDescriptor(object, key) {
  if (object === null || (typeof object !== 'object' && typeof object !== 'function')) throw new TypeError('argument obj must be object');
  if (typeof key !== 'string' && typeof key !== 'symbol' && typeof key !== 'number') throw new TypeError('property must be a string, number or symbol');
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor) throw new TypeError('must call property on owner object');
  if (!descriptor.configurable) throw new TypeError('property must be configurable');
  return descriptor;
};
