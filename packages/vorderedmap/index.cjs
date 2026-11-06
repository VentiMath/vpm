'use strict';
const INTERNAL = Symbol('OrderedMap construction');

// Small schemas keep a compact sequence. Larger maps build an index only when
// queried; edits never expose or mutate a previous map's sequence.
class OrderedMap {
  #pairs;
  #index;
  constructor(pairs, token, index) {
    if (token !== INTERNAL) throw new TypeError('Use OrderedMap.from()');
    this.#pairs = pairs;
    this.#index = index;
  }
  static from(value) {
    if (value instanceof OrderedMap) return value;
    const keys = value == null ? [] : Object.keys(value);
    const pairs = new Array(keys.length * 2);
    for (let i = 0; i < keys.length; i++) {
      pairs[i * 2] = keys[i];
      pairs[i * 2 + 1] = value[keys[i]];
    }
    return new OrderedMap(pairs, INTERNAL);
  }
  get size() { return this.#pairs.length / 2; }
  #position(key) {
    const pairs = this.#pairs;
    if (pairs.length < 64) {
      for (let i = 0; i < pairs.length; i += 2) if (pairs[i] === key) return i;
      return -1;
    }
    if (!this.#index) {
      this.#index = new Map();
      for (let i = 0; i < pairs.length; i += 2) this.#index.set(pairs[i], i);
    }
    return this.#index.get(key) ?? -1;
  }
  get(key) {
    const position = this.#position(key);
    return position < 0 ? undefined : this.#pairs[position + 1];
  }
  update(key, value, newKey) {
    const target = newKey === undefined ? key : newKey;
    const source = this.#position(key);
    const collision = target === key ? -1 : this.#position(target);
    if (source >= 0 && target === key && Object.is(this.#pairs[source + 1], value)) return this;
    if (collision < 0) {
      const pairs = this.#pairs.slice();
      if (source < 0) pairs.push(target, value);
      else { pairs[source] = target; pairs[source + 1] = value; }
      return new OrderedMap(pairs, INTERNAL, source >= 0 && target === key ? this.#index : undefined);
    }
    const pairs = [];
    for (let i = 0; i < this.#pairs.length; i += 2) {
      if (i === collision) continue;
      pairs.push(i === source ? target : this.#pairs[i], i === source ? value : this.#pairs[i + 1]);
    }
    if (source < 0) pairs.push(target, value);
    return new OrderedMap(pairs, INTERNAL);
  }
  remove(key) {
    const position = this.#position(key);
    if (position < 0) return this;
    const pairs = this.#pairs.slice();
    pairs.splice(position, 2);
    return new OrderedMap(pairs, INTERNAL);
  }
  #insert(place, key, value, atStart) {
    const pairs = [];
    let inserted = false;
    if (atStart) { pairs.push(key, value); inserted = true; }
    for (let i = 0; i < this.#pairs.length; i += 2) {
      const current = this.#pairs[i];
      if (current === key) continue;
      if (!inserted && current === place) { pairs.push(key, value); inserted = true; }
      pairs.push(current, this.#pairs[i + 1]);
    }
    if (!inserted) pairs.push(key, value);
    return new OrderedMap(pairs, INTERNAL);
  }
  addToStart(key, value) { return this.#insert(undefined, key, value, true); }
  addToEnd(key, value) { return this.#insert(undefined, key, value, false); }
  addBefore(place, key, value) { return this.#insert(place, key, value, false); }
  forEach(fn) {
    for (let i = 0; i < this.#pairs.length; i += 2) fn(this.#pairs[i], this.#pairs[i + 1]);
  }
  #exclude(other) {
    const keys = new Set();
    for (let i = 0; i < other.length; i += 2) keys.add(other[i]);
    let result;
    for (let i = 0; i < this.#pairs.length; i += 2) {
      if (keys.has(this.#pairs[i])) { if (!result) result = this.#pairs.slice(0, i); }
      else if (result) result.push(this.#pairs[i], this.#pairs[i + 1]);
    }
    return result || this.#pairs;
  }
  prepend(value) { return this.#merge(value, true); }
  append(value) { return this.#merge(value, false); }
  #merge(value, first) {
    const other = OrderedMap.from(value).#pairs;
    if (!other.length) return this;
    const remaining = this.#exclude(other);
    return new OrderedMap(first ? other.concat(remaining) : remaining.concat(other), INTERNAL);
  }
  subtract(value) {
    const other = OrderedMap.from(value).#pairs;
    if (!other.length) return this;
    const remaining = this.#exclude(other);
    return remaining === this.#pairs ? this : new OrderedMap(remaining, INTERNAL);
  }
  toObject() {
    const result = {};
    for (let i = 0; i < this.#pairs.length; i += 2) {
      const key = this.#pairs[i], value = this.#pairs[i + 1];
      // Keep a normal Object prototype while preserving this key as data.
      if (key === '__proto__') Object.defineProperty(result, key, {value, enumerable: true, writable: true, configurable: true});
      else result[key] = value;
    }
    return result;
  }
}
module.exports = OrderedMap;
