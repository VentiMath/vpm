"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/prosemirror-history-conformance"),
  out = path.join(fixture, "node_modules/.vpm-history"),
  upstream = path.join(fixture, "node_modules/prosemirror-history");
function setup(file, options = {}) {
  const A = require(
    path.join(out, file === root ? "api-vpm.cjs" : "api-upstream.cjs"),
  );
  const schema = new A.M.Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  return {
    A,
    initial: A.S.EditorState.create({
      schema,
      plugins: [A.H.history(options)],
    }),
  };
}
function edit(A, state, n, closed) {
  for (let i = 0; i < n; i++) {
    let tr = state.tr.insertText("x").setTime(1000 + i);
    if (closed) tr = A.H.closeHistory(tr);
    state = state.apply(tr);
  }
  return state;
}
function command(A, state, which, n) {
  for (let i = 0; i < n; i++)
    A.H[which](state, (tr) => {
      state = state.apply(tr);
    });
  return state;
}
const cases = [
  {
    name: "record 16 grouped typing edits",
    make(file) {
      const { A, initial } = setup(file);
      return () => edit(A, initial, 16, false);
    },
    validate: (s) => assert.equal(s.doc.textContent, "x".repeat(16)),
  },
  {
    name: "record 32 separate history events",
    make(file) {
      const { A, initial } = setup(file);
      return () => edit(A, initial, 32, true);
    },
    validate: (s) => assert.equal(s.doc.textContent.length, 32),
  },
  {
    name: "undo 32 separate events",
    make(file) {
      const { A, initial } = setup(file),
        state = edit(A, initial, 32, true);
      return () => command(A, state, "undo", 32);
    },
    validate: (s) => assert.equal(s.doc.textContent, ""),
  },
  {
    name: "redo 32 separate events",
    make(file) {
      const { A, initial } = setup(file),
        state = command(A, edit(A, initial, 32, true), "undo", 32);
      return () => command(A, state, "redo", 32);
    },
    validate: (s) => assert.equal(s.doc.textContent, "x".repeat(32)),
  },
  {
    name: "undo through 256 untracked position maps",
    make(file) {
      const { A, initial } = setup(file);
      let state = edit(A, initial, 4, false);
      for (let i = 0; i < 256; i++)
        state = state.apply(
          state.tr.insertText(".", 1).setMeta("addToHistory", false),
        );
      return () => command(A, state, "undo", 1);
    },
    validate: (s) => assert.equal(s.doc.textContent, ".".repeat(256)),
  },
  {
    name: "invalidate redo with a new edit",
    make(file) {
      const { A, initial } = setup(file),
        state = command(A, edit(A, initial, 32, true), "undo", 1);
      return () => {
        const s = edit(A, state, 1, true);
        return A.H.redoDepth(s);
      };
    },
    validate: (n) => assert.equal(n, 0),
  },
  {
    name: "record 64 events with depth 16",
    make(file) {
      const { A, initial } = setup(file, { depth: 16 });
      return () => {
        const s = edit(A, initial, 64, true);
        return [s.doc.textContent, A.H.undoDepth(s)];
      };
    },
    validate: (x) => {
      assert.equal(x[0].length, 64);
      assert.equal(x[1], 22);
    },
  },
  {
    name: "160 partial undo and redo cycles",
    make(file) {
      const { A, initial } = setup(file),
        start = edit(A, initial, 8, true);
      return () => {
        let s = start;
        for (let i = 0; i < 160; i++) {
          s = command(A, s, "undo", 1);
          s = command(A, s, "redo", 1);
        }
        return s;
      };
    },
    validate: (s) => assert.equal(s.doc.textContent, "x".repeat(8)),
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
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/prosemirror-history-conformance/build.cjs",
      "../../scripts/prosemirror-history-conformance/package-lock.json",
      "../../scripts/prosemirror-history-conformance/node_modules/.vpm-history/api-upstream.cjs",
      "../../scripts/prosemirror-history-conformance/node_modules/.vpm-history/api-vpm.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
