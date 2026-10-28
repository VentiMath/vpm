'use strict';

// Derived from merge-descriptors (MIT); see LICENSE and PROVENANCE.json.
const { isProxy } = require('node:util').types;
// Bun's combined enumeration is already efficient; keep its native path.
const ownKeys = process.versions.bun ? Reflect.ownKeys : nodeOwnKeys;
module.exports = mergeDescriptors;
Object.freeze(mergeDescriptors);

function object(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function nodeOwnKeys(source) {
  // Node enumerates ordinary string keys faster through getOwnPropertyNames.
  // Snapshot symbols before any destination definitions can mutate the source.
  // Proxies retain one ownKeys trap and its original ordering.
  const proxy = isProxy(source);
  const keys = proxy ? Reflect.ownKeys(source) : Object.getOwnPropertyNames(source);
  if (!proxy) {
    const symbols = Object.getOwnPropertySymbols(source);
    for (let i = 0; i < symbols.length; i++) keys.push(symbols[i]);
  }
  return keys;
}

function mergeDescriptors(destination, source, overwrite = true) {
  if (!object(destination)) throw new TypeError('destination must be an object or function');
  if (!object(source)) throw new TypeError('source must be an object or function');
  if (typeof overwrite !== 'boolean') throw new TypeError('overwrite must be a boolean');
  for (const key of ownKeys(source)) {
    if (!overwrite && Object.hasOwn(destination, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    // A proxy trap or earlier destination definition may remove a source key
    // after enumeration. Never substitute an inherited property for it.
    if (descriptor !== undefined) Object.defineProperty(destination, key, descriptor);
  }
  return destination;
}
