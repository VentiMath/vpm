'use strict';
const {sizeOf, alphabetOf, urlAlphabet} = require('./engine.cjs');
function customAlphabet(alphabet, defaultSize = 21) {
  alphabetOf(alphabet); sizeOf(defaultSize);
  return function generate(size = defaultSize) {
    sizeOf(size); let id = '';
    for (let i = 0; i < size; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
    return id;
  };
}
// PostCSS asks for six characters. Its fixed length is already validated by
// strict equality, and a direct path avoids the generic alphabet closure/loop.
// Keep one fresh Math.random() draw per symbol, including the general path.
function nanoid(size = 21) {
  if (size === 6) return urlAlphabet[(Math.random() * 64) | 0]
    + urlAlphabet[(Math.random() * 64) | 0]
    + urlAlphabet[(Math.random() * 64) | 0]
    + urlAlphabet[(Math.random() * 64) | 0]
    + urlAlphabet[(Math.random() * 64) | 0]
    + urlAlphabet[(Math.random() * 64) | 0];
  sizeOf(size);
  let id = '';
  for (let i = 0; i < size; i++) id += urlAlphabet[(Math.random() * 64) | 0];
  return id;
}
module.exports = {nanoid, customAlphabet};
