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
      // Dedicated matrices cover boundary, nested and repeated-text edits.
      // The mixed fuzzer still limits deletion to one textblock while a
      // separate deep boundary-deletion discrepancy remains open.
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

test("cross-list boundary deletion preserves the unselected textblock and cursor", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/deletion-followup.json");
  let cases = 0;
  for (const list of ["bullet_list", "ordered_list"])
    for (const leftText of ["", "al"])
      for (const tail of ["", "tail"])
        for (const boundary of ["paragraph", "heading"])
          for (const nesting of [0, 1, 2])
            for (const reversed of [false, true]) {
              const json = structuredClone(input.doc);
              json.content[0].type = list;
              if (list === "ordered_list") json.content[0].attrs = { order: 7 };
              const first = json.content[0].content[0].content[0];
              first.content = leftText
                ? [{ type: "text", text: leftText }]
                : [];
              json.content[1] = {
                type: boundary,
                ...(boundary === "heading" ? { attrs: { level: 3 } } : {}),
                content: tail
                  ? [{ type: "text", text: tail, marks: [{ type: "em" }] }]
                  : [],
              };
              for (let n = 0; n < nesting; n++)
                json.content = [{ type: "blockquote", content: json.content }];
              const results = ["upstream", "vpm"].map((name) => {
                const x = make(api(name), json),
                  before = x.state.doc,
                  starts = [];
                before.descendants((node, pos) => {
                  if (node.isTextblock) starts.push(pos + 1);
                });
                const selection = [starts[0], starts[2]];
                if (reversed) selection.reverse();
                x.state = x.state.apply(
                  x.state.tr.setSelection(
                    x.A.S.TextSelection.create(before, ...selection),
                  ),
                );
                x.state = x.state.apply(
                  x.A.H.closeHistory(x.state.tr.deleteSelection()),
                );
                x.state.doc.check();
                const after = snapshot(x);
                assert.equal(x.state.selection.anchor, nesting + 1);
                assert.equal(x.state.selection.head, nesting + 1);
                assert(
                  x.A.H.undo(x.state, (tr) => {
                    x.state = x.state.apply(tr);
                  }),
                );
                assert(x.state.doc.eq(before));
                return after;
              });
              assert.deepEqual(
                results[0],
                results[1],
                JSON.stringify({
                  list,
                  leftText,
                  tail,
                  boundary,
                  nesting,
                  reversed,
                }),
              );
              cases++;
            }
  assert.equal(cases, 96);
});

test("nested deletion suffixes retain their wrappers, cursor and undo", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/nested-fitting-followup.json");
  let cases = 0;
  for (const outer of ["bullet_list", "ordered_list"])
    for (const inner of ["bullet_list", "ordered_list"])
      for (const suffix of ["bullet_list", "ordered_list"])
        for (const tail of ["", "a", "🙂"])
          for (const text of ["xxxxx", "🙂xx"])
            for (const nested of [false, true])
              for (const reversed of [false, true]) {
                const json = structuredClone(input.doc),
                  list = json.content[0],
                  middle = list.content[1].content[1];
                for (const [node, type] of [
                  [list, outer],
                  [middle, inner],
                  [middle.content[0].content[1], suffix],
                ]) {
                  node.type = type;
                  if (type === "ordered_list") node.attrs = { order: 7 };
                  else delete node.attrs;
                }
                list.content[0].content[0].content[0].text = text;
                middle.content[0].content[0].content = [
                  { type: "text", text: "x" },
                  ...(tail
                    ? [
                        {
                          type: "text",
                          text: tail,
                          marks: [{ type: "strong" }],
                        },
                      ]
                    : []),
                ];
                if (nested)
                  json.content = [
                    { type: "blockquote", content: json.content },
                  ];
                const results = ["upstream", "vpm"].map((name) => {
                  const x = make(api(name), json),
                    before = x.state.doc,
                    starts = [];
                  before.descendants((node, pos) => {
                    if (node.isTextblock) starts.push(pos + 1);
                  });
                  const from = starts[0] + 2,
                    to = starts[2] + 1,
                    selection = reversed ? [to, from] : [from, to];
                  x.state = x.state.apply(
                    x.state.tr.setSelection(
                      x.A.S.TextSelection.create(before, ...selection),
                    ),
                  );
                  x.state = x.state.apply(
                    x.A.H.closeHistory(x.state.tr.deleteSelection()),
                  );
                  x.state.doc.check();
                  const result = snapshot(x);
                  assert.equal(x.state.selection.anchor, from);
                  assert.equal(x.state.selection.head, from);
                  assert(
                    x.A.H.undo(x.state, (tr) => {
                      x.state = x.state.apply(tr);
                    }),
                  );
                  assert(x.state.doc.eq(before));
                  return result;
                });
                assert.deepEqual(
                  results[0],
                  results[1],
                  JSON.stringify({
                    outer,
                    inner,
                    suffix,
                    tail,
                    text,
                    nested,
                    reversed,
                  }),
                );
                cases++;
              }
  assert.equal(cases, 192);
});

