'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
// Execute both packages unchanged inside the same deterministic host. Upstream
// source is loaded mechanically, never inspected or used as implementation input.
module.exports = function host(entry, mode = 'immediate', realm = 'vm') {
  let now = 0, next = 0, turns = 0;
  const timers = new Map(), messages = [], warnings = [];
  const globals = {
    performance: {now: () => now},
    Date: class extends Date { static now() {return now;} },
    console: {error: (...args) => warnings.push(args), log() {}, warn() {}},
    process: {env: {NODE_ENV: 'production'}},
    setTimeout(fn, delay = 0) {const id = ++next; timers.set(id, {fn, at: now + Math.max(0, delay)}); return id;},
    clearTimeout(id) {timers.delete(id);},
    setImmediate: undefined, MessageChannel: undefined,
    ...(mode === 'immediate' ? {setImmediate(fn) {messages.push(fn);}} : {}),
    ...(mode === 'channel' ? {MessageChannel: class {
      constructor() {this.port1 = {}; this.port2 = {postMessage: () => messages.push(() => this.port1.onmessage())};}
    }} : {}),
  };
  const context = realm === 'vm' ? vm.createContext(globals) : null;
  const cache = new Map();
  function load(file) {
    file = require.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const m = {exports:{}}; cache.set(file, m);
    const source='(function(require,module,exports){\n'+fs.readFileSync(file, 'utf8')+'\n})';
    // Correctness uses isolated VM globals. Benchmarks use the native realm so
    // VM global-property lookup overhead is not attributed to package code.
    const compiled=realm === 'vm' ? vm.runInContext(source,context,{filename:file})
      : new Function(...Object.keys(globals),'return '+source)(...Object.values(globals));
    compiled(id => load(require.resolve(id,{paths:[path.dirname(file)]})), m, m.exports);
    return m.exports;
  }
  const api = load(entry);
  return {api, warnings,
    get now() {return now;}, get turns() {return turns;},
    advance(ms) {now += ms;},
    get pending() {return {messages:messages.length, timers:timers.size};},
    tick() {
      let fn = messages.shift();
      if (!fn) {
        const due = [...timers].filter(([,t]) => t.at <= now).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
        if (due) {timers.delete(due[0]); fn = due[1].fn;}
      }
      if (!fn) return false;
      turns++; fn(); return true;
    },
    flush(limit=10000) {let count=0;while(this.tick()) if(++count>limit) throw Error('Host did not settle');return count;}
  };
};
