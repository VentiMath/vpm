'use strict';
const {deflateSync, crc32} = require('node:zlib');
const {isUint8Array} = require('node:util').types;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function options(value, allowed) {
  if (value === undefined) return {};
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('PNG options must be an object');
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw new TypeError('Unsupported PNG option: ' + key);
  return value;
}
function bound(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 0x7fffffff)
    throw new RangeError(name + ' must be a positive 31-bit integer');
  return value;
}
function dimensions(width, height, maxPixels) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > 0x7fffffff || height > 0x7fffffff ||
      width * height > maxPixels || width * height > 0x1fffffff)
    throw new RangeError('PNG dimensions exceed maxPixels or buffer bounds');
  const size = width * height * 4;
  if (size + height > 0x7fffffff) throw new RangeError('PNG scanline byte limit');
  return size;
}
function createImage(input) {
  const p = options(input, ['width', 'height', 'maxPixels']);
  const size = dimensions(p.width, p.height, bound(p.maxPixels, 16000000, 'maxPixels'));
  // A new fixture is transparent black. Never expose uninitialized pixel memory.
  return {width: p.width, height: p.height, data: Buffer.alloc(size), gamma: 0,
    depth: 8, interlace: false, palette: false, color: true, alpha: true, bpp: 4, colorType: 6};
}
function chunk(type, bytes) {
  const out = Buffer.allocUnsafe(bytes.length + 12);
  out.writeUInt32BE(bytes.length, 0);
  out.write(type, 4, 4, 'ascii');
  bytes.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4);
  return out;
}
function write(image, input) {
  const p = options(input, ['maxPixels', 'maxBytes']);
  const maxPixels = bound(p.maxPixels, 16000000, 'maxPixels');
  const maxBytes = bound(p.maxBytes, 10 * 1024 * 1024, 'maxBytes');
  if (!image || typeof image !== 'object') throw new TypeError('PNG image must be an object');
  const {width, height, data} = image;
  const size = dimensions(width, height, maxPixels);
  if (!isUint8Array(data) || data.byteLength !== size)
    throw new TypeError('PNG data must contain exactly width * height * 4 RGBA8 bytes');
  const gamma = image.gamma === undefined ? 0 : image.gamma;
  if (typeof gamma !== 'number' || !Number.isFinite(gamma) || gamma < 0 ||
      gamma > 0xffffffff / 100000 || gamma > 0 && Math.round(gamma * 100000) === 0)
    throw new RangeError('PNG gamma must be zero or a representable positive value');
  const overhead = gamma ? 73 : 57;
  if (maxBytes <= overhead) throw new RangeError('PNG output exceeds maxBytes');

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; // RGBA8, non-interlaced.
  const stride = width * 4, raw = Buffer.allocUnsafe(size + height);
  // Sub on the first row and Up thereafter keep flat fixtures compact and avoid
  // scanning every row five times. Input pixels are never changed.
  for (let y = 0; y < height; y++) {
    const src = y * stride, dst = y * (stride + 1);
    raw[dst] = y ? 2 : 1;
    for (let x = 0; x < stride; x++)
      raw[dst + x + 1] = data[src + x] - (y ? data[src - stride + x] : x >= 4 ? data[src + x - 4] : 0);
  }
  // Bound encoded output during compression, not only after constructing it.
  const compressed = deflateSync(raw, {level: 9, strategy: 3, maxOutputLength: maxBytes - overhead});
  const parts = [signature, chunk('IHDR', header)];
  if (gamma) {
    const value = Buffer.allocUnsafe(4); value.writeUInt32BE(Math.round(gamma * 100000));
    parts.push(chunk('gAMA', value));
  }
  parts.push(chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0)));
  const output = Buffer.concat(parts);
  if (output.length > maxBytes) throw new RangeError('PNG output exceeds maxBytes');
  return output;
}
module.exports = {createImage, write};
