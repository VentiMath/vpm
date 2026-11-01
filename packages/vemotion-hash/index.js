// MurmurHash2 (32-bit, seed 0) of a string's UTF-8 bytes, in base 36: the
// class name suffix Emotion derives from serialized styles.

const M = 0x5bd1e995;

/** Mixes one 4-byte block into the hash. */
const mix = (h, k) => {
  k = Math.imul(k, M);
  k ^= k >>> 24;
  return Math.imul(k, M) ^ Math.imul(h, M);
};

/**
 * Hashes a string's UTF-8 bytes (a lone surrogate encodes as its own code
 * point, as in WTF-8, so distinct strings give distinct bytes). For ASCII
 * these are the characters themselves, as @emotion/hash reads them.
 * @param {string} input
 * @returns {string}
 */
export default function hash(input) {
  const length = input.length;
  let h = 0;
  let block = 0; // pending bytes, little-endian
  let count = 0;
  for (let i = 0; i < length; i++) {
    // Four ASCII characters at once when no bytes are pending.
    if (count === 0 && length - i >= 4) {
      const a = input.charCodeAt(i), b = input.charCodeAt(i + 1), c = input.charCodeAt(i + 2), d = input.charCodeAt(i + 3);
      if ((a | b | c | d) < 0x80) {
        h = mix(h, a | (b << 8) | (c << 16) | (d << 24));
        i += 3;
        continue;
      }
    }
    // One character's UTF-8 bytes, packed little-endian.
    let code = input.charCodeAt(i);
    let bytes, size;
    if (code < 0x80) {
      bytes = code;
      size = 1;
    } else if (code < 0x800) {
      bytes = (0xc0 | (code >> 6)) | ((0x80 | (code & 0x3f)) << 8);
      size = 2;
    } else {
      if (code >= 0xd800 && code < 0xdc00 && i + 1 < length) {
        const low = input.charCodeAt(i + 1);
        if (low >= 0xdc00 && low < 0xe000) {
          code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
          i++;
        }
      }
      if (code < 0x10000) {
        bytes = (0xe0 | (code >> 12)) | ((0x80 | ((code >> 6) & 0x3f)) << 8) | ((0x80 | (code & 0x3f)) << 16);
        size = 3;
      } else {
        bytes = (0xf0 | (code >> 18)) | ((0x80 | ((code >> 12) & 0x3f)) << 8) | ((0x80 | ((code >> 6) & 0x3f)) << 16) | ((0x80 | (code & 0x3f)) << 24);
        size = 4;
      }
    }
    // Up to 7 pending bytes: one full block at most, the rest carried over.
    block |= bytes << (count * 8);
    count += size;
    if (count >= 4) {
      h = mix(h, block);
      count -= 4;
      block = count ? bytes >>> ((size - count) * 8) : 0;
    }
  }
  if (count) h = Math.imul(h ^ block, M);
  h ^= h >>> 13;
  h = Math.imul(h, M);
  return ((h ^ (h >>> 15)) >>> 0).toString(36);
}
