"use strict";
const assert = require("node:assert/strict"),
  { test } = require("node:test"),
  path = require("node:path");
const base = path.resolve(
  __dirname,
  "../../../scripts/prosemirror-view-conformance/node_modules/.vpm-view",
);
const A = Object.fromEntries(
  ["upstream", "app", "vpm"].map((name) => [
    name,
    require(path.join(base, name + "-api.cjs")),
  ]),
);
const spec = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    blockquote: { group: "block", content: "block+" },
    text: { group: "inline" },
    atom: { group: "inline", inline: true, atom: true },
  },
};
const schema = (api) => new api.M.Schema(spec);
const json = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "abc🙂def" }] },
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "second" }] },
        { type: "paragraph", content: [{ type: "text", text: "third" }] },
      ],
    },
  ],
};
const widget = () => {};
function make(api, d) {
  const { kind, from, to, id, ...options } = d;
  return kind === "widget"
    ? api.D.Decoration.widget(from, widget, { ...options, id })
    : api.D.Decoration[kind](from, to, { class: "c" + id }, { ...options, id });
}
function snapshot(set) {
  return set
    .find()
    .map((d) => ({ from: d.from, to: d.to, spec: d.spec }))
    .sort((a, b) => a.spec.id - b.spec.id || a.from - b.from || a.to - b.to);
}
function projection(set, doc) {
  const layers = [];
  set.forEachSet((s) => layers.push(snapshot(s)));
  const r = {
    local: set.locals(doc).map((d) => [d.from, d.to, d.spec.id]),
    layers,
    children: [],
  };
  doc.forEach((child, pos) => {
    if (!child.isLeaf)
      r.children.push(projection(set.forChild(pos, child), child));
  });
  return r;
}
function compare(results) {
  for (const name of ["app", "vpm"])
    assert.deepEqual(results[name], results.upstream, name);
}

test("descriptors, equivalent removal and inclusive edge mapping", () => {
  const results = {};
  for (const [name, api] of Object.entries(A)) {
    const s = schema(api),
      doc = s.nodeFromJSON(json),
      out = [];
    for (const inclusiveStart of [false, true])
      for (const inclusiveEnd of [false, true]) {
        const input = [
          {
            kind: "inline",
            from: 2,
            to: 5,
            id: 1,
            inclusiveStart,
            inclusiveEnd,
          },
          { kind: "widget", from: 2, id: 2, side: -1 },
          { kind: "widget", from: 2, id: 3, side: 1 },
          { kind: "node", from: 0, to: doc.firstChild.nodeSize, id: 4 },
        ];
        let set = api.D.DecorationSet.create(
          doc,
          input.map((d) => make(api, d)),
        );
        const before = snapshot(set),
          tr = new api.T.Transform(doc)
            .insert(2, s.text("X"))
            .insert(6, s.text("Y"));
        out.push(
          snapshot(set.map(tr.mapping, tr.doc)),
          snapshot(set.remove([make(api, input[0])])),
        );
        assert.deepEqual(snapshot(set), before);
      }
    results[name] = out;
  }
  compare(results);
});

test("child projection, overlapping ranges, leaves and find predicates", () => {
  const results = {};
  for (const [name, api] of Object.entries(A)) {
    const s = schema(api),
      doc = s.nodeFromJSON(json),
      items = [
        { kind: "inline", from: 0, to: doc.content.size, id: 0 },
        { kind: "inline", from: 2, to: 6, id: 1 },
        { kind: "widget", from: 3, id: 2 },
        { kind: "inline", from: 4, to: 7, id: 3 },
        { kind: "node", from: 0, to: doc.firstChild.nodeSize, id: 4 },
      ];
    const set = api.D.DecorationSet.create(
      doc,
      items.map((d) => make(api, d)),
    );
    results[name] = {
      projection: projection(set, doc),
      find: set
        .find(3, 5, (s) => s.id % 2 === 0)
        .map((d) => [d.from, d.to, d.spec.id]),
      leaf: set.forChild(0, s.text("x")).find(),
    };
  }
  compare(results);
});

test("mapping drops invalid node ranges and invokes onRemove once per removed descriptor", () => {
  const results = {};
  for (const [name, api] of Object.entries(A)) {
    const s = schema(api),
      doc = s.nodeFromJSON(json),
      items = [
        { kind: "inline", from: 2, to: 3, id: 0 },
        { kind: "widget", from: 3, id: 1 },
        { kind: "node", from: 0, to: doc.firstChild.nodeSize, id: 2 },
      ];
    const set = api.D.DecorationSet.create(
        doc,
        items.map((d) => make(api, d)),
      ),
      removed = [],
      tr = new api.T.Transform(doc).delete(1, 4);
    const next = set.map(tr.mapping, tr.doc, {
      onRemove: (s) => removed.push(s.id),
    });
    results[name] = { remaining: snapshot(next), removed: removed.sort() };
    assert.equal(new Set(removed).size, removed.length);
  }
  compare(results);
});

test("persistent updates detach arrays and retain unaffected branches", () => {
  const api = A.vpm,
    s = schema(api),
    doc = s.nodeFromJSON(json),
    input = [
      make(api, { kind: "inline", from: 2, to: 3, id: 1 }),
      make(api, { kind: "inline", from: 13, to: 14, id: 2 }),
    ];
  const set = api.D.DecorationSet.create(doc, input),
    before = snapshot(set);
  input.length = 0;
  assert.deepEqual(snapshot(set), before);
  const added = [make(api, { kind: "widget", from: 4, id: 3 })],
    next = set.add(doc, added);
  assert.equal(added.length, 1);
  added.length = 0;
  assert.equal(next.find().length, 3);
  assert.deepEqual(snapshot(set), before);
  assert.equal(set.add(doc, []), set);
  assert.equal(set.remove([]), set);
  assert.equal(
    set.remove([make(api, { kind: "widget", from: 0, id: 9 })]),
    set,
  );
  assert.equal(set.map(new api.T.Mapping(), doc), set);
  const tr = new api.T.Transform(doc).insert(2, s.text("z")),
    mapped = set.map(tr.mapping, tr.doc);
  assert.equal(set.children[5], mapped.children[5]);
  const all = [];
  set.forEachSet((s) => all.push(s));
  assert.deepEqual(all, [set]);
});

