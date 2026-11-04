'use client';
'use strict';
const React = require('react');

function composeRefs(...refs) {
  return node => {
    let disposers;
    // Most refs return nothing. Avoid an array of empty cleanup results on
    // every attachment; allocate storage only when a callback owns cleanup.
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (typeof ref === 'function') {
        const dispose = ref(node);
        if (typeof dispose === 'function') {
          if (disposers) disposers.push(i, dispose);
          else disposers = [i, dispose];
        }
      } else if (ref !== null && ref !== undefined) {
        ref.current = node;
      }
    }
    if (!disposers) return;
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      let failed = false, failure, nextDisposer = 0;
      // Release every owned ref even when an earlier cleanup throws. Mark the
      // attachment released first so repeated/reentrant teardown runs once.
      for (let i = 0; i < refs.length; i++) {
        try {
          const ref = refs[i];
          if (nextDisposer < disposers.length && disposers[nextDisposer] === i) {
            const dispose = disposers[nextDisposer + 1];
            nextDisposer += 2;
            dispose();
          }
          else if (typeof ref === 'function') ref(null);
          else if (ref !== null && ref !== undefined) ref.current = null;
        } catch (error) {
          if (!failed) {failed = true; failure = error;}
        }
      }
      disposers = undefined;
      if (failed) throw failure;
    };
  };
}
function useComposedRefs(...refs) {
  // Recreate the composed callback only when a participating ref changes.
  return React.useMemo(() => composeRefs(...refs), refs);
}
module.exports = {composeRefs, useComposedRefs};
