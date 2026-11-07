"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const entry = process.env.VPM_TRANSFORM_ENTRY || path.resolve(__dirname, "..");
const v = require(entry),
  model = require(process.env.VPM_MODEL_ENTRY || "vprosemirror-model");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-transform-conformance/node_modules",
);
const u = require(path.join(fixture, "prosemirror-transform")),
  um = require(path.join(fixture, "prosemirror-model"));
const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "text*", group: "block" },
    heading: {
      content: "text*",
      group: "block",
      attrs: { level: { default: 1 } },
    },
    quote: { content: "block+", group: "block" },
    text: {},
  },
  marks: { em: {}, strong: {}, link: { attrs: { href: {} } } },
};
function make(m) {
  return new m.Schema(spec);
}
test("3,000 deterministic editor operations match current upstream, including mapped selection and undo", () => {
  let seed = 0x503a51;
  const random = (n) =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n,
    schemas = [make(model), make(um)],
    libs = [v, u];
  let docs = schemas.map((s) =>
    s.node("doc", null, [
      s.node("paragraph", null, s.text("abcdefghij")),
      s.node("heading", null, s.text("klmnop")),
    ]),
  );
  for (let i = 0; i < 3000; i++) {
    const places = [];
    docs[0].descendants((n, pos) => {
      if (n.isTextblock) places.push([pos + 1, n.content.size]);
    });
    const [start, len] = places[random(places.length)],
      offset = random(len + 1),
      pos = start + offset,
      op = random(6),
      end = pos + random(len - offset + 1),
      mark = random(2) ? "em" : "strong";
    const transforms = libs.map((lib, j) => {
      const tr = new lib.Transform(docs[j]),
        s = schemas[j];
      if (op === 0) tr.insert(pos, s.text("x"));
      else if (op === 1) tr.delete(pos, end);
      else if (op === 2) tr.addMark(pos, end, s.mark(mark));
      else if (op === 3) tr.removeMark(pos, end, s.marks[mark]);
      else if (op === 4)
        tr.setBlockType(start, start + len, s.nodes.heading, { level: 2 });
      else if (places.length < 8) tr.split(pos);
      else if (start > 1 && lib.canJoin(tr.doc, start - 1)) tr.join(start - 1);
      return tr;
    });
    assert.deepEqual(
      transforms[0].doc.toJSON(),
      transforms[1].doc.toJSON(),
      "operation " + i,
    );
    for (const assoc of [-1, 1])
      assert.equal(
        transforms[0].mapping.map(pos, assoc),
        transforms[1].mapping.map(pos, assoc),
        "selection " + i,
      );
    for (const tr of transforms) {
      let restored = tr.doc;
      for (let j = tr.steps.length - 1; j >= 0; j--)
        restored = tr.steps[j].invert(tr.docs[j]).apply(restored).doc;
      assert(restored.eq(tr.before), "undo " + i);
      tr.doc.check();
    }
    docs = transforms.map((tr) => tr.doc);
  }
});
test("mirrored rebasing, deletion flags and copy-on-write slices match upstream", () => {
  for (let n = 0; n < 200; n++) {
    const maps = [
        new v.StepMap([3, 5, 1]),
        new v.StepMap([1, 0, n]),
        new v.StepMap([3 + n, 1, 5]),
      ],
      control = maps.map((m) => new u.StepMap(m.ranges));
    const a = new v.Mapping(),
      b = new u.Mapping();
    maps.forEach((m, i) => a.appendMap(m, i === 2 ? 0 : undefined));
    control.forEach((m, i) => b.appendMap(m, i === 2 ? 0 : undefined));
    for (let pos = 0; pos < 20; pos++)
      for (const side of [-1, 1]) {
        const x = a.mapResult(pos, side),
          y = b.mapResult(pos, side);
        for (const k of [
          "pos",
          "deleted",
          "deletedBefore",
          "deletedAfter",
          "deletedAcross",
        ])
          assert.equal(x[k], y[k]);
        assert.equal(a.invert().map(x.pos, side), b.invert().map(y.pos, side));
      }
    const slice = a.slice();
    a.appendMap(v.StepMap.offset(2));
    assert.equal(slice.maps.length, 3);
    assert.equal(slice.to, 3);
  }
});
test("overlapping mark undo retains earlier formatting and JSON round-trips composite inverses", () => {
  const s = make(model),
    doc = s.node(
      "doc",
      null,
      s.node("paragraph", null, [
        s.text("a"),
        s.text("bc", [s.mark("em")]),
        s.text("d"),
      ]),
    );
  for (const step of [
    new v.AddMarkStep(1, 5, s.mark("em")),
    new v.RemoveMarkStep(1, 5, s.mark("em")),
  ]) {
    const after = step.apply(doc).doc,
      inverse = step.invert(doc);
    assert(inverse.apply(after).doc.eq(doc));
    assert(v.Step.fromJSON(s, inverse.toJSON()).apply(after).doc.eq(doc));
  }
});
test("serialized steps reject invalid positions and inherited registry names", () => {
  const s = make(model);
  for (const n of [-1, 0.5, NaN, Infinity, "2", null])
    assert.throws(
      () => v.Step.fromJSON(s, { stepType: "replace", from: n, to: 2 }),
      RangeError,
    );
  for (const id of ["__proto__", "constructor", "toString"])
    assert.throws(() => v.Step.fromJSON(s, { stepType: id }), RangeError);
  assert.throws(
    () =>
      v.Step.fromJSON(s, {
        stepType: "markSet",
        steps: [{ stepType: "replace", from: 0, to: 0 }],
      }),
    RangeError,
  );
});

