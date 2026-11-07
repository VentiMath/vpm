"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/prosemirror-view-conformance"),
  upstream = path.join(fixture, "node_modules/prosemirror-view");
function prepare(file, kind) {
  const D =
    file === root ? require(path.join(root, "decorations.cjs")) : require(file);
  // Isolate only the decoration implementation: both use the identical upstream
  // document and mapping implementation in each separate benchmark process.
  const M = require(path.join(fixture, "node_modules/prosemirror-model")),
    T = require(path.join(fixture, "node_modules/prosemirror-transform"));
  const s = new M.Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  const doc = s.node(
    "doc",
    null,
    Array.from({ length: 100 }, () =>
      s.node("paragraph", null, s.text("abcdefghij")),
    ),
  );
  const items = Array.from({ length: 100 }, (_, i) =>
    D.Decoration.inline(i * 12 + 1, i * 12 + 5, {}, { id: i }),
  );
  const set = D.DecorationSet.create(doc, items.slice());
  const tr = new T.Transform(doc).insert(3, s.text("!"));
  if (kind === "selection")
    return () =>
      D.DecorationSet.create(doc, [
        D.Decoration.inline(2, 8, { class: "selection" }),
      ]);
  if (kind === "create")
    return () => D.DecorationSet.create(doc, items.slice());
  if (kind === "find") return () => set.find(301, 311);
  if (kind === "map") return () => set.map(tr.mapping, tr.doc);
  if (kind === "add")
    return () => set.add(doc, [D.Decoration.widget(500, () => {})]);
  return () => set.remove([items[25]]);
}
const cases = [
  [
    "selection",
    "create one selection decoration",
    (v) => assert.equal(v.find().length, 1),
  ],
  [
    "create",
    "index 100 inline decorations",
    (v) => assert.equal(v.find().length, 100),
  ],
  ["find", "find in a narrow range", (v) => assert.equal(v.length, 1)],
  [
    "map",
    "map 100 decorations through one insertion",
    (v) => assert.equal(v.find().length, 100),
  ],
  [
    "add",
    "add one widget to 100 decorations",
    (v) => assert.equal(v.find().length, 101),
  ],
  [
    "remove",
    "remove one of 100 decorations",
    (v) => assert.equal(v.find().length, 99),
  ],
].map(([kind, name, validate]) => ({
  name,
  make: (file) => prepare(file, kind),
  validate,
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "decorations.cjs",
      "decorations.mjs",
      "decorations.d.ts",
      "decorations.d.mts",
      "package.json",
      "bench/compare.cjs",
      "../../scripts/prosemirror-view-conformance/package-lock.json",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
