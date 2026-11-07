"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  JSDOM,
} = require("../../../scripts/prosemirror-view-conformance/node_modules/jsdom");
const { Schema } = require("vprosemirror-model");
const { ReadOnlyRenderer } = require("../readonly.cjs");
const { Decoration: D, DecorationSet: DS } = require("../decorations.cjs");
function fixture() {
  const window = new JSDOM("<!doctype html><body><main></main></body>", {
    pretendToBeVisual: true,
  }).window;
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*", toDOM: () => ["p", 0] },
      text: {},
    },
  });
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("literal <script> & text")),
    schema.node("paragraph", null, schema.text("Second")),
  ]);
  return { window, schema, doc, host: window.document.querySelector("main") };
}

test("current/app/VPM schema, decoration, identity and iframe DOM controls", () => {
  const { window } = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "http://localhost/",
  });
  try {
    window.eval(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../../scripts/prosemirror-view-conformance/node_modules/.vpm-view/dom-bundle.js",
        ),
        "utf8",
      ),
    );
    const result = window.runChecks();
    assert.equal(result.snapshots, 14);
    assert.equal(result.positionFixtures, 22);
    assert.equal(result.identity, true);
    assert.equal(result.widgets, true);
    assert.equal(result.taskCheckboxesDisabled, true);
  } finally {
    window.close();
  }
});

test("decoration wrappers and attributes can change without replacing the underlying node", () => {
  const { window, doc, host } = fixture();
  try {
    const size = doc.firstChild.nodeSize,
      view = new ReadOnlyRenderer(host, { doc }),
      paragraph = view.dom.firstChild,
      second = view.dom.lastChild;
    for (const attrs of [
      { nodeName: "section", class: "one", style: "color: red" },
      { nodeName: "aside", class: "two" },
      { "data-label": "bare" },
      {},
    ]) {
      view.update(doc, DS.create(doc, [D.node(0, size, attrs)]));
      assert.equal(view.dom.querySelector("p"), paragraph);
      assert.equal(view.dom.lastChild, second);
    }
    assert.equal(paragraph.getAttribute("data-label"), null);
    assert.equal(paragraph.getAttribute("class"), null);
    assert.equal(paragraph.style.color, "");
    view.destroy();
    view.destroy();
    assert.equal(host.children.length, 0);
    assert.throws(() => view.update(doc), /destroyed/);
  } finally {
    window.close();
  }
});

test("text remains literal and equivalent updates do not write DOM", () => {
  const { window, doc, host } = fixture();
  try {
    const set = DS.create(doc, [D.inline(1, 4, { class: "selected" })]);
    const view = new ReadOnlyRenderer(host, {
      doc,
      decorations: set,
      attributes: { contenteditable: "true" },
    });
    assert.equal(view.dom.querySelector("script"), null);
    assert.equal(view.dom.textContent, doc.textContent);
    assert.equal(view.dom.getAttribute("contenteditable"), "false");
    const observer = new window.MutationObserver(() => {});
    observer.observe(view.dom, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    view.update(doc, DS.create(doc, [D.inline(1, 4, { class: "selected" })]));
    assert.equal(observer.takeRecords().length, 0);
    observer.disconnect();
    view.destroy();
  } finally {
    window.close();
  }
});

test("render failure destroys the partial view and cleans existing widgets once", () => {
  const { window, doc, host } = fixture();
  try {
    let destroyed = 0;
    const good = D.widget(2, () => window.document.createElement("button"), {
      key: "good",
      destroy: () => destroyed++,
    });
    const view = new ReadOnlyRenderer(host, {
      doc,
      decorations: DS.create(doc, [good]),
    });
    assert.throws(
      () =>
        view.update(
          doc,
          DS.create(doc, [
            good,
            D.widget(4, () => {
              throw Error("factory failed");
            }),
          ]),
        ),
      /factory failed/,
    );
    assert.equal(view.destroyed, true);
    assert.equal(host.children.length, 0);
    assert.equal(destroyed, 1);
    view.destroy();
    assert.equal(destroyed, 1);
  } finally {
    window.close();
  }
});

test("constructor failure cleans widgets created before the failing factory", () => {
  const { window, doc, host } = fixture();
  try {
    let destroyed = 0;
    assert.throws(
      () =>
        new ReadOnlyRenderer(host, {
          doc,
          decorations: DS.create(doc, [
            D.widget(2, () => window.document.createElement("button"), {
              destroy: () => destroyed++,
            }),
            D.widget(4, () => {
              throw Error("factory failed");
            }),
          ]),
        }),
      /factory failed/,
    );
    assert.equal(destroyed, 1);
    assert.equal(host.children.length, 0);
  } finally {
    window.close();
  }
});

test("attribute arrays cannot be reused as DOM recipes", () => {
  const { window, host } = fixture();
  try {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: {
          attrs: { payload: { default: null } },
          toDOM: (node) => node.attrs.payload,
        },
        text: {},
      },
    });
    const doc = schema.node("doc", null, [
      schema.node("paragraph", { payload: ["img", { onerror: "bad" }] }),
    ]);
    assert.throws(() => new ReadOnlyRenderer(host, { doc }), /attribute array/);
    assert.equal(host.children.length, 0);
  } finally {
    window.close();
  }
});

