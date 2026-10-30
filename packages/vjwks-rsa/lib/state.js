'use strict';
const { performance } = require('node:perf_hooks');
const { JwksRateLimitError } = require('./errors');
const now = () => performance.now();
class Cache {
  #values = new Map();
  constructor(max, age, clock = now, fallback = 0) { this.max = max; this.age = age; this.clock = clock; this.fallback = fallback; }
  get(id, stale = false) {
    const entry = this.#values.get(id);
    if (!entry) return;
    const elapsed = this.clock() - entry.time;
    if (elapsed >= this.age + this.fallback) { this.#values.delete(id); return; }
    if (!stale && elapsed >= this.age) return;
    this.#values.delete(id); this.#values.set(id, entry);
    return entry.value;
  }
  set(id, value) {
    if (!this.max || !this.age) return;
    this.#values.delete(id);
    if (this.#values.size >= this.max) this.#values.delete(this.#values.keys().next().value);
    this.#values.set(id, { value, time: this.clock() });
  }
  delete(id) { this.#values.delete(id); }
}
class RateLimit {
  #times = [];
  #start = 0;
  constructor(max, clock = now) { this.max = max; this.clock = clock; }
  take() {
    const time = this.clock(), times = this.#times;
    while (this.#start < times.length && time - times[this.#start] >= 60000) this.#start++;
    if (times.length - this.#start >= this.max) throw new JwksRateLimitError();
    if (this.#start && this.#start >= times.length / 2) { this.#times = times.slice(this.#start); this.#start = 0; }
    this.#times.push(time);
  }
}
module.exports = { Cache, RateLimit };
