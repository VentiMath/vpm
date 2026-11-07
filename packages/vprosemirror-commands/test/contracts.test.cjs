"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-commands-conformance/node_modules",
);
const libraries = [
  {
    c: require(process.env.VPM_COMMANDS_ENTRY || ".."),
    s: require(process.env.VPM_STATE_ENTRY || "vprosemirror-state"),
    m: require(process.env.VPM_MODEL_ENTRY || "vprosemirror-model"),
  },
  {
    c: require(path.join(fixture, "prosemirror-commands")),
    s: require(path.join(fixture, "prosemirror-state")),
    m: require(path.join(fixture, "prosemirror-model")),
  },
];
const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    heading: { content: "inline*", group: "block" },
    code: { content: "text*", group: "block", code: true, marks: "" },
    quote: { content: "block+", group: "block" },
    isolate: { content: "block+", group: "block", isolating: true },
    bullet_list: { content: "list_item+", group: "block" },
    list_item: { content: "paragraph block*" },
    image: { group: "block", atom: true },
    inline_atom: {
      content: "text*",
      group: "inline",
      inline: true,
      atom: true,
    },
    text: { group: "inline" },
  },
  marks: { em: {}, strong: {}, link: { attrs: { href: {} } } },
};
function context(lib, make, from, to = from) {
  const schema = new lib.m.Schema(spec),
    n = (t, ...children) => schema.node(t, null, children),
    text = (t) => schema.text(t);
  const doc = make(n, text, schema);
  return {
    ...lib,
    schema,
    state: lib.s.EditorState.create({
      doc,
      selection: lib.s.TextSelection.create(doc, from, to),
    }),
  };
}
function perform(x, command, view) {
  const before = x.state;
  let state = before,
    dispatched = 0;
  const available = command(before),
    handled = command(
      before,
      (tr) => {
        state = state.apply(tr);
        dispatched++;
      },
      view,
    );
  assert.equal(before.doc.eq(x.state.doc), true);
  state.doc.check();
  return {
    state,
    result: {
      available,
      handled,
      dispatched,
      doc: state.doc.toJSON(),
      selection: state.selection.toJSON(),
      marks: state.storedMarks?.map((m) => m.toJSON()) ?? null,
    },
  };
}
function compare(make, from, to, command) {
  const out = libraries.map((lib) => {
    const x = context(lib, make, from, to);
    return perform(x, command(x)).result;
  });
  assert.deepEqual(out[0], out[1]);
  return out[0];
}
test("500 deterministic command sequences match current upstream", () => {
  let seed = 0x71cafe;
  const rnd = (n) => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
  let xs = libraries.map((lib) =>
    context(
      lib,
      (n, t) =>
        n("doc", n("paragraph", t("alpha beta")), n("heading", t("gamma"))),
      1,
    ),
  );
  for (let i = 0; i < 500; i++) {
    const positions = [];
    xs[0].state.doc.descendants((n, p) => {
      if (n.isTextblock) positions.push([p + 1, n.content.size]);
    });
    const [start, size] = positions[rnd(positions.length)],
      pos = start + rnd(size + 1),
      op = rnd(7);
    const outputs = xs.map((x) => {
      x.state = x.state.apply(
        x.state.tr.setSelection(x.s.TextSelection.create(x.state.doc, pos)),
      );
      const commands = [
        x.c.toggleMark(x.schema.marks.em),
        x.c.setBlockType(x.schema.nodes.heading),
        x.c.setBlockType(x.schema.nodes.paragraph),
        x.c.selectTextblockStart,
        x.c.selectTextblockEnd,
        x.c.chainCommands(x.c.joinBackward, x.c.selectNodeBackward),
        positions.length < 10 ? x.c.splitBlock : x.c.joinUp,
      ];
      return perform(x, commands[op]);
    });
    assert.deepEqual(outputs[0].result, outputs[1].result, "operation " + i);
    xs.forEach((x, j) => (x.state = outputs[j].state));
  }
});
test("split after cross-list deletion uses the surviving paragraph", () => {
  const r = compare(
    (n, t) =>
      n(
        "doc",
        n(
          "bullet_list",
          n("list_item", n("paragraph"), n("code", t("0"))),
          n("list_item", n("paragraph")),
        ),
      ),
    5,
    10,
    (x) => x.c.splitBlock,
  );
  assert.equal(r.handled, true);
  assert.equal(r.doc.content[0].content.length, 2);
  assert.equal(r.doc.content[0].content[1].content.length, 2);
});
test("boundary commands honor isolating containers, atoms and view direction", () => {
  for (const name of [
    "joinBackward",
    "joinForward",
    "joinTextblockBackward",
    "joinTextblockForward",
    "selectNodeBackward",
    "selectNodeForward",
  ])
    for (const wrap of ["quote", "isolate"])
      for (const pos of [2, 3, 7, 8])
        compare(
          (n, t) =>
            n(
              "doc",
              n(wrap, n("paragraph", t("a"))),
              n("image"),
              n("paragraph", t("b")),
            ),
          pos,
          pos,
          (x) => x.c[name],
        );
  for (const lib of libraries) {
    const x = context(
      lib,
      (n, t) => n("doc", n("paragraph", t("ab")), n("paragraph", t("cd"))),
      6,
    );
    const dirs = [];
    assert.equal(
      x.c.joinBackward(
        x.state,
        () => {
          throw Error("unexpected edit");
        },
        {
          endOfTextblock(direction) {
            dirs.push(direction);
            return false;
          },
        },
      ),
      false,
    );
    assert.deepEqual(dirs, ["backward"]);
  }
});
test("mark options respect whitespace, partially marked text and inline atoms", () => {
  for (const includeWhitespace of [false, true])
    for (const enterInlineAtoms of [false, true])
      for (const removeWhenPresent of [false, true])
        compare(
          (n, t, s) =>
            n(
              "doc",
              n(
                "paragraph",
                t("  a ").mark([s.mark("em")]),
                n("inline_atom", t("b")),
                t(" c  "),
              ),
            ),
          1,
          12,
          (x) =>
            x.c.toggleMark(x.schema.marks.em, null, {
              includeWhitespace,
              enterInlineAtoms,
              removeWhenPresent,
            }),
        );
});
test("dry runs preserve state, chains stop, and keymaps retain editor bindings", () => {
  for (const lib of libraries) {
    const x = context(lib, (n, t) => n("doc", n("paragraph", t("abc"))), 2);
    const calls = [];
    assert.equal(
      lib.c.chainCommands(
        () => {
          calls.push(1);
          return false;
        },
        () => {
          calls.push(2);
          return true;
        },
        () => {
          throw Error("late command");
        },
      )(x.state),
      true,
    );
    assert.deepEqual(calls, [1, 2]);
    const before = x.state.toJSON();
    for (const command of [
      lib.c.splitBlock,
      lib.c.toggleMark(x.schema.marks.em),
      lib.c.wrapIn(x.schema.nodes.quote),
    ])
      assert.equal(command(x.state), true);
    assert.deepEqual(x.state.toJSON(), before);
    for (const key of [
      "Enter",
      "Mod-Enter",
      "Backspace",
      "Mod-Backspace",
      "Delete",
      "Mod-Delete",
      "Mod-a",
    ])
      assert.equal(typeof lib.c.pcBaseKeymap[key], "function");
    for (const key of [
      "Ctrl-h",
      "Ctrl-d",
      "Ctrl-a",
      "Ctrl-e",
      "Alt-Backspace",
      "Alt-Delete",
    ])
      assert.equal(typeof lib.c.macBaseKeymap[key], "function");
  }
});
test("autoJoin respects transaction metadata and retains command dry-run behavior", () => {
  for (const meta of [false, true])
    compare(
      (n, t) =>
        n(
          "doc",
          n("quote", n("paragraph", t("a"))),
          n("paragraph", t("x")),
          n("quote", n("paragraph", t("b"))),
        ),
      7,
      7,
      (x) =>
        x.c.autoJoin(
          (state, dispatch) => {
            if (dispatch) {
              const tr = state.tr.delete(5, 8);
              if (meta) tr.setMeta("app", true);
              dispatch(tr);
            }
            return true;
          },
          ["quote"],
        ),
    );
});
