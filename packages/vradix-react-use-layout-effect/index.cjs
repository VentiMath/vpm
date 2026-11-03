'use strict';
// Choose once at module load, matching Radix's server/client boundary.
const React = require('react');
exports.useLayoutEffect = globalThis.document ? React.useLayoutEffect : function useLayoutEffect() {};
