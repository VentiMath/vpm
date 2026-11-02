'use strict';

// Independent 64-bit value implementation. Public words stay mutable because
// protobuf readers populate them directly. All operations wrap modulo 2^64.
const WORD = 4294967296;
function Long(low, high, unsigned) {
  this.low = low | 0;
  this.high = high | 0;
  this.unsigned = !!unsigned;
}
Object.defineProperty(Long.prototype, '__isLong__', {value: true});
Long.isLong = value => !!(value && value.__isLong__ === true);
Long.fromBits = (low, high, unsigned) => new Long(low, high, unsigned);
Long.fromInt = (value, unsigned) => unsigned
  ? new Long(value, 0, true) : new Long(value, (value | 0) < 0 ? -1 : 0, false);
Long.fromNumber = function(value, unsigned) {
  if (isNaN(value)) return unsigned ? Long.UZERO : Long.ZERO;
  if (unsigned) {
    if (value < 0) return Long.UZERO;
    if (value >= 2 ** 64) return Long.MAX_UNSIGNED_VALUE;
  } else {
    if (value <= -(2 ** 63)) return Long.MIN_VALUE;
    if (value + 1 >= 2 ** 63) return Long.MAX_VALUE;
  }
  if (value < 0) return Long.fromNumber(-value, unsigned).negate();
  return new Long(value | 0, (value / WORD) | 0, unsigned);
};
Long.fromBigInt = (value, unsigned) => new Long(Number(BigInt.asIntN(32, value)), Number(BigInt.asIntN(32, value >> 32n)), unsigned);
Long.fromValue = function(value, unsigned) {
  switch (typeof value) {
    case 'number': return Long.fromNumber(value, unsigned);
    case 'bigint': return Long.fromBigInt(value, unsigned);
    case 'string': return Long.fromString(value, unsigned);
    default: return new Long(value.low, value.high, typeof unsigned === 'boolean' ? unsigned : value.unsigned);
  }
};
function radixValue(radix) {
  if (radix === undefined) return 10;
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw RangeError('radix must be an integer from 2 through 36');
  return radix;
}
Long.fromString = function(text, unsigned, radix) {
  if (typeof text !== 'string') throw TypeError('integer text must be a string');
  if (typeof unsigned === 'number') { radix = unsigned; unsigned = false; }
  radix = radixValue(radix);
  let position = text[0] === '-' || text[0] === '+' ? 1 : 0;
  if (position === text.length) throw Error('integer text has no digits');
  // Common wire-format decimals have a bounded native conversion. Validate the
  // whole token first, then avoid the word loop for these short inputs.
  if (radix === 10 && text.length <= 21) {
    if (!/^[+-]?[0-9]+(?![\s\S])/.test(text)) throw Error('invalid integer digit');
    if (text.length - position <= 15) {
      const value = Number(text);
      return new Long(value | 0, Math.floor(value / WORD) | 0, unsigned);
    }
    return Long.fromBigInt(BigInt(text), unsigned);
  }
  let low = 0, high = 0;
  // Each product fits exactly in a JS number (< 2^32 * 36). Intermediate
  // storage is constant even for arbitrarily long input; every digit is checked.
  for (; position < text.length; position++) {
    const code = text.charCodeAt(position);
    const digit = code >= 48 && code <= 57 ? code - 48
      : code >= 65 && code <= 90 ? code - 55 : code >= 97 && code <= 122 ? code - 87 : 36;
    if (digit >= radix) throw Error('invalid integer digit');
    const product = low * radix + digit;
    high = (high * radix + Math.floor(product / WORD)) >>> 0;
    low = product >>> 0;
  }
  const result = new Long(low, high, unsigned);
  return text[0] === '-' ? result.negate() : result;
};
const operand = value => Long.isLong(value) ? value : Long.fromValue(value);
const integer = (value, unsigned = value.unsigned) => (BigInt(unsigned ? value.high >>> 0 : value.high) << 32n) | BigInt(value.low >>> 0);