test("widget keys, attributes and specs participate in equivalence", () => {
  for (const api of Object.values(A)) {
    const D = api.D.Decoration;
    assert(
      D.widget(1, () => {}, { key: "x" }).eq(
        D.widget(1, () => {}, { key: "x", side: -1 }),
      ),
    );
    assert(!D.widget(1, () => {}).eq(D.widget(1, () => {})));
    assert(
      D.inline(1, 2, { class: "a" }, { id: 1 }).eq(
        D.inline(1, 2, { class: "a" }, { id: 1 }),
      ),
    );
    assert(
      !D.inline(1, 2, { class: "a" }, { id: 1 }).eq(
        D.inline(1, 2, { class: "b" }, { id: 1 }),
      ),
    );
    assert(!D.inline(1, 2, {}, { id: 1 }).eq(D.inline(1, 2, {}, { id: 2 })));
  }
});

test("2000 seeded supplied-mapping cases agree across current, app and VPM", () => {
  let seed = 713,
    random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };
  const schemas = Object.fromEntries(
    Object.entries(A).map(([n, a]) => [n, schema(a)]),
  );
  for (let iteration = 0; iteration < 2000; iteration++) {
    const docs = Object.fromEntries(
      Object.entries(schemas).map(([n, s]) => [n, s.nodeFromJSON(json)]),
    );
    const items = [];
    for (let i = 0; i < 24; i++) {
      const from = random() % (docs.upstream.content.size + 1),
        to = from + (random() % (docs.upstream.content.size - from + 1)),
        kind = ["inline", "widget", "node"][random() % 3];
      items.push({
        kind,
        from,
        to,
        id: i,
        side: (random() % 3) - 1,
        inclusiveStart: !!(random() % 2),
        inclusiveEnd: !!(random() % 2),
      });
    }
    const from = 1 + (random() % 7),
      to = Math.min(8, from + (random() % 3)),
      tr = new A.upstream.T.Transform(docs.upstream).replaceWith(
        from,
        to,
        schemas.upstream.text(iteration % 2 ? "X" : "🙂"),
      );
    const results = {};
    for (const [name, api] of Object.entries(A)) {
      const set = api.D.DecorationSet.create(
          docs[name],
          items.map((d) => make(api, d)),
        ),
        before = snapshot(set),
        removed = [];
      const mapped = set.map(
        tr.mapping,
        schemas[name].nodeFromJSON(tr.doc.toJSON()),
        { onRemove: (s) => removed.push(s.id) },
      );
      const extra = make(api, { kind: "widget", from: 1, id: 30 });
      const changed = mapped
        .add(schemas[name].nodeFromJSON(tr.doc.toJSON()), [extra])
        .remove([extra]);
      assert.deepEqual(snapshot(set), before);
      results[name] = {
        decorations: snapshot(changed),
        removed: removed.sort((a, b) => a - b),
      };
    }
    compare(results);
  }
});

test("identical document identity does not hide a custom interior mapping", () => {
  const results = {};
  for (const [name, api] of Object.entries(A)) {
    const doc = schema(api).nodeFromJSON(json);
    const input = [
      make(api, { kind: "widget", from: 3, id: 1 }),
      make(api, { kind: "inline", from: 2, to: 5, id: 2 }),
    ];
    const mapping = new api.T.Mapping([new api.T.StepMap([2, 2, 2])]);
    const removed = [];
    const mapped = api.D.DecorationSet.create(doc, input).map(mapping, doc, {
      onRemove: (s) => removed.push(s.id),
    });
    results[name] = { decorations: snapshot(mapped), removed };
  }
  compare(results);
});

test("cached child boundaries follow immutable edits and preserve removal snapshots", () => {
  const results = {};
  for (const [name, api] of Object.entries(A)) {
    const s = schema(api),
      doc = s.nodeFromJSON(json);
    const items = [
      make(api, { kind: "widget", from: 1, id: 1 }),
      make(api, { kind: "inline", from: 2, to: 5, id: 2 }),
    ];
    const set = api.D.DecorationSet.create(doc, items.slice());
    const before = snapshot(set);
    api.D.DecorationSet.create(doc, items.slice());
    const tr = new api.T.Transform(doc).insert(2, s.text("longer"));
    const mapped = set.map(tr.mapping, tr.doc);
    const one = mapped.find().find((d) => d.spec.id === 2);
    const removed = mapped.remove([one]);
    assert.deepEqual(snapshot(set), before);
    assert.equal(mapped.find().length, 2);
    assert.equal(removed.find().length, 1);
    assert.deepEqual(snapshot(removed.remove([one])), snapshot(removed));
    if (name === "vpm") assert.equal(removed.remove([one]), removed);
    const duplicates = api.D.DecorationSet.create(doc, [
      items[0],
      items[0],
      items[1],
    ]);
    assert.equal(duplicates.remove([items[0]]).find().length, 1);
    results[name] = { mapped: snapshot(mapped), removed: snapshot(removed) };
  }
  compare(results);
});
