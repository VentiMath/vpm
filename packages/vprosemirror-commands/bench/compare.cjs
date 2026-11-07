"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/prosemirror-commands-conformance",
  ),
  upstream = path.join(fixture, "node_modules/prosemirror-commands");
function prepare(file, shape = "text", from = 6, to = from) {
  const vpm = file === root,
    c = require(file),
    s = require(
      vpm
        ? "vprosemirror-state"
        : path.join(fixture, "node_modules/prosemirror-state"),
    ),
    m = require(
      vpm
        ? "vprosemirror-model"
        : path.join(fixture, "node_modules/prosemirror-model"),
    );
  const schema = new m.Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { group: "block", content: "text*" },
        heading: { group: "block", content: "text*" },
        code: { group: "block", content: "text*", code: true },
        quote: { group: "block", content: "block+" },
        list: { group: "block", content: "item+" },
        item: { content: "paragraph block*" },
        text: {},
      },
      marks: { em: {} },
    }),
    n = (name, ...children) => schema.node(name, null, children),
    t = (x) => schema.text(x);
  const doc =
    shape === "list"
      ? n(
          "doc",
          n(
            "list",
            n("item", n("paragraph"), n("code", t("0"))),
            n("item", n("paragraph")),
          ),
        )
      : n("doc", n("paragraph", t("alpha beta")), n("paragraph", t("gamma")));
  return {
    c,
    s,
    schema,
    state: s.EditorState.create({
      doc,
      selection: s.TextSelection.create(doc, from, to),
    }),
  };
}
function edit(x, command) {
  return () => {
    let tr;
    command(x.state, (next) => {
      tr = next;
    });
    return tr;
  };
}
const cases = [
  {
    name: "split a paragraph",
    make(file) {
      const x = prepare(file);
      return edit(x, x.c.splitBlock);
    },
    validate(tr) {
      assert.equal(tr.doc.childCount, 3);
      assert.equal(tr.doc.firstChild.textContent, "alpha");
    },
  },
  {
    name: "join adjacent paragraphs",
    make(file) {
      const x = prepare(file, "text", 13);
      return edit(x, x.c.joinBackward);
    },
    validate(tr) {
      assert.equal(tr.doc.childCount, 1);
      assert.equal(tr.doc.textContent, "alpha betagamma");
    },
  },
  {
    name: "toggle a stored cursor mark",
    make(file) {
      const x = prepare(file);
      return edit(x, x.c.toggleMark(x.schema.marks.em));
    },
    validate(tr) {
      assert.equal(tr.storedMarks[0].type.name, "em");
    },
  },
  {
    name: "toggle a mark across a text range",
    make(file) {
      const x = prepare(file, "text", 1, 11);
      return edit(x, x.c.toggleMark(x.schema.marks.em));
    },
    validate(tr) {
      assert.equal(tr.doc.firstChild.firstChild.marks[0].type.name, "em");
    },
  },
  {
    name: "convert a paragraph to a heading",
    make(file) {
      const x = prepare(file);
      return edit(x, x.c.setBlockType(x.schema.nodes.heading));
    },
    validate(tr) {
      assert.equal(tr.doc.firstChild.type.name, "heading");
    },
  },
  {
    name: "wrap a paragraph in a quote",
    make(file) {
      const x = prepare(file);
      return edit(x, x.c.wrapIn(x.schema.nodes.quote));
    },
    validate(tr) {
      assert.equal(tr.doc.firstChild.type.name, "quote");
    },
  },
  {
    name: "split after deleting across list items",
    make(file) {
      const x = prepare(file, "list", 5, 10);
      return edit(x, x.c.splitBlock);
    },
    validate(tr) {
      assert.equal(tr.doc.firstChild.childCount, 2);
      assert.equal(tr.doc.firstChild.child(1).childCount, 2);
    },
  },
  {
    name: "query the Enter command chain",
    make(file) {
      const x = prepare(file),
        command = x.c.pcBaseKeymap.Enter;
      return () => command(x.state);
    },
    validate(result) {
      assert.equal(result, true);
    },
  },
];
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
      "basic.cjs",
      "split.cjs",
      "join.cjs",
      "marks.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      ...[
        "vprosemirror-model",
        "vprosemirror-transform",
        "vprosemirror-state",
        "vorderedmap",
      ].flatMap((name) =>
        require("node:fs")
          .readdirSync(path.join(root, "..", name))
          .filter((f) => f.endsWith(".cjs"))
          .map((f) => "../" + name + "/" + f),
      ),
      "../../scripts/prosemirror-commands-conformance/package-lock.json",
      ...[
        "prosemirror-commands",
        "prosemirror-state",
        "prosemirror-transform",
        "prosemirror-model",
      ].map(
        (name) =>
          "../../scripts/prosemirror-commands-conformance/node_modules/" + name,
      ),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
