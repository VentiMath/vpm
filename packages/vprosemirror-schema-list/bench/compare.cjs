"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/prosemirror-schema-list-conformance",
  ),
  out = path.join(fixture, "node_modules/.vpm-schema-list"),
  upstream = path.join(fixture, "node_modules/prosemirror-schema-list");
function setup(file, whole = false) {
  const A = require(
    path.join(
      out,
      "api-" +
        (file === root ? (whole ? "vpm" : "current-vpm") : "upstream") +
        ".cjs",
    ),
  );
  const base = new A.M.Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      text: {},
    },
  });
  const s = new A.M.Schema({
    nodes: A.L.addListNodes(base.spec.nodes, "paragraph block*", "block"),
  });
  const p = (text) => s.node("paragraph", null, text ? s.text(text) : null),
    li = (...children) => s.node("list_item", null, children),
    ul = (...children) => s.node("bullet_list", null, children);
  const state = (children, a, b = a) => {
    const doc = s.node("doc", null, children);
    return A.S.EditorState.create({
      doc,
      selection: A.S.TextSelection.create(doc, a, b),
    });
  };
  const locate = (doc, text) => {
    let pos;
    doc.descendants((n, p) => {
      if (n.isText && n.text === text) pos = p;
    });
    return pos;
  };
  return { A, s, p, li, ul, state, locate };
}
function prepare(file, which, whole = false) {
  const x = setup(file, whole),
    { A, s, p, li, ul, state, locate } = x;
  let st, cmd;
  if (which === "wrap") {
    const nodes = Array.from({ length: 12 }, (_, i) => p("line " + i)),
      doc = s.node("doc", null, nodes);
    st = state(nodes, 1, doc.content.size - 1);
    cmd = A.L.wrapInList(s.nodes.bullet_list);
  }
  if (which === "split") {
    st = state([ul(li(p("abcdefghijklmnop")))], 11);
    cmd = A.L.splitListItem([s.nodes.list_item]);
  }
  if (which === "sink") {
    const node = ul(
        ...Array.from({ length: 16 }, (_, i) => li(p("item " + i))),
      ),
      doc = s.node("doc", null, [node]);
    st = state([node], locate(doc, "item 4"), locate(doc, "item 9") + 6);
    cmd = A.L.sinkListItem(s.nodes.list_item);
  }
  if (which === "lift") {
    const node = ul(
      ...Array.from({ length: 12 }, (_, i) => li(p("item " + i))),
    );
    st = state([node], 3, node.nodeSize - 3);
    cmd = A.L.liftListItem(s.nodes.list_item);
  }
  if (which === "nested") {
    const node = ul(li(p("outer"), ul(li(p("a")), li(p("b")), li(p("c"))))),
      doc = s.node("doc", null, [node]);
    st = state([node], locate(doc, "b"));
    cmd = A.L.liftListItem(s.nodes.list_item);
  }
  if (which === "empty") {
    const node = ul(li(p("outer"), ul(li(p("prior")), li(p("")))));
    st = state([node], node.nodeSize - 5);
    cmd = A.L.splitListItem(s.nodes.list_item);
  }
  if (which === "query") {
    const node = ul(li(p("a")), li(p("b")));
    st = state([node], 8);
    cmd = A.L.sinkListItem(s.nodes.list_item);
    return () => cmd(st);
  }
  return () => {
    let tr;
    const ok = cmd(st, (t) => (tr = t));
    if (!ok) throw Error("Benchmark command failed " + which);
    return tr.doc;
  };
}
const cases = [
  [
    "wrap 12 paragraphs",
    "wrap",
    false,
    (d) => assert.equal(d.firstChild.childCount, 12),
  ],
  [
    "split a list item (type array)",
    "split",
    false,
    (d) => assert.equal(d.firstChild.childCount, 2),
  ],
  [
    "sink six items under a predecessor",
    "sink",
    false,
    (d) => assert.equal(d.firstChild.childCount, 10),
  ],
  [
    "lift 12 items out of a list",
    "lift",
    false,
    (d) => assert.equal(d.childCount, 12),
  ],
  [
    "lift a nested item with a following sibling",
    "nested",
    false,
    (d) => assert.equal(d.firstChild.childCount, 2),
  ],
  [
    "split an empty nested item",
    "empty",
    false,
    (d) => assert.equal(d.firstChild.childCount, 2),
  ],
  [
    "query whether an item can sink",
    "query",
    false,
    (d) => assert.equal(d, true),
  ],
  [
    "full VPM stack: wrap 12 paragraphs",
    "wrap",
    true,
    (d) => assert.equal(d.firstChild.childCount, 12),
  ],
  [
    "full VPM stack: lift 12 items",
    "lift",
    true,
    (d) => assert.equal(d.childCount, 12),
  ],
].map(([name, which, whole, validate]) => ({
  name,
  make: (file) => prepare(file, which, whole),
  validate,
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.ts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/prosemirror-schema-list-conformance/build.cjs",
      "../../scripts/prosemirror-schema-list-conformance/package-lock.json",
      ...["upstream", "current-vpm", "vpm"].map(
        (v) =>
          "../../scripts/prosemirror-schema-list-conformance/node_modules/.vpm-schema-list/api-" +
          v +
          ".cjs",
      ),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
