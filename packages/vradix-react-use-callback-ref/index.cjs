'use strict';
const React = require('react');

// React 19 guarantees insertion effects. Publish the new target only when a
// render commits, before layout effects can invoke the stable callback.
exports.useCallbackRef = function useCallbackRef(callback) {
  const target = React.useRef(callback);
  React.useInsertionEffect(() => { target.current = callback; });
  return React.useCallback((...args) => target.current?.(...args), []);
};