test("read-only task policy does not disable caller-owned checkbox widgets", () => {
  const { window, doc, host } = fixture();
  try {
    const input = window.document.createElement("input");
    input.type = "checkbox";
    const view = new ReadOnlyRenderer(host, {
      doc,
      decorations: DS.create(doc, [D.widget(2, input)]),
    });
    assert.equal(input.disabled, false);
    view.update(doc);
    assert.equal(input.disabled, false);
    view.destroy();
  } finally {
    window.close();
  }
});

test("position lookups reject outside/stale DOM and invalid offsets without modifying content", () => {
  const { window, doc, host } = fixture();
  try {
    const view = new ReadOnlyRenderer(host, { doc });
    const old = view.dom.firstChild.firstChild;
    const observer = new window.MutationObserver(() => {});
    observer.observe(view.dom, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    for (let pos = 0; pos <= doc.content.size; pos++) {
      for (const side of [-1, 0, 1]) {
        const point = view.domAtPos(pos, side);
        assert.equal(view.posAtDOM(point.node, point.offset), pos);
      }
      view.nodeDOM(pos);
    }
    assert.equal(observer.takeRecords().length, 0);
    observer.disconnect();
    for (const pos of [-1, 0.5, NaN, Infinity, doc.content.size + 1]) {
      assert.throws(() => view.domAtPos(pos), RangeError);
      assert.equal(view.nodeDOM(pos), null);
    }
    assert.throws(() => view.posAtDOM(host, 0), RangeError);
    assert.throws(() => view.posAtDOM(old, -1), RangeError);
    assert.throws(() => view.posAtDOM(old, old.length + 1), RangeError);
    view.update(doc.copy(doc.content.cut(doc.firstChild.nodeSize)));
    assert.throws(() => view.posAtDOM(old, 0), /outside/);
    view.destroy();
    assert.throws(() => view.domAtPos(0), /destroyed/);
    assert.throws(() => view.nodeDOM(0), /destroyed/);
    assert.throws(() => view.posAtDOM(view.dom, 0), /destroyed/);
  } finally {
    window.close();
  }
});

test("position lookups use a shadow mount's owner document and retained records", () => {
  const { window, doc, host } = fixture();
  try {
    const shadow = host.attachShadow({ mode: "open" });
    const view = new ReadOnlyRenderer(shadow, { doc });
    for (let pos = 0; pos <= doc.content.size; pos++) {
      const point = view.domAtPos(pos, 1);
      assert.equal(point.node.ownerDocument, window.document);
      assert.equal(view.posAtDOM(point.node, point.offset), pos);
    }
    assert.equal(view.nodeDOM(0), view.dom.firstChild);
    view.destroy();
  } finally {
    window.close();
  }
});
