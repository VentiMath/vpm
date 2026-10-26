'use strict';

// Derived from debug 4.4.3, Copyright (c) 2014-2017 TJ Holowaychuk and
// Copyright (c) 2018-2021 Josh Junon.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const humanize = require('vms');

// Compile literal chunks once. Only '*' is special; punctuation stays literal.
// Reserve an anchored suffix before scanning the middle, so a greedy match
// cannot consume the only occurrence that satisfies the suffix.
function compile(template) {
  if (!template.includes('*')) return name => name === template;
  const chunks = template.split('*');
  const prefix = chunks.shift();
  const suffix = chunks.pop();
  const middle = chunks.filter(Boolean);
  return name => {
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) return false;
    let position = prefix.length;
    const end = name.length - suffix.length;
    if (position > end) return false;
    for (const chunk of middle) {
      const found = name.indexOf(chunk, position);
      if (found === -1 || found + chunk.length > end) return false;
      position = found + chunk.length;
    }
    return true;
  };
}

module.exports = function setup(env) {
  let version = 0;
  let namespaces = '';
  let names = Object.freeze([]);
  let skips = Object.freeze([]);
  let include = [];
  let exclude = [];

  Object.assign(createDebug, env, {
    debug: createDebug, default: createDebug,
    humanize, enable, disable, enabled, selectColor,
    formatters: Object.create(null),
    coerce: value => value instanceof Error ? value.stack || value.message : value,
  });
  Object.defineProperties(createDebug, {
    namespaces: { enumerable: true, get: () => namespaces },
    names: { enumerable: true, get: () => names },
    skips: { enumerable: true, get: () => skips },
  });

  function createDebug(namespace) {
    if (typeof namespace !== 'string') throw new TypeError('namespace must be a string');
    let override = null;
    let cachedVersion = -1;
    let cachedName;
    let cachedEnabled = false;
    let previousTime;

    function debug(...args) {
      if (!debug.enabled) return;
      const now = performance.now();
      debug.diff = previousTime === undefined ? 0 : Math.max(0, Math.round(now - previousTime));
      previousTime = now;
      debug.prev = debug.curr;
      debug.curr = Date.now();

      args[0] = createDebug.coerce(args[0]);
      if (typeof args[0] !== 'string') args.unshift('%O');
      let index = 0;
      args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
        if (match === '%%') return '%';
        index++;
        const formatter = createDebug.formatters[format];
        if (typeof formatter === 'function') {
          match = formatter.call(debug, args[index]);
          args.splice(index--, 1);
        }
        return match;
      });
      createDebug.formatArgs.call(debug, args);
      (debug.log || createDebug.log).apply(debug, args);
    }

    debug.namespace = namespace;
    debug.useColors = createDebug.useColors();
    debug.color = createDebug.selectColor(namespace);
    debug.destroy = createDebug.destroy;
    debug.extend = function extend(suffix, delimiter = ':') {
      if (typeof suffix !== 'string' || typeof delimiter !== 'string') {
        throw new TypeError('namespace suffix and delimiter must be strings');
      }
      const child = createDebug(debug.namespace + delimiter + suffix);
      child.log = debug.log;
      return child;
    };
    Object.defineProperty(debug, 'enabled', {
      enumerable: true,
      get() {
        if (override !== null) return override;
        if (cachedVersion !== version || cachedName !== debug.namespace) {
          cachedEnabled = createDebug.enabled(debug.namespace);
          cachedVersion = version;
          cachedName = debug.namespace;
        }
        return cachedEnabled;
      },
      set(value) {
        if (value !== null && typeof value !== 'boolean') throw new TypeError('enabled must be a boolean or null');
        override = value;
      },
    });
    if (typeof createDebug.init === 'function') createDebug.init(debug);
    return debug;
  }

  function enable(value = '') {
    if (typeof value !== 'string') throw new TypeError('namespaces must be a string');
    const nextNames = [], nextSkips = [];
    for (const token of value.split(/[\s,]+/).filter(Boolean)) {
      if (token[0] === '-') nextSkips.push(token.slice(1));
      else nextNames.push(token);
    }
    const nextInclude = nextNames.map(compile);
    const nextExclude = nextSkips.map(compile);
    createDebug.save(value);
    namespaces = value;
    names = Object.freeze(nextNames);
    skips = Object.freeze(nextSkips);
    include = nextInclude;
    exclude = nextExclude;
    version++;
  }

  function disable() {
    const previous = [...names, ...skips.map(name => '-' + name)].join(',');
    enable('');
    return previous;
  }

  function enabled(name) {
    if (typeof name !== 'string') throw new TypeError('namespace must be a string');
    for (const match of exclude) if (match(name)) return false;
    for (const match of include) if (match(name)) return true;
    return false;
  }

  function selectColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
  }

  enable(createDebug.load());
  return createDebug;
};
