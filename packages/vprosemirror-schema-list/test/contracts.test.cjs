"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-schema-list-conformance/node_modules/.vpm-schema-list",
);
const api = (name) => require(path.join(fixture, "api-" + name + ".cjs"));
function schema(A) {
  const base = new A.M.Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "inline*", group: "block" },
      blockquote: { content: "block+", group: "block" },
      heading: {
        content: "inline*",
        group: "block",
        attrs: { level: { default: 1 } },
      },
      text: { group: "inline" },
    },
    marks: { em: {}, strong: {} },
  });
  return new A.M.Schema({
    nodes: A.L.addListNodes(base.spec.nodes, "paragraph block*", "block"),
    marks: base.spec.marks,
  });
}
function make(A, json, selection) {
  const s = schema(A),
    doc = json
      ? s.nodeFromJSON(json)
      : s.node("doc", null, [
          s.node("paragraph", null, s.text("alpha")),
          s.node("paragraph", null, s.text("beta")),
          s.node("paragraph", null, s.text("gamma")),
        ]);
  return {
    A,
    s,
    state: A.S.EditorState.create({
      doc,
      selection: selection && A.S.TextSelection.create(doc, ...selection),
      plugins: [A.H.history()],
    }),
  };
}
const snapshot = (x) => [
  x.state.doc.toJSON(),
  x.state.selection.toJSON(),
  x.state.storedMarks?.map((m) => m.toJSON()) ?? null,
];
function points(doc) {
  const out = [];
  doc.descendants((n, p) => {
    if (n.isTextblock)
      for (let i = 0; i <= n.content.size; i++) out.push(p + 1 + i);
  });
  return out;
}
function command(x, name, dispatch = true, args = []) {
  let tr;
  const result = x.A.L[name](...args)(
    x.state,
    dispatch
      ? (value) => {
          tr = value;
        }
      : undefined,
  );
  if (tr) x.state = x.state.apply(x.A.H.closeHistory(tr));
  return result;
}
test("6000 seeded list edits agree across isolated callers and full VPM lists", () => {
  for (const [uName, vName] of [
    ["upstream", "current-vpm"],
    ["app", "app-vpm"],
    ["upstream", "vpm"],
  ]) {
    let u = make(api(uName)),
      v = make(api(vName)),
      seed = 0x5167;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const trace = [];
    for (let i = 0; i < 2000; i++) {
      if (i % 80 === 0) {
        u = make(api(uName));
        v = make(api(vName));
      }
      const ps = points(u.state.doc);
      let from = ps[random() % ps.length],
        to = random() % 4 === 0 ? ps[random() % ps.length] : from,
        op = random() % 8;
      // Cross-block insertion is covered; deletion range expansion remains a
      // separately recorded transform follow-up.
      if (
        vName === "vpm" &&
        op === 1 &&
        !u.state.doc.resolve(from).sameParent(u.state.doc.resolve(to))
      )
        to = from;

      for (const x of [u, v])
        x.state = x.state.apply(
          x.state.tr.setSelection(
            x.A.S.TextSelection.create(x.state.doc, from, to),
          ),
        );
      const prior = u.state.doc.toJSON();
      trace.push({ i, from, to, op });
      const run = (x) => {
        if (op === 0) {
          x.state = x.state.apply(
            x.A.H.closeHistory(x.state.tr.insertText("x")),
          );
          return true;
        }
        if (op === 1) {
          x.state = x.state.apply(
            x.A.H.closeHistory(x.state.tr.deleteSelection()),
          );
          return true;
        }
        const name = [
          "wrapInList",
          "splitListItem",
          "sinkListItem",
          "liftListItem",
          "splitListItemKeepMarks",
          "wrapInList",
        ][op - 2];
        const args = [
          op === 2
            ? x.s.nodes.bullet_list
            : op === 7
              ? x.s.nodes.ordered_list
              : x.s.nodes.list_item,
        ];
        const before = x.state,
          available = command(x, name, false, args);
        assert.equal(x.state, before);
        const result = command(x, name, true, args);
        if (x === v) assert.equal(result, available, "dry run " + name);
        return result;
      };
      try {
        assert.equal(run(v), run(u));
        assert.deepEqual(snapshot(v), snapshot(u));
        v.state.doc.check();
      } catch (e) {
        console.error(
          "\n" +
            JSON.stringify({
              uName,
              prior,
              trace: trace.slice(-8),
              upstream: snapshot(u),
              vpm: snapshot(v),
            }),
        );
        throw e;
      }
    }
  }
});
test("schema descriptors, custom numbering and persistent map extension", () => {
  for (const name of ["upstream", "vpm"]) {
    const A = api(name),
      base = new A.M.Schema({
        nodes: {
          doc: { content: "paragraph+" },
          paragraph: { content: "text*" },
          text: {},
        },
      }),
      before = base.spec.nodes;
    const nodes = A.L.addListNodes(before, "paragraph block*", "block");
    assert.equal(before.get("ordered_list"), undefined);
    assert.equal(nodes.get("ordered_list").content, "list_item+");
    assert.equal(nodes.get("list_item").content, "paragraph block*");
    assert.deepEqual(A.L.orderedList.toDOM({ attrs: { order: 1 } }), ["ol", 0]);
    assert.deepEqual(A.L.orderedList.toDOM({ attrs: { order: 7 } }), [
      "ol",
      { start: 7 },
      0,
    ]);
    const attrs = A.L.orderedList.parseDOM[0].getAttrs({
      hasAttribute: () => true,
      getAttribute: () => "-2",
    });
    assert.equal(attrs.order, -2);
    assert.equal(nodes.get("list_item").defining, true);
  }
});
test("split preserves explicit attributes and marks, and remains query-only without dispatch", () => {
  for (const name of ["upstream", "vpm", "app-vpm"]) {
    const A = api(name),
      s = schema(A);
    let nodes = s.spec.nodes.update("list_item", {
      ...s.spec.nodes.get("list_item"),
      attrs: { id: { default: null } },
    });
    const custom = new A.M.Schema({ nodes, marks: s.spec.marks }),
      doc = custom.node("doc", null, [
        custom.node("bullet_list", null, [
          custom.node("list_item", { id: "old" }, [
            custom.node("paragraph", null, custom.text("text")),
          ]),
        ]),
      ]);
    let state = A.S.EditorState.create({
      doc,
      selection: A.S.TextSelection.create(doc, 7),
    });
    state = state.apply(state.tr.setStoredMarks([custom.marks.em.create()]));
    let result;
    assert(
      A.L.splitListItemKeepMarks(custom.nodes.list_item, { id: "new" })(
        state,
        (tr) => (result = tr),
      ),
    );
    assert.equal(result.doc.firstChild.child(1).attrs.id, "new");
    assert.equal(result.storedMarks[0].type.name, "em");
    assert.equal(state.doc, doc);
    const middle = state.apply(
      state.tr.setSelection(A.S.TextSelection.create(doc, 5)),
    );
    A.L.splitListItem(custom.nodes.list_item, { id: "new" })(middle, (tr) => {
      assert.equal(tr.doc.firstChild.child(1).attrs.id, "old");
    });
  }
});
test("moving list items keeps every selected text position mapped and supports inverse steps", () => {
  for (const name of ["upstream", "vpm", "app-vpm"]) {
    const A = api(name),
      x = make(A),
      first = x.state.doc;
    const tr = x.state.tr.setSelection(
      A.S.TextSelection.create(first, 1, first.content.size - 1),
    );
    x.state = x.state.apply(tr);
    command(x, "wrapInList", true, [x.s.nodes.bullet_list]);
    for (const name of ["sinkListItem", "liftListItem"]) {
      const pos = points(x.state.doc).find(
        (p) => x.state.doc.textBetween(p, p + 1) === "b",
      );
      x.state = x.state.apply(
        x.state.tr.setSelection(
          A.S.TextSelection.create(x.state.doc, pos, pos + 3),
        ),
      );
      const old = x.state;
      let tr;
      assert(A.L[name](x.s.nodes.list_item)(old, (t) => (tr = t)));
      for (let i = pos; i <= pos + 3; i++)
        assert.equal(tr.mapping.mapResult(i).deleted, false);
      let reverse = tr.doc;
      for (let i = tr.steps.length - 1; i >= 0; i--)
        reverse = tr.steps[i].invert(tr.docs[i]).apply(reverse).doc;
      assert(reverse.eq(old.doc));
      x.state = x.state.apply(tr);
    }
  }
});
test("range wrapping appends correctly to an existing transaction", () => {
  for (const name of ["upstream", "vpm", "app-vpm"]) {
    const x = make(api(name)),
      tr = x.state.tr.insertText("prefix ", 1),
      range = tr.doc
        .resolve(1)
        .blockRange(tr.doc.resolve(tr.doc.firstChild.nodeSize - 1));
    assert(
      x.A.L.wrapRangeInList(null, range, x.s.nodes.ordered_list, { order: 3 }),
    );
    assert(
      x.A.L.wrapRangeInList(tr, range, x.s.nodes.ordered_list, { order: 3 }),
    );
    assert.equal(tr.doc.firstChild.attrs.order, 3);
    assert.equal(tr.doc.firstChild.textContent, "prefix alpha");
    tr.doc.check();
  }
});
test("lift query refuses an edit that cannot preserve the trailing schema", () => {
  for (const name of ["upstream", "vpm", "current-vpm", "app-vpm"]) {
    const A = api(name),
      s = schema(A),
      p = (t) => s.node("paragraph", null, t ? s.text(t) : null),
      li = (...c) => s.node("list_item", null, c),
      ol = (...c) => s.node("ordered_list", null, c),
      ul = (...c) => s.node("bullet_list", null, c);
    const doc = s.node("doc", null, [
      ol(li(p(""), ol(li(p("a"))), ul(li(p("b"))))),
    ]);
    const state = A.S.EditorState.create({
        doc,
        selection: A.S.TextSelection.create(doc, 7),
      }),
      cmd = A.L.liftListItem(s.nodes.list_item);
    assert.equal(cmd(state), name === "upstream");
    let calls = 0;
    assert.equal(
      cmd(state, () => calls++),
      false,
    );
    assert.equal(calls, 0);
    assert.equal(state.doc, doc);
  }
});

test("mixed-depth replacement and empty trailing gaps preserve the actual text cursor", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/transform-followup.json");
  for (const selection of [input.selection, [...input.selection].reverse()]) {
    const results = ["upstream", "vpm"].map((name) => {
      const x = make(api(name), input.doc, selection),
        before = x.state.doc;
      x.state = x.state.apply(x.A.H.closeHistory(x.state.tr.insertText("x")));
      const after = snapshot(x);
      assert.equal(x.state.selection.anchor, 6);
      assert.equal(x.state.selection.head, 6);
      assert(
        x.A.H.undo(x.state, (tr) => {
          x.state = x.state.apply(tr);
        }),
      );
      assert(x.state.doc.eq(before));
      return after;
    });
    assert.deepEqual(results[0], results[1]);
  }
});
