const {validateKey, validateValue} = require('./tracestate-validators.cjs');
// Copyright The OpenTelemetry Authors. SPDX-License-Identifier: Apache-2.0
// VPM: validate updates, preserve overflow order and cache immutable serialization.
class TraceStateImpl {
  constructor(rawTraceState) {
    this._internalState = new Map();
    this._length = 0;
    this._serialized = '';
    if (rawTraceState) this._parse(rawTraceState);
  }
  set(key, value) {
    if (typeof key !== 'string' || typeof value !== 'string' || !validateKey(key) || !validateValue(value)) return this;
    const current = this._internalState.get(key);
    const exists = current !== undefined;
    if (!exists && this._internalState.size >= 32) return this;
    const length = this._length + (exists ? value.length - current.length : key.length + value.length + (this._internalState.size ? 2 : 1));
    if (length > 512) return this;
    const next = this._clone();
    if (exists) next._internalState.delete(key);
    next._internalState.set(key, value);
    next._length = length;
    return next;
  }
  unset(key) {
    const next = this._clone();
    const value = next._internalState.get(key);
    if (value !== undefined) {
      next._length -= key.length + value.length + (next._internalState.size > 1 ? 2 : 1);
      next._internalState.delete(key);
    }
    return next;
  }
  get(key) { return this._internalState.get(key); }
  serialize() {
    if (this._serialized !== undefined) return this._serialized;
    const parts = [];
    for (const [key, value] of this._internalState) parts.push(key + '=' + value);
    return this._serialized = parts.reverse().join(',');
  }
  _parse(raw) {
    if (typeof raw !== 'string' || raw.length > 512) return;
    const parts = raw.split(',');
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim(), equal = part.indexOf('=');
      if (equal < 0) continue;
      const key = part.slice(0, equal), value = part.slice(equal + 1);
      if (validateKey(key) && validateValue(value)) this._internalState.set(key, value);
    }
    if (this._internalState.size > 32) this._internalState = new Map(Array.from(this._internalState).slice(-32));
    this._length = this._internalState.size ? this._internalState.size - 1 : 0;
    for (const [key, value] of this._internalState) this._length += key.length + value.length + 1;
    this._serialized = undefined;
  }
  _keys() { return Array.from(this._internalState.keys()).reverse(); }
  _clone() {
    const next = new TraceStateImpl();
    next._internalState = new Map(this._internalState);
    next._length = this._length;
    next._serialized = undefined;
    return next;
  }
}
exports.TraceStateImpl = TraceStateImpl;
