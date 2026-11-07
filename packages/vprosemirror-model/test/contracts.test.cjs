"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const M = require(process.env.VPM_MODEL_ENTRY || "../index.cjs");
const schema = () =>
  new M.Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      quote: { content: "block+", group: "block" },
      text: {},
    },
    marks: { strong: {}, em: {} },
  });
test("positions and slice depths reject fractional and negative input", () => {
  const s = schema(),
    doc = s.node("doc", null, [s.node("paragraph", null, [s.text("abc")])]);
  for (const pos of [-1, 1.5, NaN, Infinity, 6])
    assert.throws(() => doc.resolve(pos), RangeError);
  for (const openStart of [-1, 0.5, "1", false, "", NaN, null])
    assert.throws(
      () => M.Slice.fromJSON(s, { content: doc.content.toJSON(), openStart }),
      RangeError,
    );
  assert.equal(doc.resolve(2), doc.resolve(2));
});
test("edits retain untouched subtrees and old document contents", () => {
  const s = schema(),
    a = s.node("paragraph", null, s.text("alpha")),
    b = s.node("paragraph", null, s.text("beta")),
    doc = s.node("doc", null, [a, b]);
  const updated = doc.replace(
    2,
    3,
    new M.Slice(M.Fragment.from(s.text("!")), 0, 0),
  );
  assert.equal(updated.child(1), b);
  assert.equal(doc.child(0), a);
  assert.equal(doc.textContent, "alphabeta");
  assert.equal(updated.textContent, "a!phabeta");
  updated.check();
});
test("attribute names are own keys, validators run and prototype names are data", () => {
  const attrs = JSON.parse(
    '{"__proto__":{"default":"safe"},"value":{"default":1,"validate":"number"}}',
  );
  const s = new M.Schema({
    nodes: { doc: { content: "item*" }, item: { attrs }, text: {} },
  });
  const n = s.nodes.item.create(
    Object.assign(Object.create({ value: 99 }), { value: 2 }),
  );
  assert.equal(Object.getPrototypeOf(n.attrs), null);
  assert.equal(n.attrs.__proto__, "safe");
  assert.equal(n.attrs.value, 2);
  assert.equal(
    s.nodes.item.create(Object.create({ value: 99 })).attrs.value,
    1,
  );
  assert.throws(() => s.nodes.item.create({ value: "bad" }), RangeError);
});
test("deterministic open-slice edits agree with the pinned upstream model", () => {
  const U = require("../../../scripts/prosemirror-model-conformance/node_modules/prosemirror-model");
  const spec = {
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      quote: { content: "block+", group: "block" },
      text: {},
    },
    marks: { strong: {}, em: {} },
  };
  const a = new M.Schema(spec),
    b = new U.Schema(spec);
  let seed = 731;
  const rnd = (n) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  const paragraph = () => ({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "a😀bc " + rnd(99),
        ...(rnd(2) ? { marks: [{ type: "strong" }] } : {}),
      },
    ],
  });
  const document = () => ({
    type: "doc",
    content: Array.from({ length: 1 + rnd(4) }, () =>
      rnd(3)
        ? paragraph()
        : { type: "quote", content: [paragraph(), paragraph()] },
    ),
  });
  let successes = 0;
  for (let i = 0; i < 2000; i++) {
    const json = document(),
      source = document(),
      x = a.nodeFromJSON(json),
      y = b.nodeFromJSON(json),
      sx = a.nodeFromJSON(source),
      sy = b.nodeFromJSON(source);
    const from = rnd(x.content.size + 1),
      to = from + rnd(x.content.size - from + 1),
      sf = rnd(sx.content.size + 1),
      st = sf + rnd(sx.content.size - sf + 1),
      parents = !!rnd(2);
    const perform = (doc, src) => {
      try {
        return {
          doc: doc.replace(from, to, src.slice(sf, st, parents)).toJSON(),
        };
      } catch (e) {
        return {
          error:
            e instanceof M.ReplaceError || e instanceof U.ReplaceError
              ? "ReplaceError"
              : e.name,
        };
      }
    };
    const expected = perform(y, sy),
      actual = perform(x, sx);
    assert.deepEqual(actual, expected, "edit " + i);
    if (actual.doc) {
      a.nodeFromJSON(actual.doc).check();
      successes++;
    }
  }
  assert(successes > 250);
});
