"use strict";
const encoded = require("./unicode.cjs");
// Four two-bit classifications per byte, with identical 256-code-point pages shared.
const pages = atob(encoded.pages),
  blocks = atob(encoded.blocks);
function unicodeClass(cp) {
  const block = pages.charCodeAt(cp >>> 8);
  return (
    (blocks.charCodeAt(block * 64 + ((cp & 255) >>> 2)) >>> ((cp & 3) * 2)) & 3
  );
}
function asciiStart(cp) {
  return ((cp | 32) >= 97 && (cp | 32) <= 122) || cp === 36 || cp === 95;
}
function asciiContinue(cp) {
  return asciiStart(cp) || (cp >= 48 && cp <= 57);
}
function isIdentifierStart(cp) {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return false;
  return cp < 128 ? asciiStart(cp) : unicodeClass(cp) === 3;
}
function isIdentifierChar(cp) {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return false;
  return cp < 128 ? asciiContinue(cp) : unicodeClass(cp) !== 0;
}
function isIdentifierName(name) {
  if (typeof name !== "string" || !name.length) return false;
  let cp = name.codePointAt(0);
  if (!(cp < 128 ? asciiStart(cp) : unicodeClass(cp) === 3)) return false;
  for (let i = cp > 0xffff ? 2 : 1; i < name.length; i++) {
    cp = name.charCodeAt(i);
    if (cp < 128) {
      if (!asciiContinue(cp)) return false;
      continue;
    }
    if (cp >= 0xd800 && cp <= 0xdbff) {
      cp = name.codePointAt(i);
      if (cp > 0xffff) i++;
    }
    if (!unicodeClass(cp)) return false;
  }
  return true;
}
const keywords = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with".split(
    " ",
  ),
);
const strict = new Set(
  "implements interface let package private protected public static yield".split(
    " ",
  ),
);
const isKeyword = (word) => keywords.has(word);
const isReservedWord = (word, inModule) =>
  word === "enum" || (word === "await" && !!inModule);
const isStrictReservedWord = (word, inModule) =>
  strict.has(word) || isReservedWord(word, inModule);
const isStrictBindOnlyReservedWord = (word) =>
  word === "arguments" || word === "eval";
const isStrictBindReservedWord = (word, inModule) =>
  isStrictBindOnlyReservedWord(word) || isStrictReservedWord(word, inModule);
module.exports = {
  isIdentifierStart,
  isIdentifierChar,
  isIdentifierName,
  isKeyword,
  isReservedWord,
  isStrictReservedWord,
  isStrictBindOnlyReservedWord,
  isStrictBindReservedWord,
};
