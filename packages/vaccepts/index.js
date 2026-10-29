'use strict';
/*!
 * vaccepts
 * Derived from accepts, Copyright 2014 Jonathan Ong; Copyright 2015 Douglas Christopher Wilson.
 * Modifications Copyright 2026 VentiMath contributors. MIT Licensed.
 */
const Negotiator = require('vnegotiator');
const mime = require('vmime-types');
// Offers are validated against a request with no Accept field: an empty field
// means the same thing as an absent one here, as it does in accepts.
const unconstrained = new Negotiator({ headers: {} });

function Accepts(request) {
  if (!(this instanceof Accepts)) return new Accepts(request);
  this.negotiator = new Negotiator(request);
}

// Keep the familiar public view coherent if the caller replaces req.headers.
Object.defineProperty(Accepts.prototype, 'headers', {
  get() { return this.negotiator.request.headers; }, enumerable: true,
});

function values(args) {
  if (args.length === 0 || args[0] == null) return [];
  return Array.isArray(args[0]) ? args[0] : Array.from(args);
}

Accepts.prototype.type = Accepts.prototype.types = function () {
  const types = values(arguments);
  if (types.length === 0) return this.negotiator.mediaTypes();
  const headers = this.headers;
  // accepts treats an empty Accept field like an absent one.
  if (!Object.hasOwn(headers, 'accept') || !headers.accept) {
    // Validate just the first usable offer. Absence must not bypass validation,
    // but it needs no preference ranking or normalization of the remaining offers.
    for (const value of types) {
      if (typeof value !== 'string') continue;
      const normalized = value.includes('/') ? value : mime.lookup(value);
      if (normalized && unconstrained.mediaType([normalized]) !== undefined) return value;
    }
    return false;
  }
  const offered = [], originals = new Map();
  for (const value of types) {
    if (typeof value !== 'string') continue;
    const normalized = value.includes('/') ? value : mime.lookup(value);
    if (!normalized) continue;
    offered.push(normalized);
    // Multiple extensions can map to the same media type; the first wins.
    if (!originals.has(normalized)) originals.set(normalized, value);
  }
  const match = this.negotiator.mediaType(offered);
  return match === undefined ? false : originals.get(match);
};

for (const kind of ['charset', 'encoding', 'language']) {
  const method = function () {
    const available = values(arguments);
    return available.length === 0 ? this.negotiator[kind + 's']() : this.negotiator[kind](available) ?? false;
  };
  Accepts.prototype[kind] = Accepts.prototype[kind + 's'] = method;
}
Accepts.prototype.lang = Accepts.prototype.langs = Accepts.prototype.language;
Object.freeze(Accepts.prototype);
module.exports = Accepts;
Object.freeze(module.exports);
