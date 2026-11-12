"use strict";
const assert = require("node:assert/strict"),
  ours = require("../../packages/vjwt-decode"),
  controls = [require("jwt-decode").jwtDecode, require("jwt-decode-app")];
function observe(fn, token, options) {
  try {
    return { value: fn(token, options) };
  } catch (e) {
    return { error: e.name, kind: e.message.replace(/ \(.*/, "") };
  }
}
let checks = 0;
function compare(token, options) {
  for (const control of controls) {
    const actual = observe(ours, token, options),
      expected = observe(control, token, options);
    if (control === controls[1] && actual.error && expected.error) {
      delete actual.kind;
      delete expected.kind;
    }
    assert.deepEqual(actual, expected, JSON.stringify([token, options]));
    checks++;
  }
}
const encode = (x) => Buffer.from(JSON.stringify(x)).toString("base64url"),
  header = encode({ typ: "JWT", alg: "HS256", kid: "test" });
for (let n = 0; n < 2500; n++) {
  const value = {
    id: "user-" + n,
    name: ["Ada", "Émilie", "李明", "ليلى", "🧮", "a\u0000b"][n % 6],
    roles: ["student"],
    n,
    exp: 2100000000 + n,
  };
  const token = header + "." + encode(value) + ".signature";
  for (const options of [undefined, { header: true }, { header: false }])
    compare(token, options);
}
for (const token of [
  undefined,
  null,
  42,
  {},
  [],
  new String("x"),
  "",
  ".",
  "..",
  "x",
  "x.",
  "x.x",
  "x.e30",
  "e30.e30.",
  header + "." + encode(null),
  header + "." + encode([1, 2]),
  header + "." + encode("string"),
])
  for (const options of [
    undefined,
    { header: true },
    { header: false },
    { header: 1 },
    null,
  ])
    compare(token, options);
for (const text of [
  "",
  "{",
  "{}",
  "[]",
  "null",
  "false",
  "42",
  '"é"',
  "\ufeff{}",
  '{"__proto__":{"polluted":true}}',
  '{"name":"%E0%A4%A"}',
]) {
  const b = Buffer.from(text);
  for (const encoding of ["base64", "base64url"])
    compare(header + "." + b.toString(encoding) + ".sig");
}
for (const bytes of [
  [34, 233, 34],
  [34, 255, 34],
  [34, 195, 169, 34],
  [34, 192, 175, 34],
  [239, 187, 191, 123, 125],
])
  compare(header + "." + Buffer.from(bytes).toString("base64url"));
for (let n = 0; n < 256; n++) {
  const token = header + "." + String.fromCharCode(n);
  compare(token);
  compare(token + ".ignored");
}
console.log(
  checks + " current/app decoding and malformed-input comparisons pass",
);
