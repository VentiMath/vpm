// Copyright The OpenTelemetry Authors. SPDX-License-Identifier: Apache-2.0
// VPM: isolate entry records at API boundaries, while sharing opaque metadata.
class BaggageImpl {
  constructor(entries) {
    this._entries = new Map();
    if (entries) for (const [key, entry] of entries) this._entries.set(key, {...entry});
  }
  getEntry(key) {
    const entry = this._entries.get(key);
    return entry === undefined ? undefined : {...entry};
  }
  getAllEntries() {
    const result = new Array(this._entries.size);
    let index = 0;
    for (const [key, entry] of this._entries) result[index++] = [key, {...entry}];
    return result;
  }
  setEntry(key, entry) {
    const next = this._clone();
    next._entries.set(key, {...entry});
    return next;
  }
  removeEntry(key) {
    const next = this._clone();
    next._entries.delete(key);
    return next;
  }
  removeEntries(...keys) {
    const next = this._clone();
    for (const key of keys) next._entries.delete(key);
    return next;
  }
  clear() { return new BaggageImpl(); }
  _clone() {
    const next = new BaggageImpl();
    next._entries = new Map(this._entries);
    return next;
  }
}
exports.BaggageImpl = BaggageImpl;
