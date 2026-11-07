"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  {
    load,
  } = require("../../../scripts/prosemirror-keymap-conformance/load.cjs");
const platforms = ["Linux", "Win32", "MacIntel", "iPad", "iPhone", "iPod"];
function event(key, keyCode, flags) {
  return {
    key,
    keyCode,
    shiftKey: !!(flags & 1),
    altKey: !!(flags & 2),
    ctrlKey: !!(flags & 4),
    metaKey: !!(flags & 8),
  };
}
function run(lib, bindings, e, handled = true) {
  const trace = [],
    commands = Object.fromEntries(
      bindings.map((name, i) => [
        name,
        () => {
          trace.push(i);
          return typeof handled === "function" ? handled(i) : handled;
        },
      ]),
    );
  const result = lib.keydownHandler(commands)({ state: {}, dispatch() {} }, e);
  return { result, trace };
}
test("modifier aliases, order, literal dash and all event masks match upstream", () => {
  const prefixes = [
      "Shift",
      "s",
      "Alt",
      "a",
      "Ctrl",
      "Control",
      "c",
      "Cmd",
      "Meta",
      "m",
      "Mod",
      "SHIFT",
      "CTRL",
    ],
    keys = ["a", "A", "Space", "-", "Enter", "ArrowLeft"];
  let count = 0;
  for (const platform of platforms) {
    const libs = ["vpm", "upstream"].map(
      (v) => load(v, { platform, userAgent: "Chrome" }).keymap,
    );
    for (const prefix of [
      "",
      ...prefixes,
      ...prefixes.map((p, i) => p + "-" + prefixes[(i + 3) % prefixes.length]),
    ])
      for (const key of keys)
        for (let flags = 0; flags < 16; flags++) {
          const binding = (prefix ? prefix + "-" : "") + key,
            e = event(
              key === "Space" ? " " : key,
              key === "a" || key === "A" ? 65 : 0,
              flags,
            );
          assert.deepEqual(
            run(libs[0], [binding], e),
            run(libs[1], [binding], e),
          );
          count++;
        }
  }
  assert.equal(count, 15552);
});
test("fallback command order and Windows AltGraph exclusions match current runtime", () => {
  for (const platform of platforms) {
    const libs = ["vpm", "upstream"].map(
      (v) => load(v, { platform, userAgent: "Chrome" }).keymap,
    );
    for (let flags = 0; flags < 16; flags++)
      for (const [key, code] of [
        ["% ", 53],
        ["%", 53],
        ["é", 69],
        ["≈", 88],
        ["ы", 83],
        ["A", 65],
        [" ", 32],
        ["Dead", 229],
        ["Process", 229],
      ])
        for (const handled of [true, false, (i) => i % 3 === 0]) {
          const binds = [
            "%",
            "Shift-%",
            "Shift-5",
            "Alt-%",
            "Shift-Alt-%",
            "Alt-Shift-5",
            "Ctrl-é",
            "Ctrl-Alt-é",
            "Ctrl-Alt-e",
            "Alt-x",
            "Ctrl-s",
            "Mod-s",
            "Shift-A",
            "A",
            "a",
            "Shift-a",
          ];
          assert.deepEqual(
            run(libs[0], binds, event(key, code, flags), handled),
            run(libs[1], binds, event(key, code, flags), handled),
          );
        }
  }
  const { keymap } = load("vpm", { platform: "Linux", userAgent: "Chrome" });
  assert.equal(run(keymap, ["Shift-5"], event("%", 53, 1)).result, false);
  assert.equal(run(keymap, ["%"], event("%", 53, 1)).result, true);
});
test("binding aliases overwrite in input order and are snapshotted once", () => {
  for (const variant of ["vpm", "upstream"]) {
    const { keymap } = load(variant, { platform: "Win32" }),
      trace = [],
      bindings = {
        "Ctrl-a": () => {
          trace.push("first");
          return true;
        },
        "Control-a": () => {
          trace.push("last");
          return true;
        },
      },
      handler = keymap.keydownHandler(bindings);
    bindings["Control-a"] = () => {
      throw Error("mutated binding read");
    };
    assert.equal(
      handler({ state: {}, dispatch() {} }, event("a", 65, 4)),
      true,
    );
    assert.deepEqual(trace, ["last"]);
  }
});
test("plugin dispatch updates real state and preserves earlier-plugin precedence", () => {
  for (const variant of ["vpm", "upstream"]) {
    const { keymap, state, model } = load(variant, { platform: "Linux" }),
      schema = new model.Schema({
        nodes: {
          doc: { content: "paragraph+" },
          paragraph: { content: "text*" },
          text: {},
        },
      }),
      calls = [];
    const plugins = [
      keymap.keymap({
        Enter: (s, dispatch, view) => {
          calls.push("first");
          assert.equal(view.state, s);
          return false;
        },
      }),
      keymap.keymap({
        Enter: (s, dispatch) => {
          calls.push("second");
          dispatch(s.tr.insertText("x"));
          return true;
        },
      }),
      keymap.keymap({
        Enter: () => {
          throw Error("later plugin called");
        },
      }),
    ];
    let current = state.EditorState.create({ schema, plugins });
    const view = {
      get state() {
        return current;
      },
      dispatch(tr) {
        current = current.apply(tr);
      },
    };
    assert(
      plugins.some((p) => p.props.handleKeyDown(view, event("Enter", 13, 0))),
    );
    assert.equal(current.doc.textContent, "x");
    assert.deepEqual(calls, ["first", "second"]);
  }
});
test("only own binding definitions are compiled and prototype-like key names work", () => {
  const { keymap } = load("vpm"),
    bindings = Object.create({
      Enter: () => {
        throw Error("inherited binding ran");
      },
    });
  bindings.constructor = () => true;
  const handler = keymap.keydownHandler(bindings);
  assert.equal(handler({ state: {} }, event("Enter", 13, 0)), false);
  assert.equal(handler({ state: {} }, event("constructor", 0, 0)), true);
  // Mutate only the isolated module realm, not the test runner's Array.
  const inherited = keymap.keydownHandler.constructor(
    "Array.prototype[4] = {Enter: () => true}",
  );
  inherited();
  try {
    assert.equal(
      keymap.keydownHandler({})({ state: {} }, event("Enter", 13, 4)),
      false,
    );
    assert.equal(
      keymap.keydownHandler({ "Ctrl-Enter": () => true })(
        { state: {} },
        event("Enter", 13, 4),
      ),
      true,
    );
  } finally {
    keymap.keydownHandler.constructor("delete Array.prototype[4]")();
  }
  const explicit = Object.create(null);
  explicit.__proto__ = () => true;
  assert.equal(
    keymap.keydownHandler(explicit)({ state: {} }, event("__proto__", 0, 0)),
    true,
  );
});
test("invalid modifier errors and unmatched-key return values match upstream", () => {
  for (const variant of ["vpm", "upstream"]) {
    const { keymap } = load(variant);
    for (const key of ["Super-a", "Hyper-Enter", "-a", "Ctrl--a"])
      assert.throws(
        () => keymap.keydownHandler({ [key]: () => true }),
        /Unrecognized modifier name/,
      );
    assert.equal(
      keymap.keydownHandler({})({ state: {} }, event("Dead", 229, 0)),
      false,
    );
    assert.equal(
      keymap.keydownHandler({ "Ctrl-": () => true })(
        { state: {} },
        event("Ctrl-", 0, 0),
      ),
      true,
    );
  }
});
