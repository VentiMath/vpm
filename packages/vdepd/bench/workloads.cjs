'use strict';
module.exports = function workloads(factory, mode) {
  if (mode === 'factory') return () => factory('bench');
  const warn = factory('bench');
  function plusOne(value) { return value + 1; }
  if (mode === 'wrap function') return () => warn.function(plusOne, 'use next');
  if (mode === 'wrap property') return value => { const object = { value }; warn.property(object, 'value', 'use next'); return object; };
  if (mode === 'direct') return () => warn('use next');
  if (mode === 'function') return warn.function(plusOne, 'use next');
  if (mode === 'get' || mode === 'set') {
    const object = { value: 1 }; warn.property(object, 'value', 'use next');
    return mode === 'get' ? () => object.value : value => (object.value = value);
  }
  if (mode === 'first') return () => factory('bench')('use next');
  throw Error('unknown mode');
};
