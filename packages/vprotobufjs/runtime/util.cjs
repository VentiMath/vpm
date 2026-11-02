"use strict";
// Independent support code for generated messages. Wire integers use vlong;
// browser string/float operations use the platform codecs and typed arrays.
const Long = require("vlong");
const util = (module.exports = {
  Long,
  global: globalThis,
  Array: Uint8Array,
  isNode: typeof process === "object" && !!process.versions?.node,
  Buffer: typeof Buffer === "function" ? Buffer : null,
  emptyArray: Object.freeze([]),
  emptyObject: Object.freeze({}),
  recursionLimit: 100,
  isInteger: Number.isInteger,
  isString: (x) => typeof x === "string" || x instanceof String,
  isObject: (x) => x !== null && typeof x === "object",
  isUnsafeProperty: (x) =>
    x === "__proto__" || x === "constructor" || x === "prototype",
  key2Re: /^(?:true|false|0|1)$/,
  key32Re: /^-?(?:0|[1-9][0-9]*)$/,
  key64Re: /^(?:[\x00-\xff]{8}|-?(?:0|[1-9][0-9]*))$/,
  toJSONOptions: { longs: String, enums: String, bytes: String, json: true },
  lcFirst: (x) => x[0].toLowerCase() + x.slice(1),
  ucFirst: (x) => x[0].toUpperCase() + x.slice(1),
  toArray: (x) => Object.values(x || {}),
  merge: (a, b, onlyMissing) => {
    for (const k of Object.keys(b || {}))
      if (!onlyMissing || a[k] === undefined) put(a, k, b[k]);
    return a;
  },
  isSet: (o, k) =>
    Object.hasOwn(o, k) &&
    o[k] != null &&
    (typeof o[k] !== "object" || Object.keys(o[k]).length > 0),
});
function put(o, k, v) {
  if (k === "__proto__")
    Object.defineProperty(o, k, {
      value: v,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  else o[k] = v;
  return v;
}
util.put = put;
util.isset = util.isSet;
util.makeProp = (o, k, enumerable = true) => {
  if (!Object.hasOwn(o, k))
    Object.defineProperty(o, k, {
      writable: true,
      configurable: true,
      enumerable,
    });
};
util.newBuffer = (x = 0) =>
  util.Buffer
    ? typeof x === "number"
      ? util.Buffer.allocUnsafe(x)
      : util.Buffer.from(x)
    : new Uint8Array(x);
const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { ignoreBOM: true });
util.utf8 = {
  length: (s) =>
    util.Buffer ? util.Buffer.byteLength(s) : encoder.encode(s).length,
  write: (s, b, p) => {
    const v = encoder.encode(s);
    b.set(v, p);
    return v.length;
  },
  read: (b, s, e) => decoder.decode(b.subarray(s, e)),
};
util.base64 = {
  encode: (b, s, e) => {
    if (util.Buffer)
      return util.Buffer.from(b.buffer, b.byteOffset + s, e - s).toString(
        "base64",
      );
    const chunks = [];
    for (let p = s; p < e; p += 16384)
      chunks.push(
        String.fromCharCode(...b.subarray(p, Math.min(p + 16384, e))),
      );
    return btoa(chunks.join(""));
  },
  decode: (s, b, p) => {
    const v = util.Buffer
      ? util.Buffer.from(s, "base64")
      : Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    b.set(v, p);
    return v.length;
  },
  length: (s) =>
    util.Buffer ? util.Buffer.from(s, "base64").length : atob(s).length,
  test: (s) =>
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s),
};
util.float = {};
for (const [name, size] of [
  ["Float", 4],
  ["Double", 8],
])
  for (const [suffix, le] of [
    ["LE", true],
    ["BE", false],
  ]) {
    util.float["read" + name + suffix] = (b, p) =>
      new DataView(b.buffer, b.byteOffset, b.byteLength)["getFloat" + size * 8](
        p,
        le,
      );
    util.float["write" + name + suffix] = (v, b, p) =>
      new DataView(b.buffer, b.byteOffset, b.byteLength)["setFloat" + size * 8](
        p,
        v,
        le,
      );
  }
