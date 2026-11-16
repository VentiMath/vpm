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
module.exports = {nanoid: customAlphabet(urlAlphabet), customAlphabet};
