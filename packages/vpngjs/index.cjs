'use strict';
const {inflateSync, crc32} = require('node:zlib');
const {isUint8Array} = require('node:util').types;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};
const depths = {0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16]};
const adam7 = [[0,0,8,8], [4,0,8,8], [0,4,4,8], [2,0,4,4], [0,2,2,4], [1,0,2,2], [0,1,1,2]];
function fail(message) { throw new Error('Invalid PNG: ' + message); }
function limit(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 0x7fffffff) throw new RangeError(name + ' must be a positive 31-bit integer');
  return value;
}
function read(input, options = {}) {
  if (!isUint8Array(input)) throw new TypeError('PNG input must be a Uint8Array');
  if (options === null) options = {};
  if (typeof options !== 'object') throw new TypeError('PNG options must be an object');
  for (const key of Object.keys(options)) if (!['checkCRC', 'maxPixels', 'maxBytes'].includes(key)) throw new TypeError('Unsupported PNG option: ' + key);
  const checkCRC = options.checkCRC ?? true;
  if (typeof checkCRC !== 'boolean') throw new TypeError('checkCRC must be boolean');
  const maxPixels = limit(options.maxPixels, 16000000, 'maxPixels');
  const maxBytes = limit(options.maxBytes, 10 * 1024 * 1024, 'maxBytes');
  if (input.byteLength > maxBytes) fail('input exceeds maxBytes');
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(signature)) fail('signature');
  let width, height, depth, colorType, bpp, interlace, palette, transColor, gamma = 0;
  let pos = 8, seenData = false, endedData = false, ended = false, seenTransparency = false, seenGamma = false;
  const compressed = [];
  while (pos < bytes.length) {
    if (bytes.length - pos < 12) fail('truncated chunk');
    const length = bytes.readUInt32BE(pos), end = pos + 8 + length;
    if (length > 0x7fffffff || length > bytes.length - pos - 12) fail('chunk length');
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    for (let n = pos + 4; n < pos + 8; n++) if (!(bytes[n] >= 65 && bytes[n] <= 90 || bytes[n] >= 97 && bytes[n] <= 122)) fail('chunk type');
    if (bytes[pos + 6] & 32) fail('reserved chunk type bit');
    if (checkCRC && crc32(bytes.subarray(pos + 4, end)) !== bytes.readUInt32BE(end)) fail('CRC for ' + type);
    if (width === undefined && type !== 'IHDR') fail('IHDR must be first');
    const data = bytes.subarray(pos + 8, end);
    if (type !== 'IDAT' && seenData) endedData = true;
    switch (type) {
      case 'IHDR':
        if (width !== undefined || length !== 13) fail('IHDR length or repetition');
        width = data.readUInt32BE(0); height = data.readUInt32BE(4);
        depth = data[8]; colorType = data[9]; interlace = data[12];
        if (!width || !height || width > 0x7fffffff || height > 0x7fffffff || width * height > maxPixels || width * height > 0x1fffffff) fail('dimensions exceed maxPixels or buffer bounds');
        if (!Object.hasOwn(depths, colorType) || !depths[colorType].includes(depth)) fail('color type / depth');
        if (data[10] !== 0 || data[11] !== 0 || interlace > 1) fail('compression, filter or interlace method');
        bpp = channels[colorType];
        break;
      case 'PLTE':
        if (palette || seenData || seenTransparency || !length || length % 3 || length > 768 || colorType === 0 || colorType === 4 || colorType === 3 && length / 3 > 2 ** depth) fail('palette');
        palette = Array.from({length: length / 3}, (_, n) => [data[n*3], data[n*3+1], data[n*3+2], 255]);
        break;
      case 'tRNS':
        if (seenTransparency || seenData || colorType === 4 || colorType === 6) fail('transparency ordering or type');
        seenTransparency = true;
        if (colorType === 3) {
          if (!palette || length > palette.length) fail('palette transparency');
          for (let n = 0; n < length; n++) palette[n][3] = data[n];
        } else {
          if (length !== bpp * 2) fail('transparency length');
          // PNG decoders must mask unused high bits in transparency keys.
          transColor = Array.from({length: bpp}, (_, n) => data.readUInt16BE(n*2) & (2 ** depth - 1));
        }
        break;
      case 'gAMA':
        if (seenGamma || seenData || palette || length !== 4 || data.readUInt32BE(0) === 0) fail('gamma');
        gamma = data.readUInt32BE(0) / 100000; seenGamma = true;
        break;
      case 'IDAT':
        if (endedData || colorType === 3 && !palette) fail('image data ordering');
        seenData = true; compressed.push(data);
        break;
      case 'IEND':
        if (!seenData || length || end + 4 !== bytes.length) fail('image end or trailing data');
        ended = true;
        break;
      default:
        if (!(bytes[pos + 4] & 32)) fail('unknown critical chunk ' + type);
    }
    pos = end + 4;
  }
  if (!ended) fail('missing IEND');
  // Derive an exact inflate bound for all passes before allocating pixels.
  const passes = (interlace ? adam7 : [[0,0,1,1]]).map(([x,y,dx,dy]) => {
    const w = Math.max(0, Math.ceil((width-x)/dx)), h = Math.max(0, Math.ceil((height-y)/dy));
    return {x,y,dx,dy,w,h,rowBytes: Math.ceil(w*bpp*depth/8)};
  }).filter(p => p.w && p.h);
  const expected = passes.reduce((sum,p) => sum + p.h*(p.rowBytes+1), 0);
  if (expected > 0x7fffffff) fail('inflated byte limit');
  const packed = compressed.length === 1 ? compressed[0] : Buffer.concat(compressed);
  // PNG permits unused padding after the zlib stream in the final IDAT.
  // inflateSync validates the complete stream and ignores that padding.
  const raw = inflateSync(packed, {maxOutputLength: expected});
  if (raw.length !== expected) fail('inflated scanline length');
  const output = Buffer.allocUnsafe(width*height*4), filterStep = Math.max(1, Math.ceil(bpp*depth/8));
  let cursor = 0;
  for (const pass of passes) {
    let previous;
    for (let py = 0; py < pass.h; py++) {
      const filter = raw[cursor++], row = raw.subarray(cursor, cursor + pass.rowBytes); cursor += pass.rowBytes;
      if (filter > 4) fail('scanline filter');
      if (filter) for (let i = 0; i < row.length; i++) {
        const a = i < filterStep ? 0 : row[i-filterStep], b = previous ? previous[i] : 0;
        let predictor;
        if (filter === 1) predictor = a;
        else if (filter === 2) predictor = b;
        else if (filter === 3) predictor = (a+b) >>> 1;
        else {
          const c = previous && i >= filterStep ? previous[i-filterStep] : 0;
          const p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
          predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        row[i] = row[i] + predictor;
      }
      const y = pass.y + py*pass.dy;
      if (colorType === 6 && depth === 8 && pass.dx === 1) row.copy(output, (y*width+pass.x)*4);
      else {
        const maximum = 2 ** depth - 1;
        for (let px = 0; px < pass.w; px++) {
          const offset = (y*width + pass.x + px*pass.dx)*4, sample = px*bpp;
          const at = n => depth === 16 ? row.readUInt16BE(n*2) : depth === 8 ? row[n] : row[(n*depth)>>>3] >>> (8-depth-((n*depth)&7)) & maximum;
          const r = at(sample), g = bpp >= 3 ? at(sample+1) : r, b = bpp >= 3 ? at(sample+2) : r;
          let a = colorType === 4 ? at(sample+1) : colorType === 6 ? at(sample+3) : maximum;
          if (colorType === 3) {
            const entry = palette[r]; if (!entry) fail('palette index');
            output[offset]=entry[0]; output[offset+1]=entry[1]; output[offset+2]=entry[2]; output[offset+3]=entry[3];
          } else if (transColor && r === transColor[0] && (colorType === 0 || g === transColor[1] && b === transColor[2])) {
            // pngjs normalizes transparent-key pixels to transparent black.
            output.fill(0, offset, offset+4);
          } else {
            output[offset]=Math.round(r*255/maximum); output[offset+1]=Math.round(g*255/maximum); output[offset+2]=Math.round(b*255/maximum); output[offset+3]=Math.round(a*255/maximum);
          }
        }
      }
      previous = row;
    }
  }
  const decoded = {width,height,depth,interlace:!!interlace,palette:palette || !!(colorType&1),color:!!(colorType&2),alpha:!!(colorType&4)||seenTransparency,bpp,colorType,data:output,gamma};
  if (transColor) decoded.transColor = transColor;
  return decoded;
}
exports.PNG = {sync: {read}};
