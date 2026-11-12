"use strict";
const { bytes } = require("./input.cjs");
// SHA-256 compression constants and initial state specified by FIPS 180-4.
const K = Uint32Array.of(
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
);
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const hex = Array.from({ length: 256 }, (_, n) =>
  n.toString(16).padStart(2, "0"),
);

class WordArray {
  constructor(words = [], sigBytes = words.length * 4) {
    if (words instanceof Uint8Array) {
      this.words = [];
      this.sigBytes = words.length;
      for (let n = 0; n < words.length; n++)
        this.words[n >>> 2] =
          (this.words[n >>> 2] || 0) | (words[n] << (24 - (n & 3) * 8));
    } else {
      if (
        !Array.isArray(words) ||
        !Number.isInteger(sigBytes) ||
        sigBytes < 0 ||
        sigBytes > words.length * 4
      )
        throw new TypeError("Invalid WordArray length");
      this.words = words.slice();
      this.sigBytes = sigBytes;
    }
  }
  static create(words = [], sigBytes) {
    return new WordArray(words, sigBytes);
  }
  toString(codec = Hex) {
    return codec.stringify(this);
  }
  clone() {
    return new WordArray(this.words, this.sigBytes);
  }
  clamp() {
    const n = this.sigBytes;
    if (n % 4) this.words[n >>> 2] &= 0xffffffff << (32 - (n % 4) * 8);
    this.words.length = Math.ceil(n / 4);
  }
  concat(value) {
    const a = bytes(this),
      b = bytes(value),
      joined = new Uint8Array(a.length + b.length);
    joined.set(a);
    joined.set(b, a.length);
    const next = new WordArray(joined);
    this.words = next.words;
    this.sigBytes = next.sigBytes;
    return this;
  }
}
const Hex = {
  stringify(value) {
    let result = "";
    for (const b of bytes(value)) result += hex[b];
    return result;
  },
  parse(text) {
    if (
      typeof text !== "string" ||
      text.length % 2 ||
      !/^[0-9a-f]*$/i.test(text)
    )
      throw new TypeError("Invalid hexadecimal input");
    const out = new Uint8Array(text.length / 2);
    for (let n = 0; n < out.length; n++)
      out[n] = parseInt(text.slice(n * 2, n * 2 + 2), 16);
    return new WordArray(out);
  },
};
const Utf8 = {
  parse(text) {
    if (typeof text !== "string")
      throw new TypeError("UTF-8 input must be a string");
    return new WordArray(bytes(text));
  },
  stringify(value) {
    try {
      return decoder.decode(bytes(value));
    } catch {
      throw new Error("Malformed UTF-8 data");
    }
  },
};
const Base64 = {
  stringify(value) {
    const source = bytes(value);
    let binary = "";
    for (let n = 0; n < source.length; n += 8192)
      binary += String.fromCharCode(...source.subarray(n, n + 8192));
    return btoa(binary);
  },
  parse(text) {
    if (typeof text !== "string")
      throw new TypeError("Base64 input must be a string");
    let binary;
    try {
      binary = atob(text);
    } catch {
      throw new TypeError("Invalid Base64 input");
    }
    return new WordArray(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  },
};
const rotate = (x, n) => (x >>> n) | (x << (32 - n));
function digest(source) {
  const size = Math.ceil((source.length + 9) / 64) * 64,
    data = new Uint8Array(size);
  data.set(source);
  data[source.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(size - 8, Math.floor(source.length / 0x20000000));
  view.setUint32(size - 4, (source.length * 8) >>> 0);
  const h = Uint32Array.of(
      0x6a09e667,
      0xbb67ae85,
      0x3c6ef372,
      0xa54ff53a,
      0x510e527f,
      0x9b05688c,
      0x1f83d9ab,
      0x5be0cd19,
    ),
    w = new Uint32Array(64);
  for (let start = 0; start < size; start += 64) {
    for (let n = 0; n < 16; n++) w[n] = view.getUint32(start + n * 4);
    for (let n = 16; n < 64; n++) {
      const x = w[n - 15],
        y = w[n - 2];
      w[n] =
        w[n - 16] +
        (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) +
        w[n - 7] +
        (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10));
    }
    let [a, b, c, d, e, f, g, t] = h;
    for (let n = 0; n < 64; n++) {
      const sum =
        (t +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          K[n] +
          w[n]) |
        0;
      const mix =
        ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) +
          ((a & b) ^ (a & c) ^ (b & c))) |
        0;
      t = g;
      g = f;
      f = e;
      e = (d + sum) | 0;
      d = c;
      c = b;
      b = a;
      a = (sum + mix) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += t;
  }
  return new WordArray(
    Array.from(h, (x) => x | 0),
    32,
  );
}
function SHA256(value) {
  return digest(bytes(value));
}
function HmacSHA256(value, key) {
  let secret = bytes(key);
  if (secret.length > 64) secret = bytes(digest(secret));
  const message = bytes(value),
    inner = new Uint8Array(64 + message.length),
    outer = new Uint8Array(96);
  for (let n = 0; n < 64; n++) {
    inner[n] = (secret[n] || 0) ^ 0x36;
    outer[n] = (secret[n] || 0) ^ 0x5c;
  }
  inner.set(message, 64);
  outer.set(bytes(digest(inner)), 64);
  const result = digest(outer);
  inner.fill(0);
  outer.fill(0);
  return result;
}
module.exports = {
  SHA256,
  HmacSHA256,
  WordArray,
  enc: { Hex, Utf8, Base64 },
  lib: { WordArray },
};
