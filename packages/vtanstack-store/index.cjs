"use strict";
// Detached computations pull dependency versions. Only live subscriptions
// retain reverse edges; immutable listener lists also serve as wave snapshots.
let epoch = 0,
  collector = null,
  depth = 0,
  flushing = false;
const pending = [],
  work = [];
const EMPTY = [];
function toObserver(value, error, complete) {
  if (typeof value === "function" || value == null)
    return { next: value, error, complete };
  return {
    next: value.next?.bind(value),
    error: value.error?.bind(value),
    complete: value.complete?.bind(value),
  };
}
function attach(n, user) {
  if (n.users.includes(user)) return;
  if (n.users === EMPTY) n.users = [];
  n.users.push(user);
  if (n.watch++ === 0) for (const dep of n.deps) attach(dep, n);
}
function detach(n, user) {
  const index = n.users.indexOf(user);
  if (index < 0) return;
  n.users.splice(index, 1);
  if (--n.watch === 0) for (const dep of n.deps) detach(dep, n);
}
function invalidate(n) {
  work.push(n);
  while (work.length) {
    const current = work.pop();
    if (current.listeners.length && !current.queued) {
      current.queued = true;
      pending.push(current);
    }
    if (current.users)
      for (const user of current.users)
        if (!user.dirty) {
          user.dirty = true;
          work.push(user);
        }
  }
}
function evaluate(n) {
  if (!n.compute || (n.ready && !n.dirty && (n.watch || n.epoch === epoch)))
    return;
  if (n.evaluating) throw new Error("Circular atom dependency");
  n.evaluating = true;
  try {
    let changed = !n.ready;
    for (let i = 0; i < n.deps.length; i++) {
      const dep = n.deps[i];
      if (
        dep.compute &&
        (!dep.ready || dep.dirty || (!dep.watch && dep.epoch !== epoch))
      )
        evaluate(dep);
      if (dep.version !== n.versions[i]) changed = true;
    }
    if (changed) {
      const before = collector;
      collector = n;
      n.cursor = 0;
      n.collect = n.collectVersions = null;
      let value,
        error,
        failed = false;
      try {
        value = n.compute(n.value);
      } catch (e) {
        failed = true;
        error = e;
      } finally {
        collector = before;
      }
      let next = n.collect;
      if (!next && n.cursor < n.deps.length) {
        next = n.deps.slice(0, n.cursor);
        n.collectVersions = n.versions.slice(0, n.cursor);
      }
      if (next) {
        if (n.watch) {
          for (const dep of n.deps) if (!next.includes(dep)) detach(dep, n);
          for (const dep of next) if (!n.deps.includes(dep)) attach(dep, n);
        }
        n.deps = next;
        n.versions = n.collectVersions;
      }
      n.collect = n.collectVersions = null;
      if (failed) {
        if (!n.failed || n.error !== error) n.version++;
        n.failed = true;
        n.error = error;
      } else {
        if (!n.ready || n.failed || !n.compare(n.value, value)) {
          n.value = value;
          n.version++;
        }
        n.failed = false;
        n.error = undefined;
      }
      n.ready = true;
    }
    n.dirty = false;
    n.epoch = epoch;
  } finally {
    n.evaluating = false;
  }
}
function read(n) {
  if (n.compute && (!n.ready || n.dirty || (!n.watch && n.epoch !== epoch)))
    evaluate(n);
  if (collector) {
    // Reuse the dependency list for the common unchanged read order. Allocate
    // only when a computation actually switches or drops a dependency branch.
    const owner = collector,
      index = owner.cursor;
    if (!owner.collect && owner.deps[index] === n) {
      owner.versions[index] = n.version;
      owner.cursor++;
    } else {
      if (!owner.collect) {
        owner.collect = owner.deps.slice(0, index);
        owner.collectVersions = owner.versions.slice(0, index);
      }
      if (!owner.collect.includes(n)) {
        owner.collect.push(n);
        owner.collectVersions.push(n.version);
      }
    }
  }
  if (n.failed) throw n.error;
  return n.value;
}
function write(n, value) {
  if (n.compare(n.value, value)) return;
  n.value = value;
  n.version++;
  epoch++;
  invalidate(n);
  if (!depth) flush();
}
function flush() {
  if (flushing || depth || !pending.length) return;
  flushing = true;
  const errors = [];
  let start = 0,
    turns = 0;
  try {
    while (start < pending.length) {
      if (++turns > 10000) throw new Error("Atom notifications did not settle");
      const end = pending.length;
      // Resolve a complete wave first. The reusable per-node delivery record is
      // separate from live state, so reentrant writes belong to the following wave.
      for (let i = start; i < end; i++) {
        const n = pending[i];
        n.queued = false;
        try {
          evaluate(n);
          n.deliveryVersion = n.version;
          n.deliveryValue = n.value;
          n.deliveryError = n.error;
          n.deliveryFailed = n.failed;
          n.deliveryListeners = n.listeners;
        } catch (e) {
          n.deliveryListeners = EMPTY;
          errors.push(e);
        }
      }
      for (let i = start; i < end; i++) {
        const n = pending[i],
          version = n.deliveryVersion;
        for (const sub of n.deliveryListeners) {
          if (!sub.live || sub.version === version) continue;
          sub.version = version;
          try {
            if (n.deliveryFailed) {
              if (sub.observer.error) sub.observer.error(n.deliveryError);
              else errors.push(n.deliveryError);
            } else sub.observer.next?.(n.deliveryValue);
          } catch (e) {
            errors.push(e);
          }
        }
        n.deliveryListeners = EMPTY;
        n.deliveryValue = n.deliveryError = undefined;
      }
      start = end;
    }
  } finally {
    for (const n of pending) n.queued = false;
    pending.length = 0;
    flushing = false;
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length) throw new AggregateError(errors, "Atom observers failed");
}
function batch(fn) {
  depth++;
  let error,
    failed = false;
  try {
    fn();
  } catch (e) {
    failed = true;
    error = e;
  } finally {
    depth--;
  }
  if (!depth) {
    try {
      flush();
    } catch (e) {
      if (failed)
        throw new AggregateError([error, e], "Batch and observer failed");
      throw e;
    }
  }
  if (failed) throw error;
}
function make(initial, options, compute, expose) {
  const n = {
    value: initial,
    compute,
    compare: options?.compare ?? Object.is,
    version: 0,
    epoch: -1,
    ready: !compute,
    dirty: !!compute,
    evaluating: false,
    failed: false,
    error: undefined,
    deps: EMPTY,
    versions: EMPTY,
    users: EMPTY,
    listeners: EMPTY,
    watch: 0,
    queued: false,
    cursor: 0,
    collect: null,
    collectVersions: null,
    deliveryVersion: 0,
    deliveryValue: undefined,
    deliveryError: undefined,
    deliveryFailed: false,
    deliveryListeners: EMPTY,
  };
  const atom = {
    get: () => {
      if (
        !collector &&
        !n.failed &&
        (!n.compute || (n.ready && !n.dirty && (n.watch || n.epoch === epoch)))
      )
        return n.value;
      return read(n);
    },
    subscribe(value, error, complete) {
      read(n);
      const sub = {
        observer: toObserver(value, error, complete),
        version: n.version,
        live: true,
      };
      n.listeners = [...n.listeners, sub];
      if (n.watch++ === 0) for (const dep of n.deps) attach(dep, n);
      return {
        unsubscribe() {
          if (!sub.live) return;
          sub.live = false;
          n.listeners = n.listeners.filter((s) => s !== sub);
          if (--n.watch === 0) for (const dep of n.deps) detach(dep, n);
        },
      };
    },
  };
  if (!compute)
    atom.set = (value) =>
      write(n, typeof value === "function" ? value(n.value) : value);
  if (expose) expose(n);
  return atom;
}
function createAtom(value, options) {
  return typeof value === "function"
    ? make(undefined, options, value)
    : make(value, options);
}
function createAsyncAtom(getValue, options) {
  let ticket = 0,
    node;
  return make(
    undefined,
    options,
    () => {
      const own = ++ticket;
      let promise;
      try {
        promise = getValue();
      } catch (e) {
        promise = Promise.reject(e);
      }
      const settle = (value) => {
        evaluate(node);
        if (own === ticket) write(node, value);
      };
      Promise.resolve(promise).then(
        (data) => settle({ status: "done", data }),
        (error) => settle({ status: "error", error }),
      );
      return { status: "pending" };
    },
    (n) => {
      node = n;
    },
  );
}
class ReadonlyStore {
  constructor(value) {
    const atom = createAtom(value);
    this.get = atom.get;
    this.subscribe = atom.subscribe;
  }
  get state() {
    return this.get();
  }
}
class Store {
  constructor(value, actionsFactory) {
    const atom = createAtom(value);
    this.get = atom.get;
    this.subscribe = atom.subscribe;
    this.setState = (updater) => {
      if (!atom.set) throw new TypeError("A computed store cannot be written");
      atom.set(updater);
    };
    this.actions = actionsFactory?.({ get: this.get, setState: this.setState });
  }
  get state() {
    return this.get();
  }
}
function createStore(value, actions) {
  return typeof value === "function"
    ? new ReadonlyStore(value)
    : new Store(value, actions);
}
function shallow(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (a instanceof Date || b instanceof Date)
    return (
      a instanceof Date &&
      b instanceof Date &&
      Object.is(a.getTime(), b.getTime()) &&
      !Number.isNaN(a.getTime())
    );
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size)
      return false;
    for (const [k, v] of a)
      if (!b.has(k) || !Object.is(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size)
      return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const k of keys)
    if (!Object.hasOwn(b, k) || !Object.is(a[k], b[k])) return false;
  return true;
}
module.exports = {
  createAtom,
  createAsyncAtom,
  batch,
  flush,
  Store,
  ReadonlyStore,
  createStore,
  toObserver,
  shallow,
};
