'use strict';

const { relative } = require('node:path');
const { getCallSites } = require('node:util');
const isBun = !!process.versions.bun;
const { namespace, propertyDescriptor } = require('./validate.cjs');
const basePath = process.cwd();
const unknown = { scriptName: '<anonymous>', lineNumber: 0, columnNumber: 0, functionName: '' };

module.exports = depd;

function depd(name) {
  namespace(name);
  const origin = capture(3)[1] || unknown;
  const ignored = !!process.noDeprecation || contains(process.env.NO_DEPRECATION, name);
  const traced = !!process.traceDeprecation || contains(process.env.TRACE_DEPRECATION, name);
  const warned = new Set();

  function deprecate(message) { warn(message); }

  function warn(message, site) {
    const listeners = process.listenerCount('deprecation') !== 0;
    if (ignored && !listeners) return;
    // Bun's stack capture does not benefit from a short capture plus expansion.
    let expanded = isBun || ((listeners || traced) && warned.size === 0);
    let stack = capture(expanded ? undefined : 5);
    let i = site ? 1 : 2;
    const depSite = site || stack[i] || unknown;
    let file = site ? (stack[i] || unknown).scriptName : origin.scriptName;
    let seen = false;
    let caller = depSite;
    for (; i < stack.length; i++) {
      caller = stack[i];
      if (caller.scriptName === file) seen = true;
      else if (caller.scriptName === origin.scriptName) file = origin.scriptName;
      else if (seen) break;
      if (i === stack.length - 1 && stack.length >= 4 && !expanded && stackDepth() > 5) {
        stack = capture();
        expanded = true;
      }
    }
    const key = locationKey(depSite) + '\n' + locationKey(caller);
    if (warned.has(key)) return;
    warned.add(key);
    const text = message ? String(message) : depSite.functionName || '<anonymous@' + location(depSite) + '>';
    if ((listeners || traced) && !expanded && stack.length >= 4 && stackDepth() > 5) stack = capture();
    if (listeners) {
      process.emit('deprecation', deprecationError(name, text, stack.slice(i)));
      return;
    }
    const color = process.stderr.isTTY;
    let output = color
      ? '\x1b[36;1m' + name + '\x1b[22;39m \x1b[33;1mdeprecated\x1b[22;39m \x1b[0m' + text + '\x1b[39m'
      : new Date().toUTCString() + ' ' + name + ' deprecated ' + text;
    if (traced) {
      for (; i < stack.length; i++) output += '\n    ' + (color ? '\x1b[36m' : '') + 'at ' + frame(stack[i]) + (color ? '\x1b[39m' : '');
    } else {
      output += color ? ' \x1b[36m' + location(caller) + '\x1b[39m' : ' at ' + location(caller);
    }
    process.stderr.write(output + '\n', 'utf8');
  }

  deprecate.function = function wrapFunction(fn, message) {
    if (typeof fn !== 'function') throw new TypeError('argument fn must be a function');
    const site = { ...(capture(3)[1] || unknown), functionName: fn.name };
    const wrapped = new Proxy(fn, {
      apply(target, receiver, args) {
        warn(message, site);
        return Reflect.apply(target, receiver, args);
      },
      construct(target, args, newTarget) {
        warn(message, site);
        return Reflect.construct(target, args, newTarget === wrapped ? target : newTarget);
      },
    });
    return wrapped;
  };

  deprecate.property = function wrapProperty(object, key, message) {
    const descriptor = propertyDescriptor(object, key);
    const site = { ...(capture(3)[1] || unknown), functionName: String(key) };
    const replacement = { configurable: true, enumerable: descriptor.enumerable };
    if ('value' in descriptor) {
      let value = descriptor.value;
      replacement.get = function get() { warn(message, site); return value; };
      if (descriptor.writable) replacement.set = function set(next) {
        warn(message, site);
        if (this === object) { value = next; return; }
        // A write through a prototype must create/update the receiver's own
        // data property, as an ordinary writable data descriptor would.
        if (this === null || (typeof this !== 'object' && typeof this !== 'function')) throw new TypeError('property receiver must be an object');
        const own = Object.getOwnPropertyDescriptor(this, key);
        if (own && (!('value' in own) || !own.writable)) throw new TypeError('receiver property is not writable');
        Object.defineProperty(this, key, own ? { value: next } : { value: next, writable: true, enumerable: true, configurable: true });
      };
    } else {
      if (descriptor.get) replacement.get = function get() {
        warn(message, site);
        return Reflect.apply(descriptor.get, this, arguments);
      };
      if (descriptor.set) replacement.set = function set() {
        warn(message, site);
        return Reflect.apply(descriptor.set, this, arguments);
      };
    }
    // Prepare first: a failed installation never leaves a half-wrapped property.
    Object.defineProperty(object, key, replacement);
  };
  return Object.freeze(deprecate);
}