// Construct a tiny, memory-free arithmetic module from named operations. This
// kernel is independently assembled here, not a retained upstream binary. If a
// CSP/runtime disallows compilation, native BigInt provides the same semantics.
function arithmeticKernel() {
  if (typeof WebAssembly !== 'object') return null;
  const leb = value => { const bytes = []; do { const byte = value & 127; value >>>= 7; bytes.push(byte | (value ? 128 : 0)); } while (value); return bytes; };
  const section = (id, bytes) => [id, ...leb(bytes.length), ...bytes];
  const name = text => [text.length, ...Array.from(text, c => c.charCodeAt(0))];
  const joinWords = (low, high) => [0x20, high, 0xad, 0x42, 32, 0x86, 0x20, low, 0xad, 0x84];
  const operations = [['mul', 0x7e], ['divS', 0x7f], ['divU', 0x80], ['remS', 0x81], ['remU', 0x82]];
  const bodies = operations.map(([, opcode]) => {
    const code = [1, 1, 0x7e, ...joinWords(0, 1), ...joinWords(2, 3), opcode,
      0x22, 4, 0x42, 32, 0x88, 0xa7, 0x24, 0, 0x20, 4, 0xa7, 0x0b];
    return [...leb(code.length), ...code];
  });
  bodies.push([4, 0, 0x23, 0, 0x0b]);
  const exports = operations.flatMap(([key], i) => [...name(key), 0, i]);
  const bytes = [0, 97, 115, 109, 1, 0, 0, 0,
    ...section(1, [2, 0x60, 4, 0x7f, 0x7f, 0x7f, 0x7f, 1, 0x7f, 0x60, 0, 1, 0x7f]),
    ...section(3, [6, 0, 0, 0, 0, 0, 1]),
    ...section(6, [1, 0x7f, 1, 0x41, 0, 0x0b]),
    ...section(7, [6, ...exports, ...name('high'), 0, 5]),
    ...section(10, [6, ...bodies.flat()])];
  try { return new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(bytes))).exports; }
  catch { return null; }
}
const kernel = arithmeticKernel();
const p = Long.prototype;
p.toInt = function() { return this.unsigned ? this.low >>> 0 : this.low; };
p.toNumber = function() { return (this.unsigned ? this.high >>> 0 : this.high) * WORD + (this.low >>> 0); };
p.toBigInt = function() { return integer(this); };
p.toString = function(radix) {
  radix = radixValue(radix);
  return this.isSafeInteger() ? this.toNumber().toString(radix) : integer(this).toString(radix);
};
p.getHighBits = function() { return this.high; };
p.getLowBits = function() { return this.low; };
p.getHighBitsUnsigned = function() { return this.high >>> 0; };
p.getLowBitsUnsigned = function() { return this.low >>> 0; };
p.isZero = function() { return (this.low | this.high) === 0; };
p.isNegative = function() { return !this.unsigned && this.high < 0; };
p.isPositive = function() { return this.unsigned || this.high >= 0; };
p.isOdd = function() { return (this.low & 1) === 1; };
p.isEven = function() { return (this.low & 1) === 0; };
p.countLeadingZeros = function() { return this.high ? Math.clz32(this.high) : 32 + Math.clz32(this.low); };
p.countTrailingZeros = function() {
  if (this.low) return 31 - Math.clz32(this.low & -this.low);
  return this.high ? 63 - Math.clz32(this.high & -this.high) : 64;
};
p.getNumBitsAbs = function() {
  const value = this.isNegative() ? this.negate() : this;
  return Math.max(1, 64 - value.countLeadingZeros());
};
p.isSafeInteger = function() {
  return this.unsigned || this.high >= 0 ? (this.high >>> 0) < 2097152
    : this.high >= -2097152 && (this.high !== -2097152 || this.low !== 0);
};
p.equals = function(value) {
  const other = operand(value);
  return this.low === other.low && this.high === other.high &&
    (this.unsigned === other.unsigned || this.high >= 0 || other.high >= 0);
};
p.compare = function(value) {
  const other = operand(value);
  if (this.equals(other)) return 0;
  const negative = this.isNegative(), otherNegative = !other.unsigned && other.high < 0;
  if (negative !== otherNegative) return negative ? -1 : 1;
  // Preserve long's receiver-directed comparison for mixed signedness.
  if (!this.unsigned) return this.subtract(other).high < 0 ? -1 : 1;
  return (this.high >>> 0) < (other.high >>> 0) || (this.high === other.high && (this.low >>> 0) < (other.low >>> 0)) ? -1 : 1;
};
p.notEquals = function(value) { return !this.equals(value); };
p.lessThan = function(value) { return this.compare(value) < 0; };
p.lessThanOrEqual = function(value) { return this.compare(value) <= 0; };
p.greaterThan = function(value) { return this.compare(value) > 0; };
p.greaterThanOrEqual = function(value) { return this.compare(value) >= 0; };
p.negate = function() { return new Long(-this.low, ~this.high + (this.low === 0 ? 1 : 0), this.unsigned); };
p.add = function(value) {
  const other = operand(value), low = (this.low >>> 0) + (other.low >>> 0);
  return new Long(low, this.high + other.high + (low >= WORD ? 1 : 0), this.unsigned);
};
p.subtract = function(value) {
  const other = operand(value), low = (this.low >>> 0) - (other.low >>> 0);
  return new Long(low, this.high - other.high - (low < 0 ? 1 : 0), this.unsigned);
};
p.multiply = function(value) {
  const other = operand(value);
  if (kernel) { const low = kernel.mul(this.low, this.high, other.low, other.high); return new Long(low, kernel.high(), this.unsigned); }
  return Long.fromBigInt(integer(this) * integer(other), this.unsigned);
};
function quotient(left, value, remainder) {
  const right = operand(value);
  if ((right.low | right.high) === 0) throw Error('division by zero');
  if (!left.unsigned && left.high === -2147483648 && left.low === 0 && right.high === -1 && right.low === -1)
    return remainder ? Long.ZERO : Long.MIN_VALUE;
  if (kernel) {
    const op = remainder ? (left.unsigned ? kernel.remU : kernel.remS) : (left.unsigned ? kernel.divU : kernel.divS);
    const low = op(left.low, left.high, right.low, right.high);
    return new Long(low, kernel.high(), left.unsigned);
  }
  const a = integer(left), b = integer(right, left.unsigned);
  return Long.fromBigInt(remainder ? a % b : a / b, left.unsigned);
}
p.divide = function(value) { return quotient(this, value, false); };
p.modulo = function(value) { return quotient(this, value, true); };
p.not = function() { return new Long(~this.low, ~this.high, this.unsigned); };
for (const [name, operation] of [['and', (a,b) => a & b], ['or', (a,b) => a | b], ['xor', (a,b) => a ^ b]])
  p[name] = function(value) { const other = operand(value); return new Long(operation(this.low, other.low), operation(this.high, other.high), this.unsigned); };
