"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const entry =
  process.env.VPM_KEYNAME_ENTRY || path.resolve(__dirname, "../index.cjs");
const upstream = path.resolve(
  __dirname,
  "../../../scripts/keyname-conformance/node_modules/w3c-keyname/index.cjs",
);
function load(file, navigator) {
  const exports = {},
    sandbox = { exports, module: { exports } };
  if (navigator) sandbox.navigator = navigator;
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, {
    filename: file,
  });
  return sandbox.module.exports;
}
const environments = [
  undefined,
  { platform: "Linux x86_64", userAgent: "Chrome/145" },
  { platform: "Win32", userAgent: "Chrome/145" },
  { platform: "MacIntel", userAgent: "Version/19 Safari/620" },
  { platform: "iPad", userAgent: "Version/19 Safari/620" },
  {
    platform: "Win32",
    userAgent: "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
  },
  {
    platform: "Win32",
    userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1)",
  },
];
test("both complete lookup tables match 2.2.8 and remain mutable", () => {
  const v = load(entry),
    u = load(upstream);
  for (const name of ["base", "shift"]) {
    assert.deepEqual(Object.entries(v[name]), Object.entries(u[name]));
    assert.equal(Object.getPrototypeOf(v[name]), null);
    for (let code = 0; code < 512; code++)
      assert.equal(v[name][code], u[name][code]);
    v[name][250] = "Custom";
    assert.equal(
      v.keyName({ keyCode: 250, shiftKey: name === "shift" }),
      "Custom",
    );
  }
  assert.equal(v.base[65], "a");
  assert.equal(v.shift[65], "A");
});
test("430,080 platform, modifier, key and code combinations match upstream", () => {
  const keys = [
    undefined,
    "",
    "Unidentified",
    "Esc",
    "Del",
    "Left",
    "Right",
    "Up",
    "Down",
    "a",
    "A",
    "é",
    "Dead",
    "Process",
    "🎵",
  ];
  let count = 0;
  for (const environment of environments) {
    const v = load(entry, environment),
      u = load(upstream, environment);
    for (const key of keys)
      for (let code = 0; code < 256; code++)
        for (let flags = 0; flags < 16; flags++) {
          const event = {
            key,
            keyCode: code,
            shiftKey: !!(flags & 1),
            metaKey: !!(flags & 2),
            ctrlKey: !!(flags & 4),
            altKey: !!(flags & 8),
          };
          assert.equal(
            v.keyName(event),
            u.keyName(event),
            JSON.stringify([environment, event]),
          );
          count++;
        }
  }
  assert.equal(count, 430080);
});
test("modern names preserve international characters, composition and unknown keys", () => {
  const v = load(entry, { platform: "Linux", userAgent: "Firefox" });
  for (const key of [
    "ß",
    "λ",
    "中",
    "é",
    "🎵",
    "Dead",
    "Process",
    "AltGraph",
    "F35",
    "AudioVolumeUp",
    " ",
  ])
    assert.equal(v.keyName({ key, keyCode: 65 }), key);
  for (const keyCode of [-1, 256, 65535, NaN, Infinity])
    assert.equal(v.keyName({ keyCode }), "Unidentified");
  assert.equal(v.keyName({ key: "Unidentified", keyCode: 13 }), "Enter");
  assert.equal(v.keyName({ key: "a", keyCode: 13 }), "a");
});
test("Mac Command+Shift fallback respects Control and Alt exclusions", () => {
  const v = load(entry, { platform: "MacIntel", userAgent: "Chrome" });
  const event = { key: "a", keyCode: 65, metaKey: true, shiftKey: true };
  assert.equal(v.keyName(event), "A");
  assert.equal(v.keyName({ ...event, ctrlKey: true }), "a");
  assert.equal(v.keyName({ ...event, altKey: true }), "a");
  assert.equal(v.keyName({ ...event, key: "λ", keyCode: 250 }), "λ");
});
test("inherited object names cannot become fallback key names", () => {
  const v = load(entry);
  for (const keyCode of [
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
  ])
    for (const shiftKey of [false, true])
      assert.equal(v.keyName({ keyCode, shiftKey }), "Unidentified");
  assert.equal(v.base.constructor, undefined);
  assert.equal(v.shift.toString, undefined);
});
test("the native key getter is read once without mutating the event", () => {
  const v = load(entry);
  let reads = 0;
  const event = Object.freeze({
    get key() {
      reads++;
      return "Esc";
    },
    keyCode: 27,
  });
  assert.equal(v.keyName(event), "Escape");
  assert.equal(reads, 1);
});