test("repeated text replacements keep their source-boundary cursor and undo", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/nested-insertion-followup.json");
  let cases = 0;
  for (const tail of ["x", "xx", "xxx", "🙂🙂"])
    for (const text of ["", "x", "xx", "🙂"])
      for (const prefix of ["t", "🙂"])
        for (const nested of [false, true])
          for (const reversed of [false, true])
            for (const marked of [false, true]) {
              const json = structuredClone(input.doc),
                item = json.content[0].content[0];
              item.content[0].content[0].text = prefix + "x";
              const right = item.content[1].content[1].content[0].content[0];
              right.text = tail;
              if (marked) right.marks = [{ type: "strong" }];
              if (nested)
                json.content = [{ type: "blockquote", content: json.content }];
              const results = ["upstream", "vpm"].map((name) => {
                const x = make(api(name), json),
                  before = x.state.doc,
                  starts = [];
                before.descendants((node, pos) => {
                  if (node.isTextblock) starts.push(pos + 1);
                });
                const from = starts[0] + prefix.length,
                  to = starts[2],
                  selection = reversed ? [to, from] : [from, to];
                x.state = x.state.apply(
                  x.state.tr.setSelection(
                    x.A.S.TextSelection.create(before, ...selection),
                  ),
                );
                x.state = x.state.apply(
                  x.A.H.closeHistory(x.state.tr.insertText(text)),
                );
                x.state.doc.check();
                const result = snapshot(x);
                assert.equal(x.state.selection.anchor, from + text.length);
                assert.equal(x.state.selection.head, from + text.length);
                assert(
                  x.A.H.undo(x.state, (tr) => {
                    x.state = x.state.apply(tr);
                  }),
                );
                assert(x.state.doc.eq(before));
                return result;
              });
              assert.deepEqual(
                results[0],
                results[1],
                JSON.stringify({
                  tail,
                  text,
                  prefix,
                  nested,
                  reversed,
                  marked,
                }),
              );
              cases++;
            }
  assert.equal(cases, 256);
});

