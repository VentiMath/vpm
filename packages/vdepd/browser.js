'use strict';
const { namespace, propertyDescriptor } = require('./validate.cjs');
module.exports = function depd(name) {
  namespace(name);
  function deprecate() {}
  deprecate.function = function wrapFunction(fn) {
    if (typeof fn !== 'function') throw new TypeError('argument fn must be a function');
    return fn;
  };
  deprecate.property = function wrapProperty(object, key) { propertyDescriptor(object, key); };
  return Object.freeze(deprecate);
};
