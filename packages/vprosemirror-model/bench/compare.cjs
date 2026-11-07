"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    __dirname,
    "../../../scripts/prosemirror-model-conformance",
  );
const upstream = path.join(fixture, "node_modules/prosemirror-model");
const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
    blockquote: {
      content: "block+",
      group: "block",
      toDOM: () => ["blockquote", 0],
      parseDOM: [{ tag: "blockquote" }],
    },
    heading: {
      content: "inline*",
      group: "block",
      attrs: { level: { default: 2 } },
      toDOM: (n) => ["h" + n.attrs.level, 0],
      parseDOM: [{ tag: "h2" }],
    },
    bullet_list: {
      content: "list_item+",
      group: "block",
      toDOM: () => ["ul", 0],
      parseDOM: [{ tag: "ul" }],
    },
    list_item: {
      content: "paragraph block*",
      toDOM: () => ["li", 0],
      parseDOM: [{ tag: "li" }],
    },
    hard_break: {
      inline: true,
      group: "inline",
      toDOM: () => ["br"],
      parseDOM: [{ tag: "br" }],
    },
    text: { group: "inline" },
  },
  marks: {
    strong: { toDOM: () => ["strong", 0], parseDOM: [{ tag: "strong" }] },
    em: { toDOM: () => ["em", 0], parseDOM: [{ tag: "em" }] },
    link: {
      attrs: { href: {} },
      toDOM: (m) => ["a", { href: m.attrs.href }, 0],
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (dom) => ({ href: dom.getAttribute("href") }),
        },
      ],
    },
  },
};
const json = {
  type: "doc",
  content: Array.from({ length: 80 }, (_, i) => ({
    type: "paragraph",
    content: [
      { type: "text", text: "Paragraph " + i + " with rich text. " },
      { type: "text", text: "Marked text", marks: [{ type: "strong" }] },
    ],
  })),
};
const cases = [
  {
    name: "construct editor schema",
    make(file) {
      const { Schema } = require(file);
      return () => new Schema(spec);
    },
    validate: (s) =>
      assert.equal(
        s.nodes.list_item.createAndFill().firstChild.type.name,
        "paragraph",
      ),
  },
  {
    name: "read 80-paragraph JSON document",
    make(file) {
      const s = new (require(file).Schema)(spec);
      return () => s.nodeFromJSON(json);
    },
    validate: (n) => assert.equal(n.childCount, 80),
  },
  {
    name: "resolve varied document positions",
    make(file) {
      const s = new (require(file).Schema)(spec),
        doc = s.nodeFromJSON(json);
      let pos = 0;
      return () => doc.resolve((pos = (pos + 37) % (doc.content.size + 1)));
    },
    validate: (p) => assert(p.pos >= 0),
  },
  {
    name: "resolve repeated cached position",
    make(file) {
      const s = new (require(file).Schema)(spec),
        doc = s.nodeFromJSON(json);
      return () => doc.resolve(10);
    },
    validate: (p) => assert.equal(p.pos, 10),
  },
  {
    name: "insert text in 80-paragraph document",
    make(file) {
      const M = require(file),
        s = new M.Schema(spec),
        doc = s.nodeFromJSON(json),
        slice = new M.Slice(M.Fragment.from(s.text("new ")), 0, 0);
      return () => doc.replace(10, 10, slice);
    },
    validate: (n) => {
      assert.equal(n.childCount, 80);
      assert.match(n.textContent, /new /);
    },
  },
  {
    name: "delete across paragraph boundaries",
    make(file) {
      const M = require(file),
        s = new M.Schema(spec),
        doc = s.nodeFromJSON(json);
      return () => doc.replace(5, doc.child(0).nodeSize + 9, M.Slice.empty);
    },
    validate: (n) => assert.equal(n.childCount, 79),
  },
  {
    name: "parse rich HTML (JSDOM)",
    make(file) {
      const M = require(file),
        s = new M.Schema(spec),
        { JSDOM } = require(path.join(fixture, "node_modules/jsdom")),
        dom = new JSDOM(
          "<div><h2>Heading</h2><p>Some <strong>bold</strong> and <em>emphasized</em> words</p><ul><li><p>Item</p></li></ul></div>",
        ),
        host = dom.window.document.querySelector("div"),
        parser = M.DOMParser.fromSchema(s);
      return () => parser.parse(host);
    },
    validate: (n) => assert.equal(n.childCount, 3),
  },
  {
    name: "serialize rich fragment (JSDOM)",
    make(file) {
      const M = require(file),
        s = new M.Schema(spec),
        doc = s.nodeFromJSON({ ...json, content: json.content.slice(0, 3) }),
        { JSDOM } = require(path.join(fixture, "node_modules/jsdom")),
        document = new JSDOM("").window.document,
        serializer = M.DOMSerializer.fromSchema(s);
      return () => serializer.serializeFragment(doc.content, { document });
    },
    validate: (n) => assert.equal(n.childNodes.length, 3),
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
      "core.cjs",
      "content.cjs",
      "schema.cjs",
      "dom.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vorderedmap/index.cjs",
      "../../scripts/prosemirror-model-conformance/package-lock.json",
      "../../scripts/prosemirror-model-conformance/node_modules/prosemirror-model",
      "../../scripts/prosemirror-model-conformance/node_modules/orderedmap",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
