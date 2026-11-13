"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/prosemirror-transform-conformance",
  ),
  upstream = path.join(fixture, "node_modules/prosemirror-transform");
const cases = [
  {
    name: "delete from a block boundary into a deep list",
    make(file) {
      const { Transform } = require(file),
        { Schema } = require(
          file === root
            ? "vprosemirror-model"
            : path.join(fixture, "node_modules/prosemirror-model"),
        );
      const s = new Schema({
        nodes: {
          doc: { content: "block+" },
          paragraph: { content: "text*", group: "block" },
          text: {},
          bullet_list: { content: "list_item+", group: "block" },
          ordered_list: {
            content: "list_item+",
            group: "block",
            attrs: { order: { default: 1 } },
          },
          list_item: { content: "paragraph block*" },
        },
      });
      const doc = s.nodeFromJSON(
        require("../../../scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json")
          .doc,
      );
      return () => new Transform(doc).deleteRange(3, 42);
    },
    validate(tr) {
      tr.doc.check();
      assert.equal(tr.doc.textContent, "xx");
      assert.equal(tr.mapping.map(42, -1), 19);
      assert.equal(tr.doc.resolve(19).depth, 11);
    },
  },
  {
    name: "fit a closed blockquote inside paragraph text",
    make(file) {
      const { Transform } = require(file),
        { Schema, Slice, Fragment } = require(
          file === root
            ? "vprosemirror-model"
            : path.join(fixture, "node_modules/prosemirror-model"),
        );
      const s = new Schema({
          nodes: {
            doc: { content: "block+" },
            paragraph: { content: "text*", group: "block" },
            quote: { content: "block+", group: "block" },
            text: {},
          },
        }),
        p = (x) => s.node("paragraph", null, s.text(x)),
        d = s.node("doc", null, [p("The quick brown fox"), p("tail")]),
        slice = new Slice(
          Fragment.from(s.node("quote", null, p("pasted"))),
          0,
          0,
        );
      return () => new Transform(d).replace(8, 8, slice).doc;
    },
    validate: (d) => {
      assert.equal(d.childCount, 4);
      assert.equal(d.child(0).textContent, "The qui");
      assert.equal(d.child(1).type.name, "quote");
      assert.equal(d.child(2).textContent, "ck brown fox");
      d.check();
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
      "mapping.cjs",
      "steps.cjs",
      "structure.cjs",
      "fit.cjs",
      "transform.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/fitting.cjs",
      "../../scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json",
      "../vprosemirror-model/core.cjs",
      "../vprosemirror-model/content.cjs",
      "../vprosemirror-model/schema.cjs",
      "../vorderedmap/index.cjs",
      "../../scripts/prosemirror-transform-conformance/package-lock.json",
      "../../scripts/prosemirror-transform-conformance/node_modules/prosemirror-transform",
      "../../scripts/prosemirror-transform-conformance/node_modules/prosemirror-model",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
