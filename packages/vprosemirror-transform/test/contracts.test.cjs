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
test("deleting up to a later list item preserves its paragraph and wrapper", () => {
  for (const tail of ["", "x", "xy"])
    for (const left of ["paragraph", "code_block"])
      for (const nesting of [0, 1, 2]) {
        const results = [model, um].map((m, i) => {
          const schema = new m.Schema({
            nodes: {
              ...spec.nodes,
              code_block: { content: "text*", group: "block", code: true },
              bullet_list: { content: "list_item+", group: "block" },
              list_item: { content: "paragraph block*" },
            },
          });
          const node = (type, ...children) => schema.node(type, null, children);
          let doc = node(
            "bullet_list",
            node("list_item", node("paragraph"), node(left, schema.text("0"))),
            node(
              "list_item",
              node("paragraph", ...(tail ? [schema.text(tail)] : [])),
            ),
          );
          for (let j = 0; j < nesting; j++) doc = node("quote", doc);
          doc = node("doc", doc);
          const tr = new [v, u][i].Transform(doc).deleteRange(
            5 + nesting,
            10 + nesting,
          );
          tr.doc.check();
          assert(tr.steps[0].invert(doc).apply(tr.doc).doc.eq(doc));
          return {
            doc: tr.doc.toJSON(),
            steps: tr.steps.map((step) => step.toJSON()),
          };
        });
        assert.deepEqual(results[0], results[1]);
      }
});
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

test("mixed-depth list text replacement preserves suffix structure, insertion point and undo", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/transform-followup.json");
  for (const left of ["bullet_list", "ordered_list"])
    for (const right of ["bullet_list", "ordered_list"])
      for (const inner of ["bullet_list", "ordered_list"])
        for (const tail of ["", "tail"])
          for (const nested of [false, true])
            for (const text of ["x", "😀"]) {
              const json = structuredClone(input.doc),
                last = json.content.at(-1);
              for (const [node, type] of [
                [json.content[0], left],
                [last, right],
                [last.content[0].content[1], inner],
              ]) {
                node.type = type;
                if (type === "ordered_list") node.attrs = { order: 7 };
                else delete node.attrs;
              }
              last.content[0].content[1].content[0].content[0].content[0].text =
                "x" + tail;
              const value = nested
                ? {
                    type: "doc",
                    content: [{ type: "quote", content: json.content }],
                  }
                : json;
              const results = [model, um].map((m, i) => {
                const schema = new m.Schema({
                  nodes: {
                    ...spec.nodes,
                    bullet_list: { content: "list_item+", group: "block" },
                    ordered_list: {
                      content: "list_item+",
                      group: "block",
                      attrs: { order: { default: 1 } },
                    },
                    list_item: { content: "paragraph block*" },
                  },
                });
                const doc = schema.nodeFromJSON(value),
                  from = 5 + Number(nested),
                  to = 32 + Number(nested);
                const tr = new [v, u][i].Transform(doc).replaceRangeWith(
                  from,
                  to,
                  schema.text(text),
                );
                tr.doc.check();
                let restored = tr.doc;
                for (let j = tr.steps.length - 1; j >= 0; j--)
                  restored = tr.steps[j].invert(tr.docs[j]).apply(restored).doc;
                assert(restored.eq(doc));
                let insertionEnd;
                tr.steps
                  .at(-1)
                  .getMap()
                  .forEach((_a, _b, _c, end) => {
                    insertionEnd ??= end;
                  });
                return { doc: tr.doc.toJSON(), insertionEnd };
              });
              assert.deepEqual(
                results[0],
                results[1],
                JSON.stringify({ left, right, inner, tail, nested, text }),
              );
            }
});

test("deleteRange preserves an unselected empty paragraph after a nested start", () => {
  const input = require("../../../scripts/prosemirror-schema-list-conformance/deletion-followup.json");
  const results = [model, um].map((m, i) => {
    const s = new m.Schema({
      nodes: {
        ...spec.nodes,
        bullet_list: { content: "list_item+", group: "block" },
        list_item: { content: "paragraph block*" },
      },
    });
    const doc = s.nodeFromJSON(input.doc);
    const tr = new [v, u][i].Transform(doc).deleteRange(
      ...[...input.selection].sort((a, b) => a - b),
    );
    tr.doc.check();
    assert.equal(tr.doc.firstChild.type.name, "paragraph");
    assert.equal(tr.doc.firstChild.content.size, 0);
    assert(tr.steps[0].invert(doc).apply(tr.doc).doc.eq(doc));
    return {
      doc: tr.doc.toJSON(),
      steps: tr.steps.map((step) => step.toJSON()),
      boundary: input.selection.map((pos) => tr.mapping.map(pos)),
    };
  });
  assert.deepEqual(results[0], results[1]);
});
