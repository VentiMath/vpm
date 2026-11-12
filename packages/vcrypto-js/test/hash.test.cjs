"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  api = require(process.env.VPM_CRYPTO_NATIVE ? "../index.native.cjs" : "..");
test("padding boundaries and empty input match native SHA256", () => {
  for (const size of [0, 1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 4096]) {
    const value = "x".repeat(size);
    assert.equal(
      api.SHA256(value).toString(),
      crypto.createHash("sha256").update(value).digest("hex"),
    );
  }
});
test("partial WordArrays and typed-array views hash only selected bytes", () => {
  const backing = Uint8Array.of(99, 1, 2, 3, 4, 99),
    view = backing.subarray(1, 5),
    word = api.lib.WordArray.create([0x010203ff], 3);
  assert.equal(
    api.SHA256(view).toString(),
    crypto.createHash("sha256").update(view).digest("hex"),
  );
  assert.equal(word.toString(), "010203");
  assert.equal(
    api.SHA256(word).toString(),
    crypto
      .createHash("sha256")
      .update(Uint8Array.of(1, 2, 3))
      .digest("hex"),
  );
});
test("hashes and HMAC never mutate caller key or message words", () => {
  const message = api.enc.Utf8.parse("contest"),
    key = api.enc.Hex.parse("ab".repeat(100));
  const before = JSON.stringify([message, key]);
  api.SHA256(message);
  api.HmacSHA256(message, key);
  assert.equal(JSON.stringify([message, key]), before);
});
test("clones and concatenation do not alias prior word storage", () => {
  const a = api.enc.Hex.parse("aabbcc"),
    b = a.clone();
  b.concat(api.enc.Hex.parse("ddeeff"));
  assert.equal(a.toString(), "aabbcc");
  assert.equal(b.toString(), "aabbccddeeff");
  b.clamp();
  assert.equal(b.words.length, 2);
});
test("invalid Unicode and malformed encoded input reject instead of silently changing bytes", () => {
  for (const s of ["\ud800", "x\udfff"])
    assert.throws(() => api.SHA256(s), URIError);
  assert.throws(
    () => api.enc.Utf8.stringify(api.enc.Hex.parse("c0af")),
    /Malformed/,
  );
  for (const s of ["f", "xz", "aa-bb"])
    assert.throws(() => api.enc.Hex.parse(s), /hexadecimal/);
  for (const s of ["!", "A", "Zg===="])
    assert.throws(() => api.enc.Base64.parse(s), /Base64/);
  assert.throws(() => api.lib.WordArray.create([1], -1), /length/);
});
test("UTF8 preserves BOM and HMAC supports keys longer than one block", () => {
  assert.equal(
    api.enc.Utf8.stringify(api.enc.Utf8.parse("\ufeffmath")),
    "\ufeffmath",
  );
  const key = "κ".repeat(130);
  assert.equal(
    api.HmacSHA256("payload", key).toString(),
    crypto.createHmac("sha256", key).update("payload").digest("hex"),
  );
});
