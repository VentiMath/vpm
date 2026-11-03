'use client';
'use strict';
const React = require('react');
exports.useId = function useId(deterministicId) {
  // Always reserve the hook slot, even when a caller supplies an ID.
  const generated = React.useId();
  return deterministicId || 'radix-' + generated;
};
