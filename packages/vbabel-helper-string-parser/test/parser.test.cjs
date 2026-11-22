"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const own = require("..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const control = fixture("@babel/helper-string-parser");
function capture(
  api,
  method,
  args,
  { bail = false, returnErrors = false } = {},
) {
  const events = [];
  const errors = new Proxy(
    {},
    {
      get(_, name) {
        return (...args) => {
          events.push([name, ...args]);
          if (!returnErrors && name === "unterminated")
            throw new SyntaxError("unterminated");
        };
      },
    },
  );
  try {
    return [
      api[method](...args, errors, ...(method === "readInt" ? [bail] : [])),
      events,
    ];
  } catch (err) {
    return [err.name, events];
  }
}
test("raw and cooked chunks, terminators and UTF-16 positions", () => {
  const parts = [
    "",
    "text",
    "😀",
    "\\0",
    "\\1",
    "\\48",
    "\\u0061",
    "\\u{1F600}",
    "\\u{10ffff}",
    "\\u{110000}",
    "\\u{}",
    "\\u{z}",
    "\\u{abc",
    "\\u12qz",
    "\\x41",
    "\\xq",
    "\\x0_",
    "\\x_2",
    "\\7",
    "\\08",
    "\\333",
    "\\777",
    "\\n",
    "\\t",
    "\\$",
    "\\\x60",
    "\\\r\n",
    "\\\r",
    "\\\u2028",
    "\r\n",
    "\r",
    "\n",
    "\u2028",
    "\u2029",
    "\${",
    "\x60",
    "\\",
    "'",
    '"',
  ];
  for (const type of ["template", "single", "double"]) {
    const end = { template: "\x60", single: "'", double: '"' }[type];
    for (const left of parts)
      for (const right of parts) {
        const args = [type, "123" + left + right + end + "tail", 3, 1, 12];
        assert.deepEqual(
          capture(own, "readStringContents", args),
          capture(control, "readStringContents", args),
          JSON.stringify(args),
        );
      }
  }
});
test("numeric helpers report specific digits, separators and source positions", () => {
  for (const radix of [2, 8, 10, 16])
    for (const sample of [
      "0",
      "1",
      "97",
      "12e",
      "a_F",
      "1__b",
      "1_2",
      "_5",
      "5_",
      "z",
      "10.",
      "+_3",
      "01_4",
      "",
    ]) {
      for (const width of [null, 1, 4])
        for (const force of [false, true])
          for (const separator of [false, true, "bail"])
            for (const bail of [false, true]) {
              if (width === null && force) continue; // fixed-width recovery requires a finite width
              const args = [
                "#" + sample,
                1,
                0,
                5,
                radix,
                width,
                force,
                separator,
              ];
              assert.deepEqual(
                capture(own, "readInt", args, { bail }),
                capture(control, "readInt", args, { bail }),
                JSON.stringify(args),
              );
            }
    }
  for (const s of [
    "0041",
    "007f",
    "dfff",
    "{10ffff}",
    "{110000}",
    "{}",
    "{123",
    "{a_0}",
    "{Z}",
    "b",
  ])
    for (const report of [false, true]) {
      const args = ["xx" + s, 2, 1, 9, report];
      assert.deepEqual(
        capture(own, "readCodePoint", args),
        capture(control, "readCodePoint", args),
      );
    }
});
test("recovering diagnostics preserve newlines and permit re-entry", () => {
  let nested;
  const e = {
    unterminated() {
      nested = own.readStringContents(
        "template",
        "nested\x60",
        0,
        0,
        1,
        {},
      ).str;
    },
  };
  const result = own.readStringContents("single", "before\nafter", 0, 0, 1, e);
  assert.equal(result.str, "before");
  assert.equal(result.pos, 6);
  assert.equal(nested, "nested");
});
test("ESM and CommonJS export the same helpers", async () => {
  const esm = await import("vbabel-helper-string-parser");
  for (const k of Object.keys(own)) assert.equal(esm[k], own[k]);
});

test("a nested parse during numeric recovery leaves the outer cursor intact", () => {
  for (const api of [control, own]) {
    let nested;
    const errors = {
      numericSeparatorInEscapeSequence() {
        nested = api.readStringContents(
          "template",
          "left\x60right",
          0,
          0,
          1,
          {},
        ).str;
      },
    };
    const result = api.readStringContents(
      "double",
      'a\\x_1z"tail',
      0,
      0,
      1,
      errors,
    );
    assert.equal(nested, "left");
    assert.equal(result.str, "a\x01z");
    assert.equal(result.pos, 6);
  }
});

test("short complete templates and scanner boundaries agree with Babel", () => {
  for (const size of [0, 1, 12, 22, 23, 24, 25, 26])
    for (const ending of [
      "",
      "$",
      "\${x}",
      "\x60tail",
      "\\x41",
      "\\u12z",
      "\r",
      "\r\n",
      "\u2028",
      "\u2029",
      "😀",
    ]) {
      const args = ["template", "x".repeat(size) + ending, 0, 0, 1];
      assert.deepEqual(
        capture(own, "readStringContents", args, { returnErrors: true }),
        capture(control, "readStringContents", args, { returnErrors: true }),
      );
    }
});
