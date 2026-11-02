"use strict";
const util = require("./util.cjs");
// Bun's native Buffer conversion is cheaper once strings span several words;
// Node benefits from the short ASCII path over a wider range.
const asciiLimit = globalThis.Bun ? 8 : 64;
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
    if (Reader.discardUnknown !== true)
      this.discardUnknown = Reader.discardUnknown;
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
    if (this.pos >= this.len) throw RangeError("index out of range");
    const first = this.buf[this.pos++];
    if (first < 128) return first;
    let v = first & 127;
    for (let i = 1; i < 10; i++) {
      if (this.pos >= this.len) throw RangeError("index out of range");
      const b = this.buf[this.pos++];
      if (i < 5) v |= (b & 127) << (i * 7);
      if (b < 128) return v >>> 0;
    }
    throw Error("invalid varint encoding");
  }
  tag() {
    if (this.pos >= this.len) throw RangeError("index out of range");
    const first = this.buf[this.pos++];
    if (first < 128) return first;
    let v = first & 127;
    for (let i = 1; i < 5; i++) {
      if (this.pos >= this.len) throw RangeError("index out of range");
      const b = this.buf[this.pos++];
      if (i === 4 && b > 15) throw Error("invalid tag encoding");
      v |= (b & 127) << (i * 7);
      if (b < 128) return v >>> 0;
    }
    throw Error("invalid tag encoding");
  }
  size() {
    if (this.pos >= this.len) throw RangeError("index out of range");
    const first = this.buf[this.pos++];
    if (first < 128) return first;
    let v = first & 127;
    for (let i = 1; i < 5; i++) {
      if (this.pos >= this.len) throw RangeError("index out of range");
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
      if (this.pos >= this.len) throw RangeError("index out of range");
      const b = this.buf[this.pos++];
      value ||= !!(b & 127);
      if (b < 128) return value;
    }
    throw Error("invalid varint encoding");
  }
  bits(unsigned = null, zigzag = false) {
    let lo = 0,
      hi = 0;
    for (let i = 0; i < 10; i++) {
      if (this.pos >= this.len) throw RangeError("index out of range");
      const b = this.buf[this.pos++],
        v = b & 127,
        s = i * 7;
      if (s < 32) {
        lo |= v << s;
        if (s > 25) hi |= v >>> (32 - s);
      } else hi |= v << (s - 32);
      if (b < 128) {
        if (zigzag) {
          const sign = -(lo & 1);
          lo = ((lo >>> 1) | (hi << 31)) ^ sign;
          hi = (hi >>> 1) ^ sign;
        }
        if (unsigned !== null && util.Long)
          return util.Long.fromBits(lo, hi, unsigned);
        const value = new util.LongBits(lo, hi);
        return unsigned === null ? value : value.toNumber(unsigned);
      }
    }
    throw Error("invalid varint encoding");
  }
  int64() {
    return this.bits(false);
  }
  uint64() {
    return this.bits(true);
  }
  sint64() {
    return this.bits(false, true);
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
  text(verify) {
    const n = this.size();
    this.need(n);
    const start = this.pos,
      end = start + n;
    this.pos = end;
    if (n <= asciiLimit) {
      let out = "",
        i = start;
      for (; i + 4 <= end; i += 4) {
        const a = this.buf[i],
          b = this.buf[i + 1],
          c = this.buf[i + 2],
          d = this.buf[i + 3];
        if ((a | b | c | d) > 127) break;
        out += String.fromCharCode(a, b, c, d);
      }
      for (; i < end; i++) {
        const b = this.buf[i];
        if (b > 127) break;
        out += String.fromCharCode(b);
      }
      if (i === end) return out;
    }
    if (verify) return strictUtf8.decode(this.buf.subarray(start, end));
    return util.Buffer?.isBuffer(this.buf)
      ? this.buf.toString("utf8", start, end)
      : util.utf8.read(this.buf, start, end);
  }
  string() {
    return this.text(false);
  }
  stringVerify() {
    return this.text(true);
  }
  skip(n) {
    if (n !== undefined) {
      length(n);
      this.need(n);
      this.pos += n;
    } else {
      for (let i = 0; i < 10; i++) {
        if (this.pos >= this.len) throw RangeError("index out of range");
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
Reader.prototype.discardUnknown = true;
Reader.prototype.view = null;
Reader.recursionLimit = 100;
function smallAscii(buf, p, n) {
  switch (n) {
    case 0:
      return "";
    case 1: {
      const b0 = buf[p + 0];
      return b0 < 128 ? String.fromCharCode(b0) : null;
    }
    case 2: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1];
      return (b0 | b1) < 128 ? String.fromCharCode(b0, b1) : null;
    }
    case 3: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2];
      return (b0 | b1 | b2) < 128 ? String.fromCharCode(b0, b1, b2) : null;
    }
    case 4: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2],
        b3 = buf[p + 3];
      return (b0 | b1 | b2 | b3) < 128
        ? String.fromCharCode(b0, b1, b2, b3)
        : null;
    }
    case 5: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2],
        b3 = buf[p + 3],
        b4 = buf[p + 4];
      return (b0 | b1 | b2 | b3 | b4) < 128
        ? String.fromCharCode(b0, b1, b2, b3, b4)
        : null;
    }
    case 6: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2],
        b3 = buf[p + 3],
        b4 = buf[p + 4],
        b5 = buf[p + 5];
      return (b0 | b1 | b2 | b3 | b4 | b5) < 128
        ? String.fromCharCode(b0, b1, b2, b3, b4, b5)
        : null;
    }
    case 7: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2],
        b3 = buf[p + 3],
        b4 = buf[p + 4],
        b5 = buf[p + 5],
        b6 = buf[p + 6];
      return (b0 | b1 | b2 | b3 | b4 | b5 | b6) < 128
        ? String.fromCharCode(b0, b1, b2, b3, b4, b5, b6)
        : null;
    }
    case 8: {
      const b0 = buf[p + 0],
        b1 = buf[p + 1],
        b2 = buf[p + 2],
        b3 = buf[p + 3],
        b4 = buf[p + 4],
        b5 = buf[p + 5],
        b6 = buf[p + 6],
        b7 = buf[p + 7];
      return (b0 | b1 | b2 | b3 | b4 | b5 | b6 | b7) < 128
        ? String.fromCharCode(b0, b1, b2, b3, b4, b5, b6, b7)
        : null;
    }
    default:
      return null;
  }
}
class BufferReader extends Reader {}
if (globalThis.Bun) {
  // Bun's native Buffer string conversion is cheap even for very short values.
  BufferReader.prototype.string = function () {
    const n = this.size(),
      start = this.pos,
      end = start + n;
    if (end > this.len) throw RangeError("index out of range");
    this.pos = end;
    if (n <= 8) {
      const text = smallAscii(this.buf, start, n);
      if (text !== null) return text;
    }
    return this.buf.toString("utf8", start, end);
  };
  BufferReader.prototype.stringVerify = function () {
    const n = this.size(),
      start = this.pos,
      end = start + n;
    if (end > this.len) throw RangeError("index out of range");
    this.pos = end;
    if (n <= 8) {
      const text = smallAscii(this.buf, start, n);
      if (text !== null) return text;
    }
    return strictUtf8.decode(this.buf.subarray(start, this.pos));
  };
}
class Writer {
  constructor() {
    this.buf = this.constructor.alloc(128);
    this.pos = 0;
    this.states = null;
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
    if (v < 128) {
      if (this.pos >= this.buf.length) this.reserve(1);
      this.buf[this.pos++] = v;
      return this;
    }
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
    return this.writeBits(bits.lo, bits.hi);
  }
  writeBits(lo, hi) {
    lo >>>= 0;
    hi >>>= 0;
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
    if (v && typeof v.low === "number" && typeof v.high === "number")
      return this.writeBits(v.low, v.high);
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
    if (typeof s === "string" && s.length < 128) {
      const n = s.length;
      this.reserve(n + 1);
      let i = 0;
      for (; i < n; i++) {
        const c = s.charCodeAt(i);
        if (c > 127) break;
        this.buf[this.pos + 1 + i] = c;
      }
      if (i === n) {
        this.buf[this.pos] = n;
        this.pos += n + 1;
        return this;
      }
      if (n <= 32) {
        // Short Unicode strings are encoded once, without a length scan followed
        // by a second native write. Reserve for worst-case UTF-8 and one prefix byte.
        this.reserve(n * 3 + 1);
        // reserve copies committed bytes only; restore the tentative ASCII prefix
        // if growing the backing buffer discarded it.
        for (let j = 0; j < i; j++)
          this.buf[this.pos + 1 + j] = s.charCodeAt(j);
        let p = this.pos + 1 + i;
        for (; i < n; i++) {
          let c = s.charCodeAt(i);
          if (c >= 0xd800 && c <= 0xdfff) {
            const next = s.charCodeAt(i + 1);
            if (c <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
              c = 0x10000 + ((c - 0xd800) << 10) + next - 0xdc00;
              i++;
            } else c = 0xfffd;
          }
          if (c < 128) this.buf[p++] = c;
          else if (c < 2048) {
            this.buf[p++] = 192 | (c >>> 6);
            this.buf[p++] = 128 | (c & 63);
          } else if (c < 65536) {
            this.buf[p++] = 224 | (c >>> 12);
            this.buf[p++] = 128 | ((c >>> 6) & 63);
            this.buf[p++] = 128 | (c & 63);
          } else {
            this.buf[p++] = 240 | (c >>> 18);
            this.buf[p++] = 128 | ((c >>> 12) & 63);
            this.buf[p++] = 128 | ((c >>> 6) & 63);
            this.buf[p++] = 128 | (c & 63);
          }
        }
        this.buf[this.pos] = p - this.pos - 1;
        this.pos = p;
        return this;
      }
    }
    const n = util.utf8.length(s);
    this.uint32(n);
    this.reserve(n);
    if (util.Buffer?.isBuffer(this.buf)) this.buf.write(s, this.pos, n, "utf8");
    else util.utf8.write(s, this.buf, this.pos);
    this.pos += n;
    return this;
  }
  fork() {
    (this.states ||= []).push(this.pos);
    return this;
  }
  reset() {
    this.pos = this.states?.pop() ?? 0;
    return this;
  }
  ldelim() {
    const start = this.states?.pop() ?? 0,
      n = this.pos - start;
    let count = 1;
    for (let x = n; x > 127; x >>>= 7) count++;
    this.reserve(count);
    if (n <= 32)
      for (let i = this.pos - 1; i >= start; i--)
        this.buf[i + count] = this.buf[i];
    else this.buf.copyWithin(start + count, start, this.pos);
    this.pos += count;
    let value = n,
      p = start;
    do {
      this.buf[p++] = (value & 127) | (value > 127 ? 128 : 0);
      value >>>= 7;
    } while (value);
    return this;
  }
  finish(shared = false) {
    if (shared) return this.buf.subarray(0, this.pos);
    const out = this.constructor.alloc(this.pos);
    if (this.pos <= 64) for (let i = 0; i < this.pos; i++) out[i] = this.buf[i];
    else out.set(this.buf.subarray(0, this.pos));
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
Reader.prototype.uint32s = function (target = []) {
  const n = this.size();
  this.need(n);
  const outer = this.len,
    end = this.pos + n;
  this.len = end;
  try {
    while (this.pos < end) {
      const b = this.buf[this.pos];
      if (b < 128) {
        this.pos++;
        target.push(b);
      } else target.push(this.uint32());
    }
    return target;
  } finally {
    this.len = outer;
  }
};
Reader._configure =
  Writer._configure =
  BufferReader._configure =
  BufferWriter._configure =
    () => {};
module.exports = { Reader, BufferReader, Writer, BufferWriter, length };
