"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  decode = require("..");
const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url"),
  header = encode({ alg: "none", typ: "JWT" }),
  token = (value) => header + "." + encode(value) + ".ignored";
test("current named and app default CommonJS imports share one decoder", () => {
  assert.equal(decode, decode.jwtDecode);
  assert.equal(decode, decode.default);
  assert.deepEqual(decode(token({ id: "mock-user" })), { id: "mock-user" });
});
test("header selection is explicit and signature is never authenticated", () => {
  assert.deepEqual(decode(token({ id: 1 }), { header: true }), {
    alg: "none",
    typ: "JWT",
  });
  assert.deepEqual(decode(token({ id: 1 }), { header: 1 }), { id: 1 });
  assert.deepEqual(decode(header + "." + encode({ id: 2 }) + ".forged"), {
    id: 2,
  });
});
test("UTF-8 and literal percent text survive without URI interpretation", () => {
  for (const name of ["é", "李明", "ليلى", "🧮", "%E0%A4%A", "\u0000"])
    assert.deepEqual(decode(token({ name })), { name });
});
test("malformed UTF-8 preserves the documented legacy Latin-1 behavior", () => {
  assert.equal(
    decode(header + "." + Buffer.from([34, 233, 34]).toString("base64url")),
    "é",
  );
});
test("malformed type, segment, encoding and JSON throw the public error class", () => {
  for (const [input, message] of [
    [null, "must be a string"],
    ["x", "missing part #2"],
    ["x.!", "invalid base64"],
    ["x.eA", "invalid json"],
  ])
    assert.throws(
      () => decode(input),
      (e) =>
        e instanceof decode.InvalidTokenError && e.message.includes(message),
    );
});
test("BOM is not silently removed, and each result is fresh", () => {
  assert.throws(
    () => decode(header + "." + Buffer.from("\ufeff{}").toString("base64url")),
    decode.InvalidTokenError,
  );
  const input = token({ nested: { x: 1 } }),
    a = decode(input),
    b = decode(input);
  a.nested.x = 2;
  assert.equal(b.nested.x, 1);
});
test("prototype-looking keys remain JSON data", () => {
  const value = decode(
    header +
      "." +
      Buffer.from('{"__proto__":{"polluted":true},"constructor":1}').toString(
        "base64url",
      ),
  );
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.equal(Object.hasOwn(value, "__proto__"), true);
  assert.equal({}.polluted, undefined);
});
