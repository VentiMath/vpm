'use strict';

// Maps keep arbitrary extension names separate from Object.prototype.
class Mime {
  #types = new Map();
  #extensions = new Map();
  #all = new Map();
  #locked = false;

  constructor(...maps) {
    for (const map of maps) this.define(map);
  }

  define(typeMap, force = false) {
    if (this.#locked) throw new Error('define() not allowed for built-in Mime objects; create a new Mime instance.');
    if (typeMap === null || typeof typeMap !== 'object' || Array.isArray(typeMap)) {
      throw new TypeError('typeMap must be an object of extension arrays');
    }
    if (typeof force !== 'boolean') throw new TypeError('force must be a boolean');
    // Validate and resolve every conflict before changing any live mapping.
    const pending = new Map(), entries = [];
    for (const key of Object.keys(typeMap)) {
      const values = typeMap[key];
      if (!Array.isArray(values)) throw new TypeError('extensions must be arrays of strings');
      const type = key.toLowerCase(), extensions = [];
      for (const value of values) {
        if (typeof value !== 'string') throw new TypeError('extensions must be arrays of strings');
        const lower = value.toLowerCase(), starred = lower.startsWith('*');
        const extension = starred ? lower.slice(1) : lower;
        extensions.push(extension);
        if (starred) continue;
        const current = pending.get(extension) ?? this.#types.get(extension);
        if (current !== undefined && current !== type && !force) {
          throw new Error(`"${type} -> ${extension}" conflicts with "${current} -> ${extension}". Pass \`force=true\` to override this definition.`);
        }
        if (current !== type) pending.set(extension, type);
      }
      entries.push([type, extensions]);
    }
    if (this.#locked) throw new Error('define() not allowed for built-in Mime objects; create a new Mime instance.');
    for (const [type, extensions] of entries) {
      const all = this.#all.get(type);
      if (all === undefined) this.#all.set(type, extensions);
      else for (const extension of extensions) if (!all.includes(extension)) all.push(extension);
      if (extensions.length) this.#extensions.set(type, extensions[0]);
    }
    for (const [extension, type] of pending) this.#types.set(extension, type);
    return this;
  }

  getType(path) {
    if (typeof path !== 'string') return null;
    // Only inspect the basename suffix. Long directories need no allocation or
    // case conversion, and a leading dot after a separator is not an extension.
    for (let i = path.length - 1; i >= 0; i--) {
      const ch = path.charCodeAt(i);
      if (ch === 47 || ch === 92) return null;
      if (ch === 46) {
        const before = path.charCodeAt(i - 1);
        if (before === 47 || before === 92) return null;
        return this.#types.get(path.slice(i + 1).toLowerCase()) ?? null;
      }
    }
    return this.#types.get(path.toLowerCase()) ?? null;
  }

  getExtension(type) {
    if (typeof type !== 'string') return null;
    const end = type.indexOf(';');
    if (end !== -1) type = type.slice(0, end);
    return this.#extensions.get(type.trim().toLowerCase()) ?? null;
  }

  getAllExtensions(type) {
    if (typeof type !== 'string') return null;
    const end = type.indexOf(';');
    if (end !== -1) type = type.slice(0, end);
    const extensions = this.#all.get(type.trim().toLowerCase());
    return extensions === undefined ? null : new Set(extensions);
  }

  _freeze() {
    this.#locked = true;
    return Object.freeze(this);
  }

  _getTestState() {
    return { types: new Map(this.#types), extensions: new Map(this.#extensions) };
  }
}

module.exports = Mime;
