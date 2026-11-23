"use strict";
const process = require("node:process");
const { EventEmitter } = require("node:events"),
  { StringDecoder } = require("node:string_decoder");
const destroyedEvent = Symbol("destroyed");
const terminal = new Set(["end", "prefinish", "finish"]);
const unwritablePipe = require("node:stream").Writable.prototype.pipe;
const isReadable = (s) =>
  !!s &&
  typeof s.on === "function" &&
  typeof s.pipe === "function" &&
  s.pipe !== unwritablePipe;
const isWritable = (s) =>
  !!s &&
  typeof s.on === "function" &&
  typeof s.write === "function" &&
  typeof s.end === "function";
const isStream = (s) => s instanceof Minipass || isReadable(s) || isWritable(s);
class Minipass extends EventEmitter {
  static isStream = isStream;
  constructor(options = {}) {
    super();
    this._objects = !!options.objectMode;
    this._encoding =
      this._objects || options.encoding === "buffer"
        ? null
        : options.encoding || null;
    this._decoder = this._encoding ? new StringDecoder(this._encoding) : null;
    this._async = !!options.async;
    this._queue = [];
    this._head = 0;
    this._length = 0;
    this._flow = false;
    this._paused = false;
    this._ending = false;
    this._ended = false;
    this._destroyed = false;
    this._aborted = false;
    this._scheduled = false;
    this._flushing = false;
    this._endingEvents = false;
    this._error = undefined;
    this._hasError = false;
    this._closed = false;
    this._deferClose = false;
    this.pipes = [];
    this.readable = true;
    this.writable = true;
    this._signal = options.signal;
    if (this._signal) {
      this._abort = () => {
        this._aborted = true;
        this.emit("abort", this._signal.reason);
        this.destroy(this._signal.reason);
      };
      if (this._signal.aborted) this._abort();
      else this._signal.addEventListener("abort", this._abort, { once: true });
    }
  }
  get bufferLength() {
    return this._length;
  }
  get encoding() {
    return this._encoding;
  }
  set encoding(_) {
    throw new Error("Encoding must be set at instantiation time");
  }
  setEncoding(_) {
    throw new Error("Encoding must be set at instantiation time");
  }
  get objectMode() {
    return this._objects;
  }
  set objectMode(_) {
    throw new Error("Object mode must be set at instantiation time");
  }
  get async() {
    return this._async;
  }
  set async(value) {
    if (value) this._async = true;
  }
  get aborted() {
    return this._aborted;
  }
  set aborted(_) {}
  get destroyed() {
    return this._destroyed;
  }
  get flowing() {
    return this._flow;
  }
  get paused() {
    return this._paused;
  }
  get emittedEnd() {
    return this._ended;
  }
  _later(fn) {
    if (this._async) queueMicrotask(fn);
    else fn();
  }
  on(event, listener) {
    super.on(event, listener);
    if (event === "data" && !this._flow && !this._destroyed) this.resume();
    else if (terminal.has(event) && this._ended && !this._endingEvents)
      this._later(() => {
        if (this.rawListeners(event).includes(listener)) {
          this.removeListener(event, listener);
          listener.call(this);
        }
      });
    else if (event === "error" && this._hasError)
      this._later(() => listener(this._error));
    else if (event === "readable" && this._length) this.emit("readable");
    return this;
  }
  addListener(event, listener) {
    return this.on(event, listener);
  }
  removeListener(event, listener) {
    super.removeListener(event, listener);
    if (event === "data" && !this.listenerCount("data") && !this.pipes.length)
      this._flow = false;
    return this;
  }
  off(event, listener) {
    return this.removeListener(event, listener);
  }
  removeAllListeners(event) {
    super.removeAllListeners(event);
    if ((event === undefined || event === "data") && !this.pipes.length)
      this._flow = false;
    return this;
  }
  emit(event, ...args) {
    if (
      this._destroyed &&
      event !== "error" &&
      event !== "close" &&
      event !== destroyedEvent
    )
      return false;
    if (event === "end") {
      if (this._ended) return false;
      this._ended = true;
      this.readable = false;
      this._detachAbort();
      try {
        return super.emit(event, ...args);
      } finally {
        super.removeAllListeners("end");
        super.removeAllListeners("data");
      }
    }
    if (event === "error") {
      this._hasError = true;
      this._error = args[0];
      if (this._signal && !this.listenerCount("error")) return false;
    }
    if (event === "close") {
      if (this._closed) return false;
      if (!this._ended && !this._destroyed) {
        this._deferClose = true;
        return false;
      }
      this._closed = true;
    }
    const result = super.emit(event, ...args);
    if (event === "error") this._finish();
    return result;
  }
  _chunk(chunk, encoding) {
    if (this._objects) return chunk;
    if (typeof chunk === "string") {
      const inputEncoding = encoding || "utf8";
      if (
        this._decoder &&
        inputEncoding === this._encoding &&
        !this._decoder.lastNeed
      )
        return chunk;
      chunk = Buffer.from(chunk, inputEncoding);
    } else if (Buffer.isBuffer(chunk)) {
    } else if (ArrayBuffer.isView(chunk))
      chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    else if (
      ["[object ArrayBuffer]", "[object SharedArrayBuffer]"].includes(
        Object.prototype.toString.call(chunk),
      )
    )
      chunk = Buffer.from(chunk);
    else
      throw new TypeError(
        "Non-contiguous data written to non-objectMode stream",
      );
    return this._decoder ? this._decoder.write(chunk) : chunk;
  }
  write(chunk, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = undefined;
    }
    if (this._aborted) return false;
    if (this._destroyed) {
      this.emit(
        "error",
        Object.assign(
          new Error("Cannot call write after a stream was destroyed"),
          { code: "ERR_STREAM_DESTROYED" },
        ),
      );
      return true;
    }
    if (this._ending) throw new Error("write after end");
    const value = this._chunk(chunk, encoding);
    if (this._objects || value.length) {
      if (this._flow && !this._async && !this._length && !this._flushing)
        this._deliver(value);
      else {
        this._queue.push(value);
        this._length += this._objects ? 1 : value.length;
        if (!this._flow) this.emit("readable");
        this._kick();
      }
    } else if (this._length && !this._flow) this.emit("readable");
    if (callback) this._later(callback);
    return this._flow;
  }
  _deliver(chunk) {
    // Snapshot destinations so a reentrant unpipe cannot skip another receiver.
    if (this.pipes.length)
      for (const pipe of this.pipes.slice())
        if (this.pipes.includes(pipe) && pipe.dest.write(chunk) === false)
          this.pause();
    this.emit("data", chunk);
  }
  _take() {
    const chunk = this._queue[this._head++];
    this._length -= this._objects ? 1 : chunk.length;
    if (this._head === this._queue.length) {
      this._queue = [];
      this._head = 0;
    } else if (this._head > 1024 && this._head * 2 > this._queue.length) {
      this._queue = this._queue.slice(this._head);
      this._head = 0;
    }
    return chunk;
  }
  _kick() {
    if (this._async) {
      if (this._scheduled) return;
      this._scheduled = true;
      queueMicrotask(() => {
        this._scheduled = false;
        this._flush();
      });
    } else this._flush();
  }
  _flush() {
    if (this._flushing || this._destroyed) return;
    this._flushing = true;
    const buffered = this._length > 0;
    try {
      while (this._flow && this._length && !this._destroyed)
        this._deliver(this._take());
    } finally {
      this._flushing = false;
    }
    if (buffered && !this._length && !this._ending && !this._destroyed)
      this.emit("drain");
    this._finish();
  }
  _finish() {
    if (
      !this._ending ||
      this._length ||
      this._paused ||
      this._ended ||
      this._destroyed
    )
      return;
    this._endingEvents = true;
    try {
      this.emit("end");
      if (!this._ended) return;
      for (const pipe of this.pipes.slice()) {
        this.unpipe(pipe.dest);
        if (pipe.opts.end !== false) pipe.dest.end();
      }
      this.emit("prefinish");
      super.removeAllListeners("prefinish");
      this.emit("finish");
      super.removeAllListeners("finish");
    } finally {
      this._endingEvents = false;
    }
    if (this._deferClose) this.emit("close");
  }
  read(n) {
    if (this._destroyed || !this._length || n === 0) {
      this._finish();
      return null;
    }
    let result;
    if (this._objects) result = this._take();
    else {
      const wanted = n == null ? this._length : n;
      if (wanted < 0 || wanted > this._length || !Number.isFinite(wanted))
        return null;
      const count = Math.floor(wanted),
        parts = [];
      let left = count;
      while (left > 0) {
        const chunk = this._queue[this._head];
        if (chunk.length <= left) {
          parts.push(this._take());
          left -= chunk.length;
        } else {
          parts.push(chunk.slice(0, left));
          this._queue[this._head] = chunk.slice(left);
          this._length -= left;
          left = 0;
        }
      }
      result =
        parts.length === 1
          ? parts[0]
          : this._encoding
            ? parts.join("")
            : Buffer.concat(parts, count);
    }
    this._deliver(result);
    if (!this._length && !this._ending) this.emit("drain");
    this._finish();
    return result;
  }
  end(chunk, encoding, callback) {
    if (typeof chunk === "function") {
      callback = chunk;
      chunk = undefined;
    } else if (typeof encoding === "function") {
      callback = encoding;
      encoding = undefined;
    }
    if (callback) this.once("end", callback);
    if (this._ending || this._destroyed) return this;
    if (chunk !== undefined && chunk !== null) this.write(chunk, encoding);
    if (this._decoder && !this._decoderEnded) {
      this._decoderEnded = true;
      const last = this._decoder.end();
      if (last) {
        this._queue.push(last);
        this._length += last.length;
      }
    }
    this.writable = false;
    this._ending = true;
    this._kick();
    return this;
  }
  pause() {
    this._paused = true;
    this._flow = false;
  }
  resume() {
    if (this._destroyed) return;
    const buffered = this._length > 0;
    this._flow = true;
    this._paused = false;
    this.emit("resume");
    this._kick();
    if (!buffered && !this._ending && !this._flushing && !this._destroyed)
      this.emit("drain");
  }
  pipe(dest, opts = {}) {
    if (this._destroyed) return dest;
    if (dest === process.stdout || dest === process.stderr)
      opts = { ...opts, end: false };
    const record = {
      src: this,
      dest,
      opts: { ...opts },
      ondrain: () => this.resume(),
    };
    record.onerror = (error) => dest.emit("error", error);
    record.unpipe = () => this.unpipe(dest);
    this.pipes.push(record);
    dest.on("drain", record.ondrain);
    if (opts.proxyErrors) this.on("error", record.onerror);
    if (this._ended) {
      this.unpipe(dest);
      if (opts.end !== false) dest.end();
    } else this.resume();
    return dest;
  }
  unpipe(dest) {
    for (const pipe of this.pipes.slice())
      if (!dest || pipe.dest === dest) {
        this.pipes.splice(this.pipes.indexOf(pipe), 1);
        pipe.dest.removeListener("drain", pipe.ondrain);
        if (pipe.opts.proxyErrors) this.removeListener("error", pipe.onerror);
      }
    if (!this.pipes.length && !this.listenerCount("data")) this._flow = false;
  }
  _detachAbort() {
    if (this._signal && this._abort)
      this._signal.removeEventListener("abort", this._abort);
  }
  destroy(error) {
    if (!this._destroyed) {
      this._destroyed = true;
      this._queue = [];
      this._head = 0;
      this._length = 0;
      this._flow = false;
      this._detachAbort();
      this.unpipe();
      if (typeof this.close === "function" && !this._closed) this.close();
    }
    if (error !== undefined) this.emit("error", error);
    this.emit(destroyedEvent);
    return this;
  }
  promise() {
    return new Promise((resolve, reject) => {
      const clean = () => {
        this.removeListener("end", done);
        this.removeListener("error", fail);
        this.removeListener(destroyedEvent, dead);
      };
      const done = () => {
          clean();
          resolve();
        },
        fail = (e) => {
          clean();
          reject(e);
        },
        dead = () => fail(new Error("stream destroyed"));
      if (this._hasError) {
        reject(this._error);
        return;
      }
      if (this._ended) {
        resolve();
        return;
      }
      super.on("end", done);
      super.on("error", fail);
      super.on(destroyedEvent, dead);
      if (this._destroyed) queueMicrotask(dead);
    });
  }
  collect() {
    const chunks = [];
    chunks.dataLength = 0;
    const add = (chunk) => {
      chunks.push(chunk);
      if (!this._objects) chunks.dataLength += chunk.length;
    };
    const promise = this.promise();
    if (!this._ended && !this._destroyed) this.on("data", add);
    return promise.then(
      () => {
        this.removeListener("data", add);
        return chunks;
      },
      (e) => {
        this.removeListener("data", add);
        throw e;
      },
    );
  }
  concat() {
    if (this._objects)
      return Promise.reject(new Error("cannot concat in objectMode"));
    return this.collect().then((chunks) =>
      this._encoding
        ? chunks.join("")
        : Buffer.concat(chunks, chunks.dataLength),
    );
  }
  *[Symbol.iterator]() {
    while (this._length) {
      const value = this.read();
      this.pause();
      yield value;
    }
    this.pause();
  }
  [Symbol.asyncIterator]() {
    const stream = this,
      waiters = new Set();
    this.pause();
    let stopped = false;
    return {
      async next() {
        while (!stopped) {
          stream._paused = false;
          if (stream._hasError) throw stream._error;
          if (stream._destroyed) throw new Error("stream destroyed");
          if (stream._length) return { value: stream.read(), done: false };
          if (stream._ended) return { done: true, value: undefined };
          await new Promise((resolve, reject) => {
            const clean = () => {
              waiters.delete(ready);
              stream.removeListener("readable", ready);
              stream.removeListener("end", ready);
              stream.removeListener("error", error);
              stream.removeListener(destroyedEvent, dead);
            };
            const ready = () => {
                clean();
                resolve();
              },
              error = (e) => {
                clean();
                reject(e);
              },
              dead = () => error(new Error("stream destroyed"));
            waiters.add(ready);
            EventEmitter.prototype.on.call(stream, "readable", ready);
            EventEmitter.prototype.on.call(stream, "end", ready);
            EventEmitter.prototype.on.call(stream, "error", error);
            EventEmitter.prototype.on.call(stream, destroyedEvent, dead);
            if (stream._ending) {
              stream._paused = false;
              stream._finish();
            }
          });
        }
        return { done: true, value: undefined };
      },
      async return() {
        stopped = true;
        for (const ready of waiters) ready();
        stream.pause();
        return { done: true, value: undefined };
      },
      throw() {
        return this.return();
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
}
module.exports = { Minipass, isStream, isReadable, isWritable };