class LongBits {
  constructor(lo, hi) {
    this.lo = lo >>> 0;
    this.hi = hi >>> 0;
  }
  static from(v) {
    if (typeof v === "string" || v instanceof String)
      v = Long.fromString(String(v));
    else if (typeof v === "number") v = Long.fromNumber(v);
    else if (typeof v === "bigint") v = Long.fromString(String(v));
    return v?.low || v?.high ? new LongBits(v.low, v.high) : LongBits.zero;
  }
  static fromNumber(v) {
    return LongBits.from(v);
  }
  static fromHash(s) {
    let lo = 0,
      hi = 0;
    for (let i = 0; i < 4; i++) {
      lo |= s.charCodeAt(i) << (i * 8);
      hi |= s.charCodeAt(i + 4) << (i * 8);
    }
    return new LongBits(lo, hi);
  }
  static _configure() {}
  toLong(unsigned = false) {
    return util.Long
      ? util.Long.fromBits(this.lo, this.hi, unsigned)
      : this.toNumber(unsigned);
  }
  toNumber(unsigned = false) {
    return (unsigned ? this.hi : this.hi | 0) * 4294967296 + this.lo;
  }
  toHash() {
    let s = "";
    for (let i = 0; i < 8; i++)
      s += String.fromCharCode(
        ((i < 4 ? this.lo : this.hi) >>> ((i % 4) * 8)) & 255,
      );
    return s;
  }
  zzEncode() {
    if (this === LongBits.zero) return this;
    const sign = this.hi >> 31;
    this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ sign) >>> 0;
    this.lo = ((this.lo << 1) ^ sign) >>> 0;
    return this;
  }
  zzDecode() {
    if (this === LongBits.zero) return this;
    const sign = -(this.lo & 1);
    this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ sign) >>> 0;
    this.hi = ((this.hi >>> 1) ^ sign) >>> 0;
    return this;
  }
  length() {
    let lo = this.lo,
      hi = this.hi,
      n = 1;
    while (hi || lo > 127) {
      lo = ((lo >>> 7) | (hi << 25)) >>> 0;
      hi >>>= 7;
      n++;
    }
    return n;
  }
}
Object.defineProperty(LongBits, "zero", {
  value: Object.freeze(new LongBits(0, 0)),
  enumerable: true,
});
LongBits.zeroHash = "\0".repeat(8);
util.LongBits = LongBits;
util.longToHash = (v) => LongBits.from(v).toHash();
util.longFromHash = (s, u) => LongBits.fromHash(s).toLong(u);
util.longFromKey = (s, u) => (/^-?\d+$/.test(s) ? s : util.longFromHash(s, u));
util.boolFromKey = (s) => s === "true" || s === "1";
util.oneOfGetter = (names) =>
  function () {
    const keys = Object.keys(this);
    for (let i = keys.length - 1; i >= 0; i--)
      if (names.includes(keys[i]) && this[keys[i]] != null) return keys[i];
  };
util.oneOfSetter = (names) =>
  function (name) {
    for (const k of names) if (k !== name) delete this[k];
  };
util.ProtocolError = class ProtocolError extends Error {
  constructor(message, properties) {
    super(message);
    this.name = "ProtocolError";
    Object.assign(this, properties);
  }
};
util.newError = (name) =>
  class extends Error {
    constructor(message, properties) {
      super(message);
      this.name = name;
      Object.assign(this, properties);
    }
  };
util.EventEmitter = class EventEmitter {
  constructor() {
    this._listeners = Object.create(null);
  }
  on(e, f, ctx) {
    (this._listeners[e] ||= []).push([f, ctx]);
    return this;
  }
  off(e, f) {
    if (e === undefined) this._listeners = Object.create(null);
    else if (f)
      this._listeners[e] = (this._listeners[e] || []).filter((x) => x[0] !== f);
    else delete this._listeners[e];
    return this;
  }
  emit(e, ...args) {
    for (const [f, ctx] of [...(this._listeners[e] || [])])
      f.apply(ctx || this, args);
    return this;
  }
};
util.asPromise = (fn, ctx, ...args) =>
  new Promise((resolve, reject) =>
    fn.call(ctx, ...args, (e, v) => (e ? reject(e) : resolve(v))),
  );
util.pool = (alloc) => alloc;
util.rawField = (id, wire, data) => {
  let n = (id * 8 + wire) >>> 0,
    a = [];
  do {
    a.push((n & 127) | (n > 127 ? 128 : 0));
    n >>>= 7;
  } while (n);
  return util.newBuffer([...a, ...data]);
};
