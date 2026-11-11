"use strict";
const defaults = {
  maxSnack: 3,
  autoHideDuration: 5000,
  variant: "default",
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transitionDuration: { enter: 225, exit: 195 },
};
const own = (o, k) => Object.hasOwn(o, k) && o[k] !== undefined;
function config(props = {}) {
  const c = { ...defaults, ...props };
  if (!Number.isInteger(c.maxSnack) || c.maxSnack < 1)
    throw new RangeError("maxSnack must be a positive integer");
  if (c.TransitionComponent || c.TransitionProps)
    throw new TypeError(
      "Custom transition components are outside the notification scope",
    );
  return c;
}
function duration(value, name) {
  if (value !== null && (!Number.isFinite(value) || value < 0))
    throw new RangeError(name + " must be null or finite and nonnegative");
}
function callbacks(a, b, ...args) {
  let error,
    failed = false;
  for (const fn of [a, b])
    if (typeof fn === "function")
      try {
        fn(...args);
      } catch (e) {
        if (!failed) {
          failed = true;
          error = e;
        }
      }
  if (failed) throw error;
}
class Queue {
  constructor(props = {}, changed = () => {}) {
    this.props = config(props);
    this.changed = changed;
    this.visible = [];
    this.pending = [];
    this.serial = 0;
    this.disposed = false;
  }
  configure(props) {
    const max = this.props.maxSnack;
    this.props = config(props);
    if (max !== this.props.maxSnack) this.advance();
  }
  enqueue(message, options = {}) {
    if (this.disposed) throw new Error("SnackbarProvider is unmounted");
    if (
      message &&
      typeof message === "object" &&
      !message.$$typeof &&
      !Array.isArray(message)
    ) {
      options = message;
      message = options.message;
    }
    if (message == null) throw new TypeError("A snackbar message is required");
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new TypeError("Snackbar options must be an object");
    const { children, domRoot, ...shared } = this.props;
    const opts = { ...shared, ...options };
    if (opts.TransitionComponent || opts.TransitionProps)
      throw new TypeError(
        "Custom transition components are outside the notification scope",
      );
    duration(opts.autoHideDuration, "autoHideDuration");
    const t = opts.transitionDuration;
    if (typeof t === "number") duration(t, "transitionDuration");
    else {
      if (!t || typeof t !== "object")
        throw new TypeError("invalid transitionDuration");
      duration(t.enter ?? 225, "enter duration");
      duration(t.exit ?? 195, "exit duration");
    }
    const origin = { ...opts.anchorOrigin };
    if (
      !["top", "bottom"].includes(origin.vertical) ||
      !["left", "center", "right"].includes(origin.horizontal)
    )
      throw new TypeError("invalid anchorOrigin");
    const explicit = own(options, "key");
    let id = explicit ? options.key : `vns-${++this.serial}`;
    if (
      typeof id !== "string" &&
      (typeof id !== "number" || !Number.isFinite(id))
    )
      throw new TypeError("key must be a string or finite number");
    const all = [...this.visible, ...this.pending];
    if (!explicit)
      while (all.some((x) => x.id === id)) id = `vns-${++this.serial}`;
    if (
      all.some((x) => x.id === id) ||
      (opts.preventDuplicate &&
        all.some((x) => (explicit ? x.id === id : x.message === message)))
    )
      return id;
    const entry = {
      id,
      message,
      options: {
        ...opts,
        anchorOrigin: origin,
        style: opts.style && { ...opts.style },
        SnackbarProps: opts.SnackbarProps && { ...opts.SnackbarProps },
        transitionDuration: typeof t === "object" ? { ...t } : t,
      },
      callbacks: { ...options },
      providerCallbacks: { ...this.props },
      open: true,
      entered: false,
      requested: null,
      closed: false,
    };
    this.pending.push(entry);
    this.advance();
    return id;
  }
  advance() {
    if (this.disposed) return;
    while (this.pending.length && this.visible.length < this.props.maxSnack)
      this.visible.push(this.pending.shift());
    if (this.pending.length || this.visible.length > this.props.maxSnack) {
      if (!this.visible.some((x) => x.closed || x.requested)) {
        const victim =
          this.visible.find((x) => !x.options.persist) || this.visible[0];
        if (victim) this.request(victim, "maxsnack");
      }
    }
    this.changed();
  }
  request(entry, reason, event = null, key) {
    if (arguments.length < 4) key = entry.id;
    if (
      this.disposed ||
      !this.visible.includes(entry) ||
      entry.closed ||
      entry.requested
    )
      return;
    if (!entry.entered) {
      entry.requested = { reason, event, key };
      return;
    }
    entry.closed = true;
    entry.open = false;
    try {
      callbacks(
        entry.callbacks.onClose,
        entry.providerCallbacks.onClose,
        event,
        reason,
        key,
      );
    } finally {
      this.changed();
    }
  }
  entered(entry) {
    if (!this.visible.includes(entry) || this.disposed) return;
    entry.entered = true;
    if (entry.requested) {
      const request = entry.requested;
      entry.requested = null;
      this.request(entry, request.reason, request.event, request.key);
    }
  }
  close(key) {
    if (this.disposed) return;
    this.pending = this.pending.filter(
      (x) => key !== undefined && x.id !== key,
    );
    let error,
      failed = false;
    for (const entry of [...this.visible])
      if (key === undefined || entry.id === key)
        try {
          this.request(entry, "instructed", null, key);
        } catch (e) {
          if (!failed) {
            failed = true;
            error = e;
          }
        }
    this.changed();
    if (failed) throw error;
  }
  exited(entry) {
    if (this.disposed) return;
    this.visible = this.visible.filter((x) => x !== entry);
    this.advance();
  }
  lifecycle(entry, name, ...args) {
    callbacks(
      entry.callbacks[name],
      entry.providerCallbacks[name],
      ...args,
      entry.id,
    );
  }
  dispose() {
    this.disposed = true;
    this.visible = [];
    this.pending = [];
  }
}
// Pause reasons overlap: leaving hover must not resume while the tab is blurred.
class Deadline {
  constructor(close, delay, clock = globalThis) {
    this.close = close;
    this.delay = delay;
    this.clock = clock;
    this.reasons = new Set();
    this.stopped = false;
    this.timer = null;
  }
  arm(delay = this.delay) {
    this.clear();
    if (!this.stopped && delay !== null && !this.reasons.size)
      this.timer = this.clock.setTimeout(() => {
        this.timer = null;
        this.close();
      }, delay);
  }
  clear() {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
  }
  pause(reason) {
    this.reasons.add(reason);
    this.clear();
  }
  resume(reason) {
    if (this.reasons.delete(reason) && !this.reasons.size)
      this.arm(this.delay === null ? null : this.delay / 2);
  }
  stop() {
    this.stopped = true;
    this.clear();
    this.reasons.clear();
  }
}
module.exports = { Queue, Deadline };
