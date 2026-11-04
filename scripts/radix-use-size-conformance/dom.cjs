'use strict';
exports.install = window => {
  const frames = new Map(), observers = new Set(); let next = 0;
  window.requestAnimationFrame = callback => { frames.set(++next, callback); return next; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = class {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.add(this); }
    observe(target, options) { this.targets.add(target); this.options = options; }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  };
  return {
    get frames() { return frames.size; },
    get active() { return [...observers].filter(o => o.targets.size); },
    tick() { const batch = [...frames.values()]; frames.clear(); for (const callback of batch) callback(0); },
    deliver(target, fields = {}) { for (const o of observers) if (o.targets.has(target)) o.callback([{ target, ...fields }]); },
  };
};
