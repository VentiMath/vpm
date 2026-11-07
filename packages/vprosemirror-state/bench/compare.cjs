"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/prosemirror-state-conformance"),
  upstream = path.join(fixture, "node_modules/prosemirror-state");
function prepare(file, n = 0) {
  const lib = require(file),
    m = require(
      file === root
        ? "vprosemirror-model"
        : path.join(fixture, "node_modules/prosemirror-model"),
    ),
    schema = new m.Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "text*" },
        text: {},
      },
      marks: { em: {} },
    }),
    doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("The quick brown fox")),
      schema.node("paragraph", null, schema.text("jumps over the fence")),
    ]),
    plugins = Array.from(
      { length: n },
      () =>
        new lib.Plugin({
          state: {
            init() {
              return 0;
            },
            apply(_tr, n) {
              return n + 1;
            },
            toJSON(n) {
              return n;
            },
            fromJSON(_c, n) {
              return n;
            },
          },
        }),
    );
  return {
    lib,
    schema,
    doc,
    plugins,
    state: lib.EditorState.create({ doc, plugins }),
  };
}
const cases = [
  {
    name: "create state without plugins",
    make(file) {
      const { lib, doc } = prepare(file);
      return () => lib.EditorState.create({ doc });
    },
    validate(s) {
      assert.equal(s.selection.from, 1);
    },
  },
  {
    name: "create state with eight plugin fields",
    make(file) {
      const { lib, doc, plugins } = prepare(file, 8);
      return () => lib.EditorState.create({ doc, plugins });
    },
    validate(s) {
      assert.equal(s.plugins.length, 8);
      assert.equal(s.plugins[7].getState(s), 0);
    },
  },
  {
    name: "apply metadata with eight plugin fields",
    make(file) {
      const { state } = prepare(file, 8);
      return () => state.apply(state.tr.setMeta("event", "check"));
    },
    validate(s) {
      assert.equal(s.plugins[7].getState(s), 1);
    },
  },
  {
    name: "type into a text selection",
    make(file) {
      const { state } = prepare(file);
      return () => state.apply(state.tr.insertText("x"));
    },
    validate(s) {
      assert.equal(s.doc.firstChild.textContent, "xThe quick brown fox");
      assert.equal(s.selection.head, 2);
    },
  },
  {
    name: "replace a marked selection",
    make(file) {
      const { state, lib, schema } = prepare(file);
      return () =>
        state.apply(
          state.tr
            .setSelection(lib.TextSelection.create(state.doc, 5, 10))
            .addStoredMark(schema.mark("em"))
            .insertText("changed"),
        );
    },
    validate(s) {
      assert.equal(s.doc.firstChild.textContent, "The changed brown fox");
      assert.equal(s.doc.firstChild.child(1).marks[0].type.name, "em");
    },
  },
  {
    name: "append a plugin transaction",
    make(file) {
      const { lib, doc } = prepare(file),
        plugin = new lib.Plugin({
          appendTransaction(trs, _old, s) {
            return trs.some((t) => t.getMeta("append"))
              ? s.tr.insertText("!")
              : null;
          },
        }),
        s = lib.EditorState.create({ doc, plugins: [plugin] });
      return () =>
        s.applyTransaction(s.tr.insertText("x").setMeta("append", true));
    },
    validate(r) {
      assert.equal(r.transactions.length, 2);
      assert.equal(r.state.doc.firstChild.textContent, "x!The quick brown fox");
    },
  },
  {
    name: "serialize and restore plugin state",
    make(file) {
      const { lib, state, schema, plugins } = prepare(file, 2),
        fields = { counter: plugins[0] };
      return () =>
        lib.EditorState.fromJSON(
          { schema, plugins },
          state.toJSON(fields),
          fields,
        );
    },
    validate(s) {
      assert.equal(s.plugins[0].getState(s), 0);
      assert.equal(s.doc.childCount, 2);
    },
  },
  {
    name: "reconfigure retained plugin fields",
    make(file) {
      const { state, plugins } = prepare(file, 8);
      return () => state.reconfigure({ plugins: plugins.slice(0, 4) });
    },
    validate(s) {
      assert.equal(s.plugins.length, 4);
      assert.equal(s.plugins[3].getState(s), 0);
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
      "selection.cjs",
      "transaction.cjs",
      "plugin.cjs",
      "state.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vprosemirror-model/core.cjs",
      "../vprosemirror-model/content.cjs",
      "../vprosemirror-model/schema.cjs",
      "../vprosemirror-transform/transform.cjs",
      "../vprosemirror-transform/steps.cjs",
      "../vprosemirror-transform/fit.cjs",
      "../vprosemirror-transform/structure.cjs",
      "../vprosemirror-transform/mapping.cjs",
      "../vorderedmap/index.cjs",
      "../../scripts/prosemirror-state-conformance/package-lock.json",
      "../../scripts/prosemirror-state-conformance/node_modules/prosemirror-state",
      "../../scripts/prosemirror-state-conformance/node_modules/prosemirror-model",
      "../../scripts/prosemirror-state-conformance/node_modules/prosemirror-transform",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
