'use strict';
const {pages, digits} = require('./lib/data.js');
const nonAscii = /[\u0660-\uffff]/;

function anynum(value) {
  if (typeof value !== 'string') return value;
  const first = value.search(nonAscii);
  if (first < 0) return value;
  const result = [];
  let start = 0;
  for (let i = first; i < value.length; i++) {
    let cp = value.charCodeAt(i);
    if (cp < 0x660) continue;
    let size = 1, digit;
    if (cp === 0x2212 || cp === 0xff0d || cp === 0xfe63) digit = '-';
    else {
      if (cp >= 0xd800 && cp <= 0xdbff) {
        cp = value.codePointAt(i);
        if (cp > 0xffff) size = 2;
      }
      const page = pages[cp >>> 8];
      if (page) {
        const code = digits[(page << 8) + (cp & 255)];
        if (code) digit = String.fromCharCode(code);
      }
    }
    if (digit !== undefined) {
      if (start < i) result.push(start + 1 === i ? value[start] : value.slice(start, i));
      result.push(digit);
      start = i + size;
    }
    i += size - 1;
  }
  if (start === 0) return value;
  if (start < value.length) result.push(value.slice(start));
  return result.join('');
}
module.exports = anynum;
module.exports.anynum = anynum;
