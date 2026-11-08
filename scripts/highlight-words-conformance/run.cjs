"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const upstream = require("highlight-words").default,
  entry =
    process.env.VPM_HIGHLIGHT_ENTRY ||
    path.resolve(__dirname, "../../packages/vhighlight-words"),
  vpm = require(entry).default;
const plain = (chunks) => chunks.map(({ text, match }) => ({ text, match }));
for (const [file, hash] of Object.entries(require("./upstream/hashes.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex"),
    hash,
  );
let tests = 0;
for (const api of [upstream, vpm]) {
  const fn = new Function(
    "highlightWords",
    "describe",
    "test",
    "expect",
    "vi",
    fs.readFileSync(
      path.join(__dirname, "node_modules/.vpm-highlight/tests.cjs"),
      "utf8",
    ),
  );
  // Upstream mocks every key to '1'; normalize only that deliberately mocked field.
  fn(
    (o) => api(o).map((c) => ({ ...c, key: "1" })),
    (_name, fn) => fn(),
    (_name, fn) => {
      fn();
      tests++;
    },
    (value) => ({ toEqual: (expected) => assert.deepEqual(value, expected) }),
    { mock: () => {} },
  );
}
let seed = 74301;
const random = (n) =>
  ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) >>> 8) % n;
const words = [
  "alpha",
  "BETA",
  "gamma",
  "DELTA",
  "a+b",
  "x.y",
  "[z]",
  "école",
  "😀",
];
for (let i = 0; i < 6000; i++) {
  const text = Array.from(
    { length: 1 + random(20) },
    () => words[random(words.length)],
  ).join(" ");
  const query = Array.from(
    { length: 1 + random(3) },
    () => words[random(words.length)],
  ).join(i % 7 === 0 ? "  " : " ");
  const options = {
    text,
    query,
    matchExactly: i % 3 === 0,
    clipBy: i % 4 === 0 ? 1 + random(6) : undefined,
  };
  assert.deepEqual(
    plain(vpm(options)),
    plain(upstream(options)),
    JSON.stringify(options),
  );
  if (!options.clipBy)
    assert.equal(
      vpm(options)
        .map((c) => c.text)
        .join(""),
      text,
    );
}
// Independent per-character mask for arbitrary adjacent literal matches.
for (let i = 0; i < 3000; i++) {
  const text = Array.from(
    { length: random(60) },
    () => ["a", "b", "😀", "ç"][random(4)],
  ).join("");
  const query = ["a", "b", "😀", "ç"][random(4)];
  const chunks = vpm({ text, query });
  assert.equal(chunks.map((c) => c.text).join(""), text);
  for (const c of chunks) assert.equal(c.match, c.text === query);
  assert.equal(new Set(chunks.map((c) => c.key)).size, chunks.length);
}
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  load = require("./load.cjs"),
  props = require("./props.cjs");
const a = load(require.resolve("highlight-words")),
  b = load(entry);
let callers = 0;
for (const text of [
  "Algebra study guide",
  "study guide and study notes",
  "A+B practice",
  2026,
])
  for (const query of ["study", "guide algebra", "a+b", 2026])
    for (const exact of [true, false])
      for (const column of [true, false]) {
        const p = props({ text, query, exact, column });
        assert.equal(
          renderToStaticMarkup(React.createElement(b, p)),
          renderToStaticMarkup(React.createElement(a, p)),
        );
        callers++;
      }
console.log(
  `${tests / 2} unchanged public upstream tests per implementation, 6000 differential cases, 3000 reconstruction/mask cases and ${callers} unchanged MRT cell SSR cases pass.`,
);
