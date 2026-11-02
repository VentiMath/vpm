"use strict";
const identity = (value) => value;
const noop = () => {};
exports.createMedium = function createMedium(
  defaultValue,
  transform = identity,
) {
  let head,
    tail,
    receiver,
    mode = 0,
    flushing = false,
    scheduled = false;
  function deliver() {
    const batch = head,
      accept = receiver;
    head = tail = undefined;
    // Detach a snapshot before callbacks. New entries belong to the next batch.
    for (let entry = batch; entry; entry = entry.next) {
      entry.pending = false;
      entry.previous = undefined;
    }
    let entry = batch;
    try {
      while (entry) {
        const next = entry.next,
          value = entry.value;
        entry.next = undefined;
        entry.value = undefined;
        entry = next;
        accept(value);
      }
    } finally {
      // A retained cleanup closure must not retain the rest of a delivered batch.
      while (entry) {
        const next = entry.next;
        entry.next = undefined;
        entry.value = undefined;
        entry = next;
      }
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      deliver();
    });
  }
  function assign(callback, nextMode) {
    receiver = callback;
    mode = nextMode;
    flushing = true;
    try {
      deliver();
      if (mode === 1) while (head) deliver();
    } finally {
      flushing = false;
    }
    if (head && mode === 2) schedule();
  }
  return {
    read() {
      if (mode) throw Error("Sidecar: cannot read an assigned medium");
      return tail ? tail.value : defaultValue;
    },
    useMedium(input) {
      const value = transform(input, mode !== 0);
      if (mode === 1 && !flushing) {
        receiver(value);
        return noop;
      }
      const entry = { value, previous: tail, next: undefined, pending: true };
      if (tail) tail.next = entry;
      else head = entry;
      tail = entry;
      if (mode === 2 && !flushing) schedule();
      return () => {
        if (!entry.pending) return;
        entry.pending = false;
        if (entry.previous) entry.previous.next = entry.next;
        else head = entry.next;
        if (entry.next) entry.next.previous = entry.previous;
        else tail = entry.previous;
        entry.next = entry.previous = entry.value = undefined;
      };
    },
    assignMedium(callback) {
      assign(callback, 2);
    },
    assignSyncMedium(callback) {
      assign(callback, 1);
    },
  };
};
exports.createSidecarMedium = function createSidecarMedium(options) {
  return Object.assign(exports.createMedium(null), {
    options: { async: true, ssr: false, ...options },
  });
};
