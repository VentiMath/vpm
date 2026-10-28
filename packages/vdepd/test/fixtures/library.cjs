'use strict';
module.exports = function library(factory) {
  const warn = factory('example-lib');
  const object = { value: 1 };
  warn.property(object, 'value', 'use nextValue');
  return {
    warn, object,
    old() { warn('use next'); },
    other() { warn('use next'); },
    dynamic(message) { warn(message); },
    auto: function autoName() { warn(); },
    deep(depth) {
      function recurse(left) { if (left) recurse(left - 1); else warn('deep warning'); }
      recurse(depth);
    },
    wrapped: warn.function(function add(a, b) { return this.base + a + b; }, 'use sum'),
    defaultWrapped: warn.function(function named() { return 7; }),
  };
};
