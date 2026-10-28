'use strict';

// Derived from merge-descriptors (MIT); see LICENSE and PROVENANCE.json.
module.exports = mergeDescriptors;
Object.freeze(mergeDescriptors);

function object(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function mergeDescriptors(destination, source, overwrite = true) {
  if (!object(destination)) throw new TypeError('destination must be an object or function');
  if (!object(source)) throw new TypeError('source must be an object or function');
  if (typeof overwrite !== 'boolean') throw new TypeError('overwrite must be a boolean');
  for (const key of Reflect.ownKeys(source)) {
    if (!overwrite && Object.hasOwn(destination, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    // A proxy trap or earlier destination definition may remove a source key
    // after enumeration. Never substitute an inherited property for it.
    if (descriptor !== undefined) Object.defineProperty(destination, key, descriptor);
  }
  return destination;
}