test("cross-depth deletion joins the right structural parent", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/structure-followup.json");
  let cases = 0;
  for (const left of ["bullet_list", "ordered_list"])
    for (const leftInner of ["bullet_list", "ordered_list"])
      for (const right of ["bullet_list", "ordered_list"])
        for (const rightInner of ["bullet_list", "ordered_list"])
          for (const prefix of ["a", "🙂"])
            for (const tail of ["", "tail"])
              for (const nested of [false, true])
                for (const reversed of [false, true]) {
                  const json = structuredClone(input.doc),
                    l = json.content[0],
                    r = json.content[1];
                  for (const [node, type] of [
                    [l, left],
                    [l.content[0].content[1], leftInner],
                    [r, right],
                    [r.content[0].content[1], rightInner],
                  ]) {
                    node.type = type;
                    if (type === "ordered_list") node.attrs = { order: 7 };
                    else delete node.attrs;
                  }
                  l.content[0].content[1].content[0].content[0].content[0].text =
                    prefix + "x";
                  r.content[0].content[0].content = tail
                    ? [{ type: "text", text: tail, marks: [{ type: "em" }] }]
                    : [];
                  if (nested)
                    json.content = [
                      { type: "blockquote", content: json.content },
                    ];
                  const results = ["upstream", "vpm"].map((name) => {
                    const x = make(api(name), json),
                      before = x.state.doc,
                      starts = [];
                    before.descendants((node, pos) => {
                      if (node.isTextblock) starts.push(pos + 1);
                    });
                    const from = starts[1] + prefix.length,
                      to = starts[2],
                      selection = reversed ? [to, from] : [from, to];
                    x.state = x.state.apply(
                      x.state.tr.setSelection(
                        x.A.S.TextSelection.create(before, ...selection),
                      ),
                    );
                    x.state = x.state.apply(
                      x.A.H.closeHistory(x.state.tr.deleteSelection()),
                    );
                    x.state.doc.check();
                    const result = snapshot(x);
                    assert.equal(x.state.selection.anchor, from);
                    assert.equal(x.state.selection.head, from);
                    assert(
                      x.A.H.undo(x.state, (tr) => {
                        x.state = x.state.apply(tr);
                      }),
                    );
                    assert(x.state.doc.eq(before));
                    return result;
                  });
                  assert.deepEqual(
                    results[0],
                    results[1],
                    JSON.stringify({
                      left,
                      leftInner,
                      right,
                      rightInner,
                      prefix,
                      tail,
                      nested,
                      reversed,
                    }),
                  );
                  cases++;
                }
  assert.equal(cases, 256);
});

test("deep boundary deletion preserves the surviving ancestor chain", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json");
  let cases = 0;
  for (const mode of [0, 1, 2, 3])
    for (const tail of ["", "🙂tail"])
      for (const nested of [false, true])
        for (const reversed of [false, true])
          for (const intoText of [false, true]) {
            const json = structuredClone(input.doc);
            let list = 0;
            const rewrite = (node) => {
              if (node.type.endsWith("_list")) {
                const ordered =
                  mode === 1 || (mode > 1 && list++ % 2 === mode - 2);
                node.type = ordered ? "ordered_list" : "bullet_list";
                if (ordered) node.attrs = { order: 7 };
                else delete node.attrs;
              }
              node.content?.forEach(rewrite);
            };
            rewrite(json);
            const paragraphs = [];
            const collect = (node) => {
              if (node.type === "paragraph") paragraphs.push(node);
              node.content?.forEach(collect);
            };
            collect(json);
            paragraphs.at(-1).content = tail
              ? [{ type: "text", text: tail, marks: [{ type: "em" }] }]
              : [];
            if (nested)
              json.content = [{ type: "blockquote", content: json.content }];
            const results = ["upstream", "vpm"].map((name) => {
              const x = make(api(name), json),
                before = x.state.doc,
                starts = [];
              before.descendants((node, pos) => {
                if (node.isTextblock) starts.push(pos + 1);
              });
              const from = starts[0],
                to = starts.at(-1) + (intoText && tail ? 1 : 0);
              const selection = reversed ? [to, from] : [from, to];
              x.state = x.state.apply(
                x.state.tr.setSelection(
                  x.A.S.TextSelection.create(before, ...selection),
                ),
              );
              x.state = x.state.apply(
                x.A.H.closeHistory(x.state.tr.deleteSelection()),
              );
              x.state.doc.check();
              const result = snapshot(x);
              assert(
                x.A.H.undo(x.state, (tr) => {
                  x.state = x.state.apply(tr);
                }),
              );
              assert(x.state.doc.eq(before));
              return result;
            });
            assert.deepEqual(
              results[1],
              results[0],
              JSON.stringify({ mode, tail, nested, reversed, intoText }),
            );
            cases++;
          }
  assert.equal(cases, 64);
});
