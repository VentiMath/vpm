'use strict';
module.exports = function clock() {
  let next = 0;
  const pending = new Map();
  globalThis.requestAnimationFrame = callback => { pending.set(++next, callback); return next; };
  globalThis.cancelAnimationFrame = id => pending.delete(id);
  return {
    get size() { return pending.size; },
    tick() { const batch = [...pending]; pending.clear(); for (const [, callback] of batch) callback(0); },
  };
};
