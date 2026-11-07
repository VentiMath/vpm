"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const v = require(process.env.VPM_STATE_ENTRY || path.resolve(__dirname, ".."));
const vm = require(process.env.VPM_MODEL_ENTRY || "vprosemirror-model");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-state-conformance/node_modules",
);
const u = require(path.join(fixture, "prosemirror-state")),
  um = require(path.join(fixture, "prosemirror-model"));
const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    quote: { content: "block+", group: "block" },
    hr: { group: "block" },
    image: { inline: true, group: "inline" },
    text: { group: "inline" },
  },
  marks: { em: {}, link: { attrs: { href: {} }, inclusive: false } },
};
function setup(m) {
  const schema = new m.Schema(spec),
    p = (t) => schema.node("paragraph", null, t ? schema.text(t) : null);
  const doc = schema.node("doc", null, [
    p("alpha"),
    schema.node("hr"),
    schema.node("quote", null, [p("beta"), p()]),
    p("end"),
  ]);
  return { schema, doc, p };
}
function compare(fn) {
  assert.deepEqual(fn(v, vm), fn(u, um));
}
test("selection search, bias, bookmarks and JSON agree at every boundary", () =>
  compare((lib, m) => {
    const { doc } = setup(m),
      out = [];
    for (let a = 0; a <= doc.content.size; a++)
      for (const dir of [-1, 1]) {
        for (const textOnly of [true, false])
          out.push(
            lib.Selection.findFrom(doc.resolve(a), dir, textOnly)?.toJSON() ||
              null,
          );
        for (let b = 0; b <= doc.content.size; b++) {
          const s = lib.TextSelection.between(
            doc.resolve(a),
            doc.resolve(b),
            dir,
          );
          out.push(s.toJSON());
          assert(lib.Selection.fromJSON(doc, s.toJSON()).eq(s));
          assert(s.getBookmark().resolve(doc).eq(s));
        }
      }
    return out;
  }));
test("3,000 deterministic state edits preserve selection, stored marks, flags and mapped bookmarks", () => {
  let seed = 0x7291ab;
  const random = (n) =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
  const setups = [setup(vm), setup(um)],
    libs = [v, u];
  let states = setups.map((s, i) => libs[i].EditorState.create({ doc: s.doc }));
  for (let i = 0; i < 3000; i++) {
    const places = [];
    states[0].doc.descendants((n, pos) => {
      if (n.isTextblock) places.push([pos + 1, n.content.size]);
    });
    const [start, len] = places[random(places.length)],
      a = start + random(len + 1),
      b = a + random(start + len - a + 1),
      op = random(7),
      dir = random(2),
      text = random(3) ? "x" : "",
      bookmark = [];
    const trs = states.map((s, j) => {
      const lib = libs[j],
        tr = s.tr.setSelection(
          lib.TextSelection.create(s.doc, dir ? a : b, dir ? b : a),
        );
      bookmark[j] = tr.selection.getBookmark();
      if (op === 0) tr.insertText(text);
      else if (op === 1) tr.addStoredMark(s.schema.mark("em")).insertText("m");
      else if (op === 2) tr.deleteSelection();
      else if (op === 3) tr.replaceSelectionWith(s.schema.node("image"));
      else if (op === 4) tr.insertText("z", a, b);
      else if (op === 5)
        tr.addMark(
          a,
          b,
          s.schema.mark("link", { href: "https://ventimath.org" }),
        );
      else tr.scrollIntoView().setMeta("edit", i);
      return tr;
    });
    const snapshot = (tr, j) => ({
      doc: tr.doc.toJSON(),
      selection: tr.selection.toJSON(),
      bookmark: bookmark[j].map(tr.mapping).resolve(tr.doc).toJSON(),
      marks: tr.storedMarks?.map((m) => m.toJSON()) || null,
      flags: [
        tr.selectionSet,
        tr.storedMarksSet,
        tr.scrolledIntoView,
        tr.isGeneric,
      ],
    });
    assert.deepEqual(
      snapshot(trs[0], 0),
      snapshot(trs[1], 1),
      "operation " + i,
    );
    states = states.map((s, j) => s.apply(trs[j]));
    assert.deepEqual(states[0].toJSON(), states[1].toJSON());
    states[0].doc.check();
  }
});
test("append plugins see only new transactions and correct old states, with filtering and partial state", () =>
  compare((lib, m) => {
    const { schema } = setup(m),
      log = [],
      keys = [new lib.PluginKey("a"), new lib.PluginKey("b")];
    const plugins = keys.map(
      (key, i) =>
        new lib.Plugin({
          key,
          state: {
            init(_c, s) {
              log.push(["init", i, keys[0].getState(s)]);
              return 0;
            },
            apply(tr, n, old, next) {
              log.push([
                "apply",
                i,
                n,
                keys[0].getState(old),
                keys[0].getState(next),
              ]);
              return n + 1;
            },
          },
          filterTransaction(tr) {
            return !tr.getMeta("reject");
          },
          appendTransaction(trs, old, next) {
            log.push([
              "append",
              i,
              trs.map((t) => t.getMeta("phase") || "root"),
              old.doc.textContent,
              next.doc.textContent,
            ]);
            if (!trs.some((t) => t.docChanged)) return null;
            if (i === 0 && !next.doc.textContent.endsWith("!"))
              return next.tr
                .insertText("!", next.doc.content.size - 1)
                .setMeta("phase", "a");
            if (i === 1 && next.doc.textContent.length < 4)
              return next.tr.insertText("?", 1).setMeta("phase", "b");
            return null;
          },
        }),
    );
    let s = lib.EditorState.create({ schema, plugins });
    const root = s.tr.insertText("x"),
      result = s.applyTransaction(root);
    for (const tr of result.transactions.slice(1))
      assert.equal(tr.getMeta("appendedTransaction"), root);
    assert.equal(result.transactions.length, 3);
    s = result.state;
    assert.equal(s.apply(s.tr.setMeta("reject", true)), s);
    return { log, json: s.toJSON(), counts: keys.map((k) => k.getState(s)) };
  }));
