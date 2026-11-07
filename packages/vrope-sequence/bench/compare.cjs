"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/rope-sequence-conformance"),
  upstream = path.join(fixture, "node_modules/rope-sequence");
function makeRope(R, n) {
  let r = R.empty;
  for (let i = 0; i < n; i += 64)
    r = r.append(Array.from({ length: Math.min(64, n - i) }, (_, j) => i + j));
  return r;
}
const cases = [
  {
    name: "snapshot 32 array entries",
    make(file) {
      const R = require(file),
        a = Array.from({ length: 32 }, (_, i) => i);
      return () => R.from(a);
    },
    validate: (r) => assert.equal(r.get(31), 31),
  },
  {
    name: "append 16 entries to 4096-item sequence",
    make(file) {
      const R = require(file),
        r = makeRope(R, 4096),
        a = Array.from({ length: 16 }, (_, i) => 4096 + i);
      return () => r.append(a);
    },
    validate: (r) => assert.equal(r.get(4111), 4111),
  },
  {
    name: "concatenate two 8192-item sequences",
    make(file) {
      const R = require(file),
        a = makeRope(R, 8192),
        b = makeRope(R, 8192);
      return () => a.append(b);
    },
    validate: (r) => assert.equal(r.length, 16384),
  },
  {
    name: "slice middle 4096 of 16384 entries",
    make(file) {
      const r = makeRope(require(file), 16384);
      return () => r.slice(5000, 9096);
    },
    validate: (r) => {
      assert.equal(r.length, 4096);
      assert.equal(r.get(0), 5000);
    },
  },
  {
    name: "random lookup in 16384 entries",
    make(file) {
      const r = makeRope(require(file), 16384);
      let i = 0;
      return () => r.get((i++ * 97) & 16383);
    },
    validate: (x) => assert(x >= 0 && x < 16384),
  },
  {
    name: "reverse scan 4096 entries",
    make(file) {
      const r = makeRope(require(file), 4096);
      let sum;
      const add = (x) => {
        sum += x;
      };
      return () => {
        sum = 0;
        r.forEach(add, 4096, 0);
        return sum;
      };
    },
    validate: (x) => assert.equal(x, (4096 * 4095) / 2),
  },
  {
    name: "flatten 16384 entries to array",
    make(file) {
      const r = makeRope(require(file), 16384);
      return () => r.flatten();
    },
    validate: (a) => {
      assert.equal(a.length, 16384);
      assert.equal(a[16383], 16383);
    },
  },
  {
    name: "ProseMirror history 32 edits and undo",
    make(file) {
      const R = require(file),
        H = require(path.join(fixture, "history.cjs"))(
          "prosemirror-history",
          R,
        ),
        { Schema } = require(
          path.join(fixture, "node_modules/prosemirror-model"),
        ),
        { EditorState } = require(
          path.join(fixture, "node_modules/prosemirror-state"),
        );
      const schema = new Schema({
          nodes: {
            doc: { content: "paragraph+" },
            paragraph: { content: "text*" },
            text: {},
          },
        }),
        initial = EditorState.create({ schema, plugins: [H.history()] });
      return () => {
        let state = initial;
        const dispatch = (tr) => {
          state = state.apply(tr);
        };
        for (let i = 0; i < 32; i++)
          dispatch(H.closeHistory(state.tr.insertText("a", 1)));
        for (let i = 0; i < 32; i++) H.undo(state, dispatch);
        return state.doc.textContent;
      };
    },
    validate: (x) => assert.equal(x, ""),
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
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/rope-sequence-conformance/history.cjs",
      "../../scripts/rope-sequence-conformance/package-lock.json",
      ...[
        "rope-sequence",
        "prosemirror-history",
        "prosemirror-model",
        "prosemirror-state",
        "prosemirror-transform",
      ].map((n) => "../../scripts/rope-sequence-conformance/node_modules/" + n),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