const shift = value => (Long.isLong(value) ? value.low : value) & 63;
p.shiftLeft = function(value) {
  const n = shift(value);
  if (!n) return this;
  return n >= 32 ? new Long(0, this.low << (n - 32), this.unsigned)
    : new Long(this.low << n, (this.high << n) | (this.low >>> (32 - n)), this.unsigned);
};
p.shiftRight = function(value) {
  const n = shift(value);
  if (!n) return this;
  return n >= 32 ? new Long(this.high >> (n - 32), this.high >> 31, this.unsigned)
    : new Long((this.low >>> n) | (this.high << (32 - n)), this.high >> n, this.unsigned);
};
p.shiftRightUnsigned = function(value) {
  const n = shift(value);
  if (!n) return this;
  return n >= 32 ? new Long(this.high >>> (n - 32), 0, this.unsigned)
    : new Long((this.low >>> n) | (this.high << (32 - n)), this.high >>> n, this.unsigned);
};
p.rotateLeft = function(value) {
  const n = shift(value);
  if (!n) return this;
  let low = this.low, high = this.high;
  if (n >= 32) [low, high] = [high, low];
  const rest = n & 31;
  return rest ? new Long((low << rest) | (high >>> (32 - rest)), (high << rest) | (low >>> (32 - rest)), this.unsigned)
    : new Long(low, high, this.unsigned);
};
p.rotateRight = function(value) { return this.rotateLeft(-shift(value)); };
p.toSigned = function() { return this.unsigned ? new Long(this.low, this.high, false) : this; };
p.toUnsigned = function() { return this.unsigned ? this : new Long(this.low, this.high, true); };
p.toBytes = function(le) {
  const bytes = new Array(8);
  for (let i = 0; i < 8; i++) bytes[le ? i : 7 - i] = (i < 4 ? this.low : this.high) >>> ((i & 3) * 8) & 255;
  return bytes;
};
p.toBytesLE = function() { return this.toBytes(true); };
p.toBytesBE = function() { return this.toBytes(false); };
const arrayName = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get;
Long.fromBytes = function(bytes, unsigned, le) {
  const array = Array.isArray(bytes);
  if (!array && !(bytes instanceof Uint8Array) && !(ArrayBuffer.isView(bytes) && arrayName.call(bytes) === 'Uint8Array')) throw TypeError('bytes must be a Uint8Array or array');
  if (bytes.length !== 8) throw RangeError('exactly eight bytes required');
  let low = 0, high = 0;
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (array && (!Number.isInteger(byte) || byte < 0 || byte > 255)) throw RangeError('invalid byte');
    const position = le ? i : 7 - i;
    if (position < 4) low |= byte << (position * 8); else high |= byte << ((position - 4) * 8);
  }
  return new Long(low, high, unsigned);
};
Long.fromBytesLE = (bytes, unsigned) => Long.fromBytes(bytes, unsigned, true);
Long.fromBytesBE = (bytes, unsigned) => Long.fromBytes(bytes, unsigned, false);
for (const [method, names] of Object.entries({isZero:['eqz'], equals:['eq'], notEquals:['ne','neq'], lessThan:['lt'], lessThanOrEqual:['le','lte'], greaterThan:['gt'], greaterThanOrEqual:['ge','gte'], compare:['comp'], negate:['neg'], subtract:['sub'], multiply:['mul'], divide:['div'], modulo:['mod','rem'], countLeadingZeros:['clz'], countTrailingZeros:['ctz'], shiftLeft:['shl'], shiftRight:['shr'], shiftRightUnsigned:['shru','shr_u'], rotateLeft:['rotl'], rotateRight:['rotr']}))
  for (const name of names) p[name] = p[method];
for (const [name, words] of Object.entries({ZERO:[0,0], UZERO:[0,0,true], ONE:[1,0], UONE:[1,0,true], NEG_ONE:[-1,-1], MIN_VALUE:[0,-2147483648], MAX_VALUE:[-1,2147483647], MAX_UNSIGNED_VALUE:[-1,-1,true]}))
  Object.defineProperty(Long, name, {enumerable:true, value:Object.freeze(new Long(...words))});
module.exports = Long;