test("plugin reconfiguration, explicit JSON fields and bound DOM handlers retain state", () =>
  compare((lib, m) => {
    const { schema } = setup(m),
      key = new lib.PluginKey("counter");
    let calls = 0;
    const p = new lib.Plugin({
      key,
      state: {
        init() {
          return 3;
        },
        apply(_t, n) {
          return n + 1;
        },
        toJSON(n) {
          return n;
        },
        fromJSON(_c, n) {
          return n;
        },
      },
      props: {
        handleDOMEvents: {
          click() {
            assert.equal(this, p);
            calls++;
            return true;
          },
        },
      },
    });
    let s = lib.EditorState.create({ schema, plugins: [p] });
    s = s.apply(s.tr);
    p.props.handleDOMEvents.click();
    assert.equal(s.reconfigure({ plugins: [p] }).doc, s.doc);
    const encoded = s.toJSON({ counter: p }),
      r = lib.EditorState.fromJSON({ schema, plugins: [p] }, encoded, {
        counter: p,
      });
    assert.equal(key.getState(r), 4);
    assert.equal(key.getState(s.reconfigure({})), undefined);
    assert.throws(() => lib.EditorState.create({ schema, plugins: [p, p] }));
    return { encoded, calls };
  }));
test("node/all selection mapping, multirange deletion and mark inheritance match upstream", () =>
  compare((lib, m) => {
    const { schema, doc } = setup(m),
      s = lib.EditorState.create({ doc }),
      out = [];
    for (const selection of [
      lib.NodeSelection.create(doc, 7),
      new lib.AllSelection(doc),
    ]) {
      const tr = s.tr.setSelection(selection).deleteSelection();
      out.push({
        doc: tr.doc.toJSON(),
        selection: tr.selection.toJSON(),
        bookmark: selection
          .getBookmark()
          .map(tr.mapping)
          .resolve(tr.doc)
          .toJSON(),
      });
    }
    const selection = new lib.Selection(doc.resolve(1), doc.resolve(5), [
      new lib.SelectionRange(doc.resolve(1), doc.resolve(3)),
      new lib.SelectionRange(doc.resolve(17), doc.resolve(19)),
    ]);
    const tr = s.tr;
    selection.replace(tr);
    out.push(tr.doc.toJSON());
    const marked = s.tr
      .setStoredMarks([schema.mark("em")])
      .replaceSelectionWith(schema.node("paragraph"));
    out.push(marked.doc.toJSON());
    return out;
  }));
test("serialized selections reject malformed positions and inherited registry names", () => {
  const { doc } = setup(vm);
  for (const n of [-1, 0.5, NaN, Infinity, "1", null])
    assert.throws(
      () => v.Selection.fromJSON(doc, { type: "text", anchor: n, head: 1 }),
      RangeError,
    );
  for (const type of ["__proto__", "constructor", "toString"])
    assert.throws(() => v.Selection.fromJSON(doc, { type }), RangeError);
  const plugins = [new v.Plugin({})],
    snapshot = v.EditorState.create({ doc, plugins });
  plugins.length = 0;
  assert.equal(snapshot.plugins.length, 1);
  const state = v.EditorState.create({ doc }),
    tr = state.tr.setMeta("__proto__", { polluted: true });
  assert.equal(Object.getPrototypeOf(tr.meta), null);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(tr.getMeta("__proto__"), { polluted: true });
  const p = new v.Plugin({
    props: Object.assign(Object.create({ inherited: () => true }), {
      editable: () => false,
    }),
  });
  assert.equal(p.props.inherited, undefined);
  assert.throws(
    () => state.apply(v.EditorState.create({ schema: doc.type.schema }).tr),
    /mismatched/,
  );
});

test("filter return values and excluded producer hooks follow upstream semantics", () =>
  compare((lib, m) => {
    const { schema } = setup(m);
    return [false, true, undefined, null, 0, 1, ""].map((value) => {
      let count = 0;
      const p = new lib.Plugin({
          filterTransaction() {
            count++;
            return value;
          },
          appendTransaction(_trs, _old, s) {
            return s.tr.setMeta("appended", true);
          },
        }),
        s = lib.EditorState.create({ schema, plugins: [p] }),
        r = s.applyTransaction(s.tr.insertText("x"));
      return [r.transactions.length, count, r.state.doc.textContent];
    });
  }));

test("selection search treats atomic textblocks as nodes and skips unselectable atoms", () =>
  compare((lib, m) => {
    const schema = new m.Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        atom: { content: "text*", group: "block", atom: true },
        hidden: {
          content: "text*",
          group: "block",
          atom: true,
          selectable: false,
        },
        text: {},
      },
    });
    const doc = schema.node("doc", null, [
        schema.node("hidden", null, schema.text("a")),
        schema.node("atom", null, schema.text("b")),
        schema.node("paragraph"),
      ]),
      out = [];
    for (let pos = 0; pos <= doc.content.size; pos++)
      for (const dir of [-1, 1])
        for (const textOnly of [false, true])
          out.push(
            lib.Selection.findFrom(doc.resolve(pos), dir, textOnly)?.toJSON() ||
              null,
          );
    assert(lib.Selection.atStart(doc) instanceof lib.NodeSelection);
    return out;
  }));
