// Runtime primitives for VPM's query cache. Kept separate from cache state so
// browser lifecycle and timers have one owner per mounted QueryClient.
export function schedule(callback, delay, unref = false) {
  if (delay === Infinity) return () => {};
  let remaining = Math.max(0, Number(delay) || 0);
  let timer, cancelled = false;
  const arm = () => {
    const part = Math.min(remaining, 2147483647);
    remaining -= part;
    timer = setTimeout(() => {
      if (cancelled) return;
      if (remaining > 0) arm();
      else callback();
    }, part);
    if (unref) timer?.unref?.();
  };
  arm();
  return () => { cancelled = true; clearTimeout(timer); };
}

export class Subscribable {
  listeners = new Set();
  subscribe = listener => {
    this.listeners.add(listener);
    this.onSubscribe?.();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(listener);
      this.onUnsubscribe?.();
    };
  };
  hasListeners() { return this.listeners.size !== 0; }
  emit(value) { for (const listener of [...this.listeners]) listener(value); }
}

class Environment extends Subscribable {
  constructor(read, listen) { super(); this.read = read; this.listen = listen; }
  value = undefined;
  current() { return this.value ?? this.read(); }
  set(value) {
    const before = this.observed ?? this.current();
    this.value = value; this.observed = this.current();
    if (before !== this.observed) this.emit(this.observed);
  }
  setEventListener(listen) { this.cleanup?.(); this.listen = listen; this.cleanup = this.hasListeners() ? listen(value => this.set(value)) : undefined; }
  onSubscribe() { if (!this.cleanup) {this.observed = this.current(); this.cleanup = this.listen(value => this.set(value));} }
  onUnsubscribe() { if (!this.hasListeners()) { this.cleanup?.(); this.cleanup = undefined; } }
}

export const focusManager = new Environment(
  () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  notify => {
    if (typeof window === 'undefined') return () => {};
    const handler = () => notify(document.visibilityState !== 'hidden');
    window.addEventListener('visibilitychange', handler);
    return () => window.removeEventListener('visibilitychange', handler);
  },
);
focusManager.isFocused = () => focusManager.current();
focusManager.setFocused = value => focusManager.set(value);

export const onlineManager = new Environment(
  () => true,
  notify => {
    if (typeof window === 'undefined') return () => {};
    const online = () => notify(true), offline = () => notify(false);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  },
);
onlineManager.isOnline = () => onlineManager.current();
onlineManager.setOnline = value => onlineManager.set(value);

export const isServer = typeof window === 'undefined';
export const skipToken = Symbol('skipToken');
export const functionalUpdate = (updater, value) => typeof updater === 'function' ? updater(value) : updater;
const plain = value => value !== null && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export function hashKey(key) {
  return JSON.stringify(key, (_, value) => {
    if (!plain(value)) return value;
    const keys = Object.keys(value);
    return keys.length < 2 ? value : Object.fromEntries(keys.sort().map(name => [name, value[name]]));
  });
}

export function partialMatchKey(value, pattern) {
  if (value === pattern) return true;
  if (!value || !pattern || typeof value !== 'object' || typeof pattern !== 'object') return false;
  return Object.keys(pattern).every(key => partialMatchKey(value[key], pattern[key]));
}

// Share unchanged JSON-shaped branches. Exotic instances keep their identity
// from the new value; no getter is invoked twice by a stringification pass.
const writeOwn = (target, key, value) => Object.defineProperty(target, key, {value, enumerable: true, writable: true, configurable: true});
export function replaceEqualDeep(before, after) {
  if (before === after) return before;
  const arrays = Array.isArray(before) && Array.isArray(after);
  if (!arrays && !(plain(before) && plain(after))) return after;
  const keys = Object.keys(after);
  let result = keys.length !== Object.keys(before).length || arrays && before.length !== after.length
    ? (arrays ? new Array(after.length) : {}) : undefined;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i], previous = before[key];
    const value = replaceEqualDeep(previous, after[key]);
    if (!result && (!Object.hasOwn(before, key) || value !== previous)) {
      result = arrays ? new Array(after.length) : {};
      for (let j = 0; j < i; j++) writeOwn(result, keys[j], before[keys[j]]);
    }
    if (result) writeOwn(result, key, value);
  }
  return result ?? before;
}

export const enabled = (options, query) => options.queryFn !== skipToken && (typeof options.enabled === 'function' ? options.enabled(query) : options.enabled) !== false;
export const staleTime = (options, query) => typeof options.staleTime === 'function' ? options.staleTime(query) : options.staleTime ?? 0;
export const shallowEqualObjects = (a, b) => a === b || Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);

let batchDepth = 0, queue = [], scheduler = fn => setTimeout(fn, 0), notify = fn => fn(), batched = fn => fn();
export const notifyManager = {
  batch(fn) { batchDepth++; try { return fn(); } finally { if (--batchDepth === 0 && queue.length) { const pending = queue; queue = []; scheduler(() => batched(() => pending.forEach(fn => notify(fn)))); } } },
  schedule(fn) { if (batchDepth) queue.push(fn); else scheduler(() => notify(fn)); },
  batchCalls(fn) { return (...args) => this.schedule(() => fn(...args)); },
  setScheduler(fn) { scheduler = fn; }, setNotifyFunction(fn) { notify = fn; }, setBatchNotifyFunction(fn) { batched = fn; },
};

export class CancelledError extends Error {
  constructor(options = {}) { super('CancelledError'); this.revert = options.revert; this.silent = options.silent; }
}
export const isCancelledError = error => error instanceof CancelledError;
