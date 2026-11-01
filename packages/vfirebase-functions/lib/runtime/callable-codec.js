'use strict';
const logger = require('../logger/index.js');
const container = Symbol();
const longTypes = new Set(['type.googleapis.com/google.protobuf.Int64Value', 'type.googleapis.com/google.protobuf.UInt64Value']);

function failure(value, encoding) {
  const operation = encoding ? 'encoded in' : 'decoded from';
  logger.error(`Data cannot be ${operation} JSON.`, value);
  throw new Error(`Data cannot be ${operation} JSON: ${value}`);
}

// Scalar conversion and container traversal are separate. Ordinary payloads
// use bounded recursion; beyond 64 containers an explicit stack handles depth.
// Only ancestors count as cycles: shared siblings are serialized twice.
function convert(value, encoding) {
  function scalar(input) {
    if (encoding) {
      switch (typeof input) {
        case 'string': case 'boolean': return input;
        case 'number': return Number.isFinite(input) ? input : failure(input, true);
        case 'undefined': return null;
        case 'object':
          if (input === null) return null;
          if (input instanceof Number) {
            const number = input.valueOf();
            return Number.isFinite(number) ? number : failure(number, true);
          }
          return container;
        case 'function': return container;
        default: return failure(input, true);
      }
    }
    if (input === undefined) throw new TypeError('Callable data must be defined');
    if (input === null || typeof input !== 'object') return input;
    if (Object.hasOwn(input, '@type') && input['@type']) {
      if (!longTypes.has(input['@type'])) return failure(input, false);
      // Firebase's wire protocol exposes these wrappers as JavaScript numbers.
      const number = parseFloat(input.value);
      return Number.isNaN(number) ? failure(input, false) : number;
    }
    return container;
  }
  const first = scalar(value);
  if (first !== container) return first;
  const parents = [];
  function visit(input, depth) {
    const result = scalar(input);
    if (result !== container) return result;
    if (parents.includes(input)) throw new TypeError('Callable data contains a circular reference');
    if (depth === 64) return deep(input);
    parents.push(input);
    const array = Array.isArray(input), output = array ? new Array(input.length) : {};
    if (array) {
      for (let i = 0; i < input.length; i++) if (i in input) output[i] = visit(input[i], depth + 1);
    } else {
      const keys = Object.keys(input);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = visit(input[key], depth + 1);
        if (key === '__proto__') Object.defineProperty(output, key, {value, enumerable: true, writable: true, configurable: true});
        else output[key] = value;
      }
    }
    parents.pop();
    return output;
  }
  function deep(value) {
    const ancestors = new WeakSet(parents);
    function frame(source) {
      ancestors.add(source);
      const array = Array.isArray(source);
      return {source, output: array ? new Array(source.length) : {}, keys: array ? null : Object.keys(source), index: 0, length: array ? source.length : 0};
    }
    const initial = frame(value), stack = [initial];
    while (stack.length) {
      const current = stack[stack.length - 1];
      if (current.index === (current.keys === null ? current.length : current.keys.length)) {
        ancestors.delete(current.source);
        stack.pop();
        continue;
      }
      const key = current.keys === null ? current.index++ : current.keys[current.index++];
      if (current.keys === null && !(key in current.source)) continue;
      const input = current.source[key];
      let output = scalar(input);
      if (output === container) {
        if (ancestors.has(input)) throw new TypeError('Callable data contains a circular reference');
        const child = frame(input);
        output = child.output;
        stack.push(child);
      }
      if (key === '__proto__') Object.defineProperty(current.output, key, {value: output, enumerable: true, writable: true, configurable: true});
      else current.output[key] = output;
    }
    return initial.output;
  }
  return visit(value, 0);
}
exports.encode = value => convert(value, true);
exports.decode = value => convert(value, false);