test("ordinary paragraph joins retain one structural edit without redundant markup changes", () => {
  const s = make(model),
    d = s.node("doc", null, [
      s.node("paragraph", null, s.text("a")),
      s.node("paragraph", null, s.text("b")),
    ]);
  const tr = new v.Transform(d).join(3);
  assert.equal(tr.steps.length, 1);
  assert.equal(tr.doc.firstChild.textContent, "ab");
  assert(tr.steps[0].invert(d).apply(tr.doc).doc.eq(d));
});

test("navigation helpers match valid upstream candidates and reject its incompatible empty-block join", () => {
  const schemas = [make(model), make(um)],
    libs = [v, u],
    models = [model, um];
  const docs = schemas.map((s) =>
    s.node("doc", null, [
      s.node("paragraph", null, s.text("abc")),
      s.node("quote", null, [
        s.node("paragraph", null, s.text("de")),
        s.node("heading", null, s.text("fg")),
      ]),
      s.node("paragraph"),
    ]),
  );
  for (let pos = 0; pos <= docs[0].content.size; pos++) {
    for (const depth of [1, 2])
      assert.equal(
        v.canSplit(docs[0], pos, depth),
        u.canSplit(docs[1], pos, depth),
        "split " + pos + "/" + depth,
      );
    const isInvalidEmptyJoin = (at) => {
      const p = docs[1].resolve(at);
      return (
        p.nodeBefore?.type.name === "quote" &&
        p.nodeAfter?.type.name === "paragraph" &&
        p.nodeAfter.content.size === 0
      );
    };
    if (isInvalidEmptyJoin(pos)) {
      assert.equal(u.canJoin(docs[1], pos), true);
      assert.throws(() => new u.Transform(docs[1]).join(pos), /Cannot join/);
      assert.equal(v.canJoin(docs[0], pos), false);
    } else
      assert.equal(
        v.canJoin(docs[0], pos),
        u.canJoin(docs[1], pos),
        "join " + pos,
      );
    for (const dir of [-1, 1]) {
      const expected = u.joinPoint(docs[1], pos, dir),
        actual = v.joinPoint(docs[0], pos, dir);
      if (expected !== undefined && isInvalidEmptyJoin(expected)) {
        assert.throws(
          () => new u.Transform(docs[1]).join(expected),
          /Cannot join/,
        );
        assert.equal(actual, undefined);
      } else assert.equal(actual, expected, "join point " + pos);
    }
    for (const name of ["paragraph", "heading", "quote", "text"])
      assert.equal(
        v.insertPoint(docs[0], pos, schemas[0].nodes[name]),
        u.insertPoint(docs[1], pos, schemas[1].nodes[name]),
        "insert " + pos + "/" + name,
      );
    for (const inline of [true, false]) {
      const points = libs.map((lib, j) => {
        const s = schemas[j],
          m = models[j],
          node = inline
            ? s.text("x")
            : s.node("quote", null, s.node("paragraph"));
        return lib.dropPoint(
          docs[j],
          pos,
          new m.Slice(m.Fragment.from(node), 0, 0),
        );
      });
      assert.equal(points[0], points[1], "drop " + pos + "/" + inline);
    }
  }
});
