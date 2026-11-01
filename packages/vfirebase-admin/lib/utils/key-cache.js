"use strict";
// One cache owns one validated key snapshot and one pending refresh. Failed
// refreshes never replace the previous snapshot or prevent a later retry.
class KeyCache {
  #load; #keys; #expires = 0; #pending;
  constructor(load) {this.#load = load;}
  get keys() {return this.#keys;}
  get expires() {return this.#expires;}
  stale() {return !this.#keys || this.#expires <= Date.now();}
  read(force = false) {
    if (!force && !this.stale()) return Promise.resolve(this.#keys);
    if (!this.#pending) {
      this.#pending = Promise.resolve().then(this.#load).then(({keys, lifetime}) => {
        if (!keys || typeof keys !== 'object' || Array.isArray(keys)) throw new Error('Invalid public key response.');
        const entries = Object.entries(keys);
        if (entries.some(([, key]) => typeof key !== 'string' || key.length === 0)) throw new Error('Invalid public key response.');
        const snapshot = Object.freeze(Object.fromEntries(entries));
        const retain = Number.isFinite(lifetime) && lifetime > 0;
        this.#keys = retain ? snapshot : undefined;
        this.#expires = retain ? Date.now() + lifetime : 0;
        return snapshot;
      }).finally(() => {this.#pending = undefined;});
    }
    return this.#pending;
  }
}

// Only this response's explicit freshness lifetime is used. This is a key
// cache, not a general HTTP cache with heuristic freshness or revalidation.
function certificateLifetime(headers, started, received) {
  const fields = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const control = fields['cache-control'];
  if (typeof control !== 'string') return 0;
  // Commas inside quoted extension/field-name values do not begin directives.
  const directives = []; let start = 0, quoted = false;
  for (let i = 0; i <= control.length; i++) {
    if (quoted && control[i] === '\\') {i++; continue;}
    if (control[i] === '"') quoted = !quoted;
    if (i === control.length || (!quoted && control[i] === ',')) {directives.push(control.slice(start, i).trim()); start = i + 1;}
  }
  if (quoted) return 0;
  let seconds;
  for (const part of directives) {
    const at = part.indexOf('='), name = (at < 0 ? part : part.slice(0, at)).trim().toLowerCase();
    if (name === 'no-store' || name === 'no-cache') return 0;
    if (name !== 'max-age') continue;
    if (seconds !== undefined || at < 0) return 0;
    const value = part.slice(at + 1).trim();
    const digits = /^(?:\d+|"\d+")$/.test(value) ? value.replaceAll('"', '') : '';
    if (!digits) return 0;
    // RFC 9111 permits saturation on delta-seconds overflow.
    seconds = Math.min(Number(digits), 2147483648);
  }
  if (seconds === undefined) return 0;
  let age = 0;
  if (fields.age !== undefined) {
    if (!/^\d+$/.test(String(fields.age))) return 0;
    age = Math.min(Number(fields.age), 2147483648) * 1000;
  }
  const date = Date.parse(fields.date);
  const apparentAge = Number.isFinite(date) ? Math.max(0, received - date) : 0;
  return Math.max(0, seconds * 1000 - Math.max(apparentAge, age + Math.max(0, received - started)));
}
Object.assign(exports, {KeyCache, certificateLifetime});
