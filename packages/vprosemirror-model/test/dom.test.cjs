"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  JSDOM,
} = require("../../../scripts/prosemirror-model-conformance/node_modules/jsdom");
const M = require(process.env.VPM_MODEL_ENTRY || "../index.cjs");
test("attribute data cannot become executable DOM specs; text stays literal", () => {
  const window = new JSDOM("").window;
  try {
    const s = new M.Schema({
      nodes: {
        doc: { content: "box+" },
        box: {
          attrs: { label: { default: "" } },
          toDOM: (n) => ["div", n.attrs.label],
        },
        text: {},
      },
    });
    const serializer = M.DOMSerializer.fromSchema(s);
    const safe = serializer.serializeNode(
      s.nodes.box.create({ label: "<script>bad()</script>" }),
      { document: window.document },
    );
    assert.equal(safe.textContent, "<script>bad()</script>");
    assert.equal(safe.querySelector("script"), null);
    assert.throws(
      () =>
        serializer.serializeNode(
          s.nodes.box.create({ label: ["script", "bad()"] }),
          { document: window.document },
        ),
      RangeError,
    );
    assert.throws(
      () => M.DOMSerializer.renderSpec(window.document, ["div", 0, "extra"]),
      RangeError,
    );
    assert.throws(
      () =>
        M.DOMSerializer.renderSpec(window.document, [
          "div",
          ["p", 0],
          ["p", 0],
        ]),
      RangeError,
    );
  } finally {
    window.close();
  }
});

test("DOM source offsets follow collapsed whitespace and trailing trim", () => {
  const window = new JSDOM("<p></p>").window;
  try {
    const s = new M.Schema({
      nodes: {
        doc: { content: "p+" },
        p: { content: "text*", parseDOM: [{ tag: "p" }] },
        text: {},
      },
    });
    const p = window.document.querySelector("p");
    for (const [text, expected] of [
      ["  a b", [1, 1, 1, 2, 3, 4]],
      ["a   b", [1, 2, 3, 3, 3, 4]],
      ["\n a\n b ", [1, 1, 1, 2, 3, 3, 4, 4]],
    ]) {
      p.textContent = text;
      const positions = Array.from(
        { length: text.length + 1 },
        (_, offset) => ({ node: p.firstChild, offset }),
      );
      const doc = M.DOMParser.fromSchema(s).parse(p.parentNode, {
        findPositions: positions,
      });
      assert.equal(doc.textContent, "a b");
      assert.deepEqual(
        positions.map((point) => point.pos),
        expected,
      );
    }
  } finally {
    window.close();
  }
});
