"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/prosemirror-view-conformance"),
  upstream = path.join(fixture, "node_modules/prosemirror-view");
let cleanup = () => {};
function prepare(file, kind) {
  cleanup();
  const { JSDOM } = require(path.join(fixture, "node_modules/jsdom"));
  const { window } = new JSDOM("<!doctype html><body><main></main></body>", {
    pretendToBeVisual: true,
  });
  for (const name of [
    "window",
    "document",
    "Node",
    "HTMLElement",
    "MutationObserver",
    "getComputedStyle",
  ])
    globalThis[name] = name === "window" ? window : window[name];
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
  });
  const { Schema } = require(
      path.join(fixture, "node_modules/prosemirror-model"),
    ),
    { EditorState } = require(
      path.join(fixture, "node_modules/prosemirror-state"),
    );
  const baseline = file !== root,
    api = baseline ? require(file) : require(path.join(root, "readonly.cjs")),
    decos = baseline ? api : require(path.join(root, "decorations.cjs"));
  const s = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*", toDOM: () => ["p", 0] },
      text: {},
    },
  });
  const doc = s.node(
    "doc",
    null,
    Array.from({ length: 32 }, (_, i) =>
      s.node("paragraph", null, s.text("Paragraph " + i)),
    ),
  );
  const other = doc.copy(
    doc.content.replaceChild(
      0,
      s.node("paragraph", null, s.text("Changed first paragraph")),
    ),
  );
  const states = [
      EditorState.create({ doc }),
      EditorState.create({ doc: other }),
    ],
    host = window.document.querySelector("main");
  const sets = ["one", "two"].map((c) =>
    decos.DecorationSet.create(doc, [
      decos.Decoration.inline(2, 5, { class: c }),
    ]),
  );
  let active = decos.DecorationSet.empty,
    index = 0;
  const make = () =>
    baseline
      ? new api.EditorView(host, {
          state: states[0],
          editable: () => false,
          decorations: () => active,
        })
      : new api.ReadOnlyRenderer(host, { doc, decorations: active });
  const lookup = ["domAtPos", "posAtDOM", "nodeDOM"].includes(kind);
  if (lookup)
    active = decos.DecorationSet.create(doc, [
      decos.Decoration.inline(2, 5, { nodeName: "em", class: "lookup" }),
      decos.Decoration.node(0, doc.firstChild.nodeSize, {
        nodeName: "section",
      }),
      decos.Decoration.widget(5, () => window.document.createElement("span"), {
        key: "lookup",
        side: -1,
      }),
    ]);
  let view;
  if (kind !== "create") view = make();
  cleanup = () => {
    view?.destroy();
    window.close();
  };
  if (kind === "create")
    return () => {
      const v = make(),
        count = v.dom.childNodes.length;
      v.destroy();
      return count;
    };
  if (lookup) {
    const positions = Array.from({ length: doc.content.size + 1 }, (_, i) => i);
    const points =
      kind === "posAtDOM" ? positions.map((p) => view.domAtPos(p, 1)) : null;
    return () => {
      index = (index + 1) % positions.length;
      if (kind === "domAtPos") return view.domAtPos(positions[index], 1).offset;
      if (kind === "nodeDOM")
        return view.nodeDOM(positions[index])?.nodeType || 0;
      const point = points[index];
      return view.posAtDOM(point.node, point.offset);
    };
  }
  return () => {
    index ^= 1;
    if (kind === "decoration") active = sets[index];
    if (baseline) view.updateState(kind === "edit" ? states[index] : states[0]);
    else view.update(kind === "edit" ? [doc, other][index] : doc, active);
    return view.dom.childNodes.length;
  };
}
const cases = [
  ["create", "create/destroy a read-only 32-paragraph view"],
  ["edit", "change one paragraph of 32"],
  ["decoration", "change one highlight in 32 paragraphs"],
  ["noop", "repeat identical document/decorations"],
  ["domAtPos", "document to DOM lookup across 32 paragraphs"],
  ["posAtDOM", "DOM to document lookup across 32 paragraphs"],
  ["nodeDOM", "node DOM lookup across 32 paragraphs"],
].map(([kind, name]) => ({
  name,
  make: (file) => prepare(file, kind),
  validate: (n) =>
    ["domAtPos", "posAtDOM", "nodeDOM"].includes(kind)
      ? assert.ok(Number.isInteger(n) && n >= 0)
      : assert.equal(n, 32),
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "readonly.cjs",
      "readonly.mjs",
      "readonly.d.ts",
      "readonly.d.mts",
      "decorations.cjs",
      "package.json",
      "bench/readonly.cjs",
      "../../scripts/prosemirror-view-conformance/package-lock.json",
    ],
    cleanup: async () => cleanup(),
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
