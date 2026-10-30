'use strict';
// Upstream contains callback tests that return before their assertions execute.
// Track their completion and listener assertions before Mocha runs afterEach.
const mocha = require('mocha');
let current;
function track(library) {
  function request(options, callback) {
    if (!current) return library(options, callback);
    const context = current;
    let resolve, reject;
    const pending = new Promise((yes, no) => {resolve = yes; reject = no;});
    pending.catch(() => {});
    let result;
    try {
      result = library(options, callback && function(...args) {
        try {callback.apply(this, args); resolve();} catch (error) {reject(error);}
      });
    } catch (error) {throw error;}
    context.pending.push(pending);
    if (!callback) {
      context.streams.push(result);
      const emit = result.emit;
      result.emit = function(event, ...args) {
        let value;
        try {value = emit.call(this, event, ...args);} catch (error) {reject(error); return false;}
        if (event === 'response') setImmediate(() => {
          if (result.readableFlowing === null && !result.listenerCount('readable') && !result.listenerCount('data')) resolve();
        });
        if (event === 'end' || event === 'error') resolve();
        return value;
      };
    }
    return result;
  }
  Object.defineProperty(request, 'stats', {get: () => library.stats, set: value => library.stats = value});
  request.resetStats = () => library.resetStats();
  request.defaults = options => track(library.defaults(options));
  return request;
}
function it(title, fn) {
  return mocha.it(title, async function() {
    const context = current = {pending: [], streams: []};
    try {
      if (fn.length) await new Promise((resolve, reject) => fn.call(this, error => error ? reject(error) : resolve()));
      else await fn.call(this);
      let offset = 0;
      while (offset < context.pending.length) {const group = context.pending.slice(offset); offset += group.length; await Promise.all(group);}
    } finally {
      current = undefined;
      for (const stream of context.streams) {stream.on('error', () => {}); stream.destroy();}
    }
  });
}
it.skip = mocha.it.skip;
module.exports = {...mocha, it, track};
