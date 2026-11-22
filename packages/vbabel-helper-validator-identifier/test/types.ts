import {
  isIdentifierName,
  isIdentifierChar,
  isStrictBindReservedWord,
} from "vbabel-helper-validator-identifier";
isIdentifierName("abc");
isIdentifierChar(0x3c0);
isStrictBindReservedWord("await", true);
// @ts-expect-error A code point is a number.
isIdentifierChar("x");
