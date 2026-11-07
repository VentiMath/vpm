"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-history-conformance/node_modules/.vpm-history",
);
function api(name) {
  return require(path.join(fixture, "api-" + name + ".cjs"));
}
function setup(A, options = {}) {
  const schema = new A.M.Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "text*" },
        text: {},
      },
      marks: { em: {} },
    }),
    plugin = A.H.history(options);
  let state = A.S.EditorState.create({ schema, plugins: [plugin] });
  return {
    A,
    schema,
    plugin,
    get state() {
      return state;
    },
    apply(tr) {
      state = state.apply(tr);
    },
    command(cmd, dispatch = true) {
      return A.H[cmd](
        state,
        dispatch
          ? (tr) => {
              assert.equal(A.H.isHistoryTransaction(tr), true);
              state = state.apply(tr);
            }
          : undefined,
      );
    },
    snapshot() {
      return [
        state.doc.toJSON(),
        state.selection.toJSON(),
        A.H.undoDepth(state),
        A.H.redoDepth(state),
      ];
    },
  };
}
test("4000 deterministic edits match current and app history graphs", () => {
  for (const [control, replacement] of [
    ["upstream", "vpm"],
    ["app", "app-vpm"],
  ]) {
    const u = setup(api(control), { depth: 30 }),
      v = setup(api(replacement), { depth: 30 });
    let seed = 42,
      time = 1000;
    const next = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const saved = [];
    for (let i = 0; i < 2000; i++) {
      const op = next() % 10,
        len = u.state.doc.textContent.length,
        from = 1 + (next() % (len + 1)),
        to = from + (next() % (len + 2 - from));
      time += next() % 800;
      const char = String.fromCharCode(97 + (next() % 26)),
        comp = next() % 4;
      for (const x of [u, v]) {
        const { state, A } = x;
        let tr = state.tr.setTime(time);
        if (op === 0) {
          x.command("undo");
          continue;
        }
        if (op === 1) {
          x.command("redo");
          continue;
        }
        if (op === 2) {
          x.apply(A.H.closeHistory(tr));
          continue;
        }
        if (op === 3) {
          tr.setSelection(A.S.TextSelection.create(state.doc, from, to));
        } else if (op === 4 || op === 5) {
          tr.delete(from, to);
          if (op === 5) tr.setMeta("addToHistory", false);
        } else if (op === 6) {
          tr.addMark(from, to, x.schema.marks.em.create());
        } else {
          tr.insertText(char, from);
          if (op === 7) tr.setMeta("addToHistory", false);
          if (op === 8) tr.setMeta("composition", comp);
        }
        x.apply(tr);
      }
      assert.deepEqual(
        v.snapshot(),
        u.snapshot(),
        control + " at operation " + i + " type " + op,
      );
      if (i % 97 === 0) saved.push([v.state, JSON.stringify(v.snapshot()[0])]);
    }
    for (const [old, json] of saved)
      assert.equal(JSON.stringify(old.doc.toJSON()), json);
  }
});
test("partial undo/redo cycles remain bounded and preserve earlier events through untracked edits", () => {
  const u = setup(api("upstream")),
    v = setup(api("vpm"));
  for (const x of [u, v]) {
    for (let i = 0; i < 8; i++)
      x.apply(x.A.H.closeHistory(x.state.tr.insertText(String(i), 1)));
  }
  for (let i = 0; i < 1000; i++) {
    for (const x of [u, v]) {
      x.command("undo");
      x.command("redo");
    }
    if (i % 71 === 0) {
      for (const x of [u, v])
        x.apply(x.state.tr.insertText("x", 1).setMeta("addToHistory", false));
    }
    assert.deepEqual(v.snapshot(), u.snapshot());
  }
  const data = v.plugin.getState(v.state);
  assert(
    data.maps.length < 512,
    "timeline did not reclaim cancelled map pairs: " + data.maps.length,
  );
  for (let i = 0; i < 8; i++) {
    u.command("undo");
    v.command("undo");
    assert.deepEqual(v.snapshot(), u.snapshot());
  }
});
test("commands, query-only calls, scroll variants and beforeinput match", () => {
  for (const name of ["vpm", "app-vpm"]) {
    const H = api(name).H;
    for (const depth of [-1, 1.5, "100", {}])
      assert.throws(() => H.history({ depth }), RangeError);
    for (const newGroupDelay of [-1, "500", {}])
      assert.throws(() => H.history({ newGroupDelay }), RangeError);
    for (const options of [
      { depth: Infinity },
      { newGroupDelay: Infinity },
      { depth: 0, newGroupDelay: 0 },
    ])
      assert.doesNotThrow(() => H.history(options));
  }
  for (const name of ["upstream", "app", "vpm", "app-vpm"]) {
    const x = setup(api(name));
    assert.equal(x.command("undo"), false);
    x.apply(x.state.tr.insertText("abc"));
    const before = x.state;
    assert.equal(x.command("undo", false), true);
    assert.equal(x.state, before);
    let result;
    x.A.H.undoNoScroll(x.state, (tr) => {
      result = tr;
    });
    assert.equal(result.scrolledIntoView, false);
    x.apply(result);
    x.A.H.redo(x.state, (tr) => {
      result = tr;
    });
    assert.equal(result.scrolledIntoView, true);
    x.apply(result);
    let prevented = 0;
    const handler = x.plugin.props.handleDOMEvents.beforeinput,
      view = {
        get state() {
          return x.state;
        },
        dispatch: (tr) => x.apply(tr),
        editable: true,
      };
    assert.equal(
      handler(view, {
        inputType: "historyUndo",
        preventDefault() {
          prevented++;
        },
      }),
      true,
    );
    assert.equal(prevented, 1);
    view.editable = false;
    assert.equal(
      handler(view, {
        inputType: "historyRedo",
        preventDefault() {
          throw Error("prevented read-only");
        },
      }),
      false,
    );
    assert.equal(x.A.H.isHistoryTransaction(x.state.tr), false);
  }
});
test("all-selection restoration and immutable state branching", () => {
  for (const name of ["upstream", "vpm"]) {
    const x = setup(api(name));
    x.apply(x.state.tr.insertText("abc"));
    x.apply(
      x.A.H.closeHistory(
        x.state.tr.setSelection(new x.A.S.AllSelection(x.state.doc)),
      ),
    );
    const original = x.state;
    x.apply(x.state.tr.insertText("replacement"));
    x.command("undo");
    assert.equal(x.state.doc.textContent, "abc");
    assert.equal(
      x.state.selection.constructor.name,
      original.selection.constructor.name,
    );
    const a = original.apply(original.tr.insertText("a")),
      b = original.apply(original.tr.insertText("b"));
    assert.equal(a.doc.textContent, "a");
    assert.equal(b.doc.textContent, "b");
    assert.equal(original.doc.textContent, "abc");
  }
});
test("rebasing more unconfirmed steps than retained history preserves trimmed events", () => {
  const variants = ["upstream", "app", "vpm", "app-vpm"].map((name) =>
    Object.assign(setup(api(name), { depth: 2 }), { name }),
  );
  for (const x of variants) {
    const steps = [],
      docs = [];
    for (let i = 0; i < 30; i++) {
      const tr = x.A.H.closeHistory(
        x.state.tr.insertText(String(i % 10), x.state.doc.content.size - 1),
      );
      steps.push(tr.steps[0]);
      docs.push(tr.docs[0]);
      x.apply(tr);
    }
    const tr = x.state.tr;
    for (let i = 29; i >= 0; i--) tr.step(steps[i].invert(docs[i]));
    tr.insertText("remote", 1);
    for (let i = 0; i < 30; i++) {
      const mapped = steps[i].map(tr.mapping.slice(30 - i));
      assert(mapped);
      tr.step(mapped);
      tr.mapping.setMirror(29 - i, tr.steps.length - 1);
    }
    x.apply(tr.setMeta("addToHistory", false).setMeta("rebased", 30));
  }
  const old = variants.find((x) => x.name === "app");
  old.command("undo");
  assert.equal(
    old.state.doc.textContent,
    "remote01234567901234567890123456789",
  );
  const supported = variants.filter((x) => x !== old);
  for (let i = 0; i < 10; i++) {
    for (const x of supported) x.command("undo");
    for (const x of supported.slice(1))
      assert.deepEqual(
        x.snapshot(),
        supported[0].snapshot(),
        x.name + " at " + i,
      );
  }
  for (let i = 0; i < 10; i++) {
    for (const x of supported) x.command("redo");
    for (const x of supported.slice(1))
      assert.deepEqual(
        x.snapshot(),
        supported[0].snapshot(),
        x.name + " at " + i,
      );
  }
});
