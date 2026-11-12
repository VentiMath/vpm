"use strict";
const crypto = require("node:crypto"),
  base = require("./index.cjs"),
  { bytes } = require("./input.cjs");
const input = (value) => {
  if (typeof value === "string") {
    if (!value.isWellFormed()) throw new URIError("Malformed UTF-16 string");
    return value;
  }
  return bytes(value);
};
function SHA256(value) {
  return new base.lib.WordArray(
    crypto.createHash("sha256").update(input(value)).digest(),
  );
}
function HmacSHA256(value, key) {
  return new base.lib.WordArray(
    crypto.createHmac("sha256", input(key)).update(input(value)).digest(),
  );
}
module.exports = { ...base, SHA256, HmacSHA256 };
