"use strict";
const util = require("./util.cjs");
const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
function length(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw RangeError("length must be a nonnegative safe integer");
  return n;
}
class Reader {
  constructor(buf) {
    if (Array.isArray(buf)) buf = new Uint8Array(buf);
    if (!(buf instanceof Uint8Array)) throw TypeError("illegal buffer");
    this.buf = buf;
    this.pos = 0;
    this.len = buf.length;
    this.discardUnknown = Reader.discardUnknown;
    this.view = null;
  }
  get dataView() {
    return (this.view ||= new DataView(
      this.buf.buffer,
      this.buf.byteOffset,
      this.buf.byteLength,
    ));
  }
  static create(buf) {
    return util.Buffer?.isBuffer(buf) ? new BufferReader(buf) : new Reader(buf);
  }
  need(n) {
    if (n > this.len - this.pos) throw RangeError("index out of range");
  }
  raw(s, e) {
    return this.buf.subarray(s, e);
  }
  uint32() {
    let v = 0;
    for (let i = 0; i < 10; i++) {
      this.need(1);
      const b = this.buf[this.pos++];
      if (i < 5) v |= (b & 127) << (i * 7);
      if (b < 128) return v >>> 0;
    }
    throw Error("invalid varint encoding");
  }
  tag() {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      this.need(1);
      const b = this.buf[this.pos++];
      if (i === 4 && b > 15) throw Error("invalid tag encoding");
      v |= (b & 127) << (i * 7);
      if (b < 128) return v >>> 0;
    }
    throw Error("invalid tag encoding");
  }
  size() {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      this.need(1);
      const b = this.buf[this.pos++];
      if (i === 4 && b > 7) throw Error("invalid length encoding");
      v |= (b & 127) << (i * 7);
      if (b < 128) return v >>> 0;
    }
    throw Error("invalid length encoding");
  }
  int32() {
    return this.uint32() | 0;
  }
  sint32() {
    const n = this.uint32();
    return (n >>> 1) ^ -(n & 1);
  }
  bool() {
    let value = false;
    for (let i = 0; i < 10; i++) {
      this.need(1);
      const b = this.buf[this.pos++];
      value ||= !!(b & 127);
      if (b < 128) return value;
    }
    throw Error("invalid varint encoding");
  }
  bits() {
    let lo = 0,
      hi = 0;
    for (let i = 0; i < 10; i++) {
      this.need(1);
      const b = this.buf[this.pos++],
        v = b & 127,
        s = i * 7;
      if (s < 32) {
        lo |= v << s;
        if (s > 25) hi |= v >>> (32 - s);
      } else hi |= v << (s - 32);
      if (b < 128) return new util.LongBits(lo, hi);
    }
    throw Error("invalid varint encoding");
  }
  int64() {
    return this.bits().toLong(false);
  }
  uint64() {
    return this.bits().toLong(true);
  }
  sint64() {
    return this.bits().zzDecode().toLong(false);
  }
  fixed32() {
    this.need(4);
    const n = this.dataView.getUint32(this.pos, true);
    this.pos += 4;
    return n;
  }
  sfixed32() {
    return this.fixed32() | 0;
  }
  fixed64() {
    const lo = this.fixed32(),
      hi = this.fixed32();
    return new util.LongBits(lo, hi).toLong(true);
  }
  sfixed64() {
    const lo = this.fixed32(),
      hi = this.fixed32();
    return new util.LongBits(lo, hi).toLong(false);
  }
  float() {
    this.need(4);
    const n = this.dataView.getFloat32(this.pos, true);
    this.pos += 4;
    return n;
  }
  double() {
    this.need(8);
    const n = this.dataView.getFloat64(this.pos, true);
    this.pos += 8;
    return n;
  }
  bytes() {
    const n = this.size();
    this.need(n);
    const start = this.pos;
    this.pos += n;
    return util.Buffer?.isBuffer(this.buf)
      ? util.Buffer.prototype.slice.call(this.buf, start, this.pos)
      : this.buf.subarray(start, this.pos);
  }
  string() {
    const n = this.size();
    this.need(n);
    const start = this.pos;
    this.pos += n;
    return util.Buffer?.isBuffer(this.buf)
      ? this.buf.toString("utf8", start, this.pos)
      : util.utf8.read(this.buf, start, this.pos);
  }
  stringVerify() {
    const n = this.size();
    this.need(n);
    const start = this.pos;
    this.pos += n;
    if (n < 256 && util.Buffer?.isBuffer(this.buf)) {
      let high = 0;
      for (let i = start; i < this.pos; i++) high |= this.buf[i];
      if (high < 128) return this.buf.toString("utf8", start, this.pos);
    }
    return strictUtf8.decode(this.buf.subarray(start, this.pos));
  }
  skip(n) {
    if (n !== undefined) {
      length(n);
      this.need(n);
      this.pos += n;
    } else {
      for (let i = 0; i < 10; i++) {
        this.need(1);
        if (this.buf[this.pos++] < 128) return this;
      }
      throw Error("invalid varint encoding");
    }
    return this;
  }
  skipType(wire, depth = 0, field) {
    if (depth > Reader.recursionLimit) throw Error("max depth exceeded");
    if (field === 0) throw Error("illegal tag: field number 0");
    switch (wire) {
      case 0:
        return this.skip();
      case 1:
        return this.skip(8);
      case 2:
        return this.skip(this.size());
      case 5:
        return this.skip(4);
      case 3:
        while (true) {
          const t = this.tag(),
            id = t >>> 3;
          if (!id) throw Error("illegal tag");
          if ((t & 7) === 4) {
            if (field !== undefined && id !== field)
              throw Error("invalid end group tag");
            return this;
          }
          this.skipType(t & 7, depth + 1, id);
        }
      default:
        throw Error("invalid wire type " + wire);
    }
  }
  packed(method, target = []) {
    const n = this.size(),
      end = this.pos + n;
    this.need(n);
    const outer = this.len;
    this.len = end;
    try {
      while (this.pos < end) target.push(this[method]());
      return target;
    } finally {
      this.len = outer;
    }
  }
}
Reader.discardUnknown = true;
Reader.recursionLimit = 100;
class BufferReader extends Reader {}
class Writer {
  constructor() {
    this.buf = this.constructor.alloc(128);
    this.pos = 0;
    this.states = [];
    this.view = null;
  }
  get dataView() {
    return (this.view ||= new DataView(
      this.buf.buffer,
      this.buf.byteOffset,
      this.buf.byteLength,
    ));
  }
  static alloc(n) {
    return new Uint8Array(n);
  }
  static create() {
    return util.Buffer ? new BufferWriter() : new Writer();
  }
  get len() {
    return this.pos;
  }
  reserve(n) {
    if (this.pos + n > this.buf.length) {
      const next = this.constructor.alloc(
        Math.max(this.buf.length * 2, this.pos + n),
      );
      next.set(this.buf.subarray(0, this.pos));
      this.buf = next;
      this.view = null;
    }
  }
  uint32(v) {
    v >>>= 0;
    this.reserve(5);
    do {
      this.buf[this.pos++] = (v & 127) | (v > 127 ? 128 : 0);
      v >>>= 7;
    } while (v);
    return this;
  }
  int32(v) {
    v |= 0;
    return v < 0 ? this.int64(v) : this.uint32(v);
  }
  sint32(v) {
    return this.uint32((v << 1) ^ (v >> 31));
  }
  bool(v) {
    return this.uint32(v ? 1 : 0);
  }
  bits(bits) {
    let lo = bits.lo,
      hi = bits.hi;
    this.reserve(10);
    while (hi || lo > 127) {
      this.buf[this.pos++] = (lo & 127) | 128;
      lo = ((lo >>> 7) | (hi << 25)) >>> 0;
      hi >>>= 7;
    }
    this.buf[this.pos++] = lo;
    return this;
  }
  uint64(v) {
    return this.bits(util.LongBits.from(v));
  }
  int64(v) {
    return this.uint64(v);
  }
  sint64(v) {
    return this.bits(util.LongBits.from(v).zzEncode());
  }
  fixed32(v) {
    this.reserve(4);
    this.dataView.setUint32(this.pos, v, true);
    this.pos += 4;
    return this;
  }
  sfixed32(v) {
    return this.fixed32(v);
  }
  fixed64(v) {
    const b = util.LongBits.from(v);
    return this.fixed32(b.lo).fixed32(b.hi);
  }
  sfixed64(v) {
    return this.fixed64(v);
  }
  float(v) {
    this.reserve(4);
    this.dataView.setFloat32(this.pos, v, true);
    this.pos += 4;
    return this;
  }
  double(v) {
    this.reserve(8);
    this.dataView.setFloat64(this.pos, v, true);
    this.pos += 8;
    return this;
  }
  raw(b) {
    this.reserve(b.length);
    this.buf.set(b, this.pos);
    this.pos += b.length;
    return this;
  }
  bytes(b) {
    if (typeof b === "string") {
      const n = util.base64.length(b),
        v = util.newBuffer(n);
      util.base64.decode(b, v, 0);
      b = v;
    }
    return this.uint32(b.length).raw(b);
  }
  string(s) {
    const n = util.utf8.length(s);
    this.uint32(n);
    this.reserve(n);
    if (util.Buffer?.isBuffer(this.buf)) this.buf.write(s, this.pos, n, "utf8");
    else util.utf8.write(s, this.buf, this.pos);
    this.pos += n;
    return this;
  }
  fork() {
    this.states.push(this.pos);
    return this;
  }
  reset() {
    this.pos = this.states.pop() ?? 0;
    return this;
  }
  ldelim() {
    const start = this.states.pop() ?? 0,
      n = this.pos - start;
    let count = 1;
    for (let x = n; x > 127; x >>>= 7) count++;
    this.reserve(count);
    this.buf.copyWithin(start + count, start, this.pos);
    const end = this.pos + count;
    this.pos = start;
    this.uint32(n);
    this.pos = end;
    return this;
  }
  finish(shared = false) {
    const bytes = this.buf.subarray(0, this.pos);
    if (shared) return bytes;
    const out = this.constructor.alloc(this.pos);
    out.set(bytes);
    return out;
  }
  finishInto(b, offset = 0) {
    b.set(this.buf.subarray(0, this.pos), offset);
    return b;
  }
}
class BufferWriter extends Writer {
  static alloc(n) {
    return util.Buffer.allocUnsafe(n);
  }
}
const scalars = [
  "uint32",
  "int32",
  "sint32",
  "uint64",
  "int64",
  "sint64",
  "fixed32",
  "sfixed32",
  "fixed64",
  "sfixed64",
  "bool",
  "float",
  "double",
];
for (const name of scalars) {
  Reader.prototype[name + "s"] = function (a) {
    return this.packed(name, a);
  };
  Writer.prototype[name + "s"] = function (a) {
    this.fork();
    for (const v of a) this[name](v);
    return this.ldelim();
  };
}
Reader._configure =
  Writer._configure =
  BufferReader._configure =
  BufferWriter._configure =
    () => {};
module.exports = { Reader, BufferReader, Writer, BufferWriter, length };