function contains(list, name) {
  if (!list) return false;
  const lower = name.toLowerCase();
  return list.toLowerCase().split(/[ ,]+/).some(value => value === '*' || value === lower);
}

function stackDepth() {
  const limit = Error.stackTraceLimit;
  return typeof limit === 'number' && !Number.isNaN(limit) ? Math.min(200, Math.max(10, Math.trunc(limit))) : 10;
}
function capture(maxDepth) {
  // Keep Bun on one capture depth: alternating short/full limits can truncate
  // subsequent captures after JSC warms up, despite restored Error metadata.
  const depth = isBun || maxDepth === undefined ? stackDepth() : maxDepth;
  if (getCallSites && !isBun) return getCallSites(depth, { sourceMap: false }).slice(1);
  // Bun's getCallSites also swaps global hooks. Do it explicitly so restoration
  // preserves descriptors and absence, including when stack capture throws.
  const prepare = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
  const traceLimit = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit');
  if ((prepare && !('value' in prepare)) || (traceLimit && !('value' in traceLimit))) throw new TypeError('stack hooks must be writable data properties on this runtime');
  let changedPrepare = false;
  let changedLimit = false;
  try {
    Error.prepareStackTrace = (_, frames) => frames;
    changedPrepare = true;
    Error.stackTraceLimit = depth;
    changedLimit = true;
    const holder = {};
    Error.captureStackTrace(holder, capture);
    const stack = holder.stack;
    // Bun stops honoring prepareStackTrace after that built-in property has
    // been deleted. Its textual stack still supplies file/line/column data.
    if (typeof stack === 'string') return textFrames(stack);
    return stack.filter(site => site.getFileName() !== '[native code]').map(site => ({
      scriptName: site.getFileName() || '<anonymous>',
      lineNumber: site.getLineNumber() || 0,
      columnNumber: site.getColumnNumber() || 0,
      functionName: site.getFunctionName() || '',
    }));
  } finally {
    if (changedLimit) restore('stackTraceLimit', traceLimit);
    if (changedPrepare) restore('prepareStackTrace', prepare);
  }
}

function textFrames(stack) {
  const frames = [];
  for (const line of stack.split('\n').slice(1)) {
    const match = /^\s*at (?:(.*?) \()?(.+):(\d+):(\d+)\)?$/.exec(line);
    if (match) frames.push({ functionName: match[1] || '', scriptName: match[2], lineNumber: Number(match[3]), columnNumber: Number(match[4]) });
  }
  return frames;
}

function restore(key, descriptor) {
  // Assignment preserves data-property flags. Redefining Bun's built-in Error
  // properties breaks their connection to its internal formatter/depth state.
  if (descriptor) Error[key] = descriptor.value;
  else { if (isBun) Error[key] = undefined; delete Error[key]; }
}
function locationKey(site) { return site.scriptName + ':' + site.lineNumber + ':' + site.columnNumber; }
function location(site) { return relative(basePath, site.scriptName || '<anonymous>') + ':' + site.lineNumber + ':' + site.columnNumber; }
function frame(site) { return site.functionName ? site.functionName + ' (' + locationKey(site) + ')' : locationKey(site); }

function deprecationError(namespace, message, frames) {
  const error = new Error();
  let cached;
  Object.defineProperties(error, {
    name: { value: 'DeprecationError', writable: true, configurable: true },
    message: { value: message, writable: true, configurable: true },
    namespace: { value: namespace, writable: true, configurable: true },
    stack: {
      configurable: true,
      get() { return cached === undefined ? (cached = this.name + ': ' + this.namespace + ' deprecated ' + this.message + frames.map(site => '\n    at ' + frame(site)).join('')) : cached; },
      set(value) { cached = value; },
    },
  });
  return error;
}
