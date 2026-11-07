"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/prosemirror-transform-conformance",
  ),
  upstream = path.join(fixture, "node_modules/prosemirror-transform");
function prepare(file) {
  const lib = require(file),
    { Schema } = require(
      file === root
        ? "vprosemirror-model"
        : path.join(fixture, "node_modules/prosemirror-model"),
    );
  const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        quote: { content: "block+", group: "block" },
        text: {},
      },
      marks: { em: {} },
    }),
    p = (text) =>
      schema.node("paragraph", null, text ? schema.text(text) : null),
    doc = schema.node("doc", null, [
      p("The quick brown fox"),
      p("jumps over the fence"),
    ]);
  return { lib, schema, p, doc };
}
const cases = [
  {
    name: "map a position through 32 edits",
    make(file) {
      const { Mapping, StepMap } = require(file),
        m = new Mapping();
      for (let i = 0; i < 32; i++) m.appendMap(new StepMap([i * 3, 1, 2]));
      return () => m.map(100);
    },
    validate: (v) => assert.equal(v, 132),
  },
  {
    name: "recover a mirrored deletion",
    make(file) {
      const { Mapping, StepMap } = require(file),
        m = new Mapping();
      m.appendMap(new StepMap([2, 20, 0]));
      m.appendMap(new StepMap([1, 0, 3]));
      m.appendMap(new StepMap([5, 0, 20]), 0);
      return () => m.mapResult(12);
    },
    validate: (v) => assert.equal(v.pos, 15),
  },
  {
    name: "insert text and map selection",
    make(file) {
      const { lib, schema, doc } = prepare(file),
        text = schema.text(" new");
      return () => {
        const t = new lib.Transform(doc).insert(10, text);
        return t.mapping.map(15);
      };
    },
    validate: (v) => assert.equal(v, 19),
  },
  {
    name: "apply and invert overlapping marks",
    make(file) {
      const { lib, schema, doc } = prepare(file),
        step = new lib.AddMarkStep(2, 12, schema.mark("em"));
      return () => step.invert(doc).apply(step.apply(doc).doc).doc;
    },
    validate: (v) =>
      assert.equal(v.firstChild.textContent, "The quick brown fox"),
  },
  {
    name: "split and join a paragraph",
    make(file) {
      const { lib, doc } = prepare(file);
      return () => new lib.Transform(doc).split(8).join(9).doc;
    },
    validate: (v) => assert.equal(v.childCount, 2),
  },
  {
    name: "wrap and lift two paragraphs",
    make(file) {
      const { lib, schema, doc } = prepare(file);
      return () => {
        const tr = new lib.Transform(doc);
        tr.wrap(
          tr.doc.resolve(1).blockRange(tr.doc.resolve(doc.content.size - 1)),
          [{ type: schema.nodes.quote }],
        );
        tr.lift(
          tr.doc.resolve(2).blockRange(tr.doc.resolve(tr.doc.content.size - 2)),
          0,
        );
        return tr.doc;
      };
    },
    validate: (v) => assert.equal(v.childCount, 2),
  },
  {
    name: "fit an open cross-block paste",
    make(file) {
      const { lib, schema, p, doc } = prepare(file),
        source = schema.node("doc", null, [p("inserted"), p("text")]),
        slice = source.slice(3, source.content.size - 2);
      return () => new lib.Transform(doc).replace(8, 8, slice).doc;
    },
    validate: (v) => {
      assert.equal(v.childCount, 3);
      v.check();
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
      "mapping.cjs",
      "steps.cjs",
      "structure.cjs",
      "fit.cjs",
      "transform.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
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
