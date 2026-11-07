// Independently expressed public position-lookup contracts. Current/app controls
// supply the expected DOM boundaries; no upstream implementation is copied.
module.exports = function positions({ create, cases, D, set, schema }) {
  const path = (root, node) => {
    if (!node) return null;
    const parts = [];
    for (; node !== root; node = node.parentNode) {
      if (!node?.parentNode)
        throw Error("Position lookup returned detached DOM");
      parts.unshift([...node.parentNode.childNodes].indexOf(node));
    }
    return parts;
  };
  const scan = (x) => {
    const { view, doc } = x,
      forward = [],
      reverse = [],
      nodes = [];
    for (let pos = 0; pos <= doc.content.size; pos++) {
      nodes.push(path(view.dom, view.nodeDOM(pos)));
      for (const side of [-1, 0, 1]) {
        const found = view.domAtPos(pos, side);
        const roundTrip = view.posAtDOM(found.node, found.offset);
        if (roundTrip !== pos)
          throw Error(`Round trip ${pos}/${side} became ${roundTrip}`);
        forward.push([pos, side, path(view.dom, found.node), found.offset]);
      }
    }
    const walk = (node) => {
      const length =
        node.nodeType === 3 ? node.nodeValue.length : node.childNodes.length;
      for (let offset = 0; offset <= length; offset++)
        reverse.push([
          path(view.dom, node),
          offset,
          ...[-1, 0, 1].map((bias) => view.posAtDOM(node, offset, bias)),
        ]);
      for (const child of node.childNodes) walk(child);
    };
    walk(view.dom);
    return { forward, reverse, nodes };
  };
  const p = (content) => ({ type: "paragraph", content });
  const t = (text, marks) => ({
    type: "text",
    text,
    marks: marks?.map((type) => ({ type })),
  });
  const json = {
    type: "doc",
    content: [
      p([
        t("a😀e\u0301", ["bold"]),
        t("中👩‍💻z", ["italic"]),
        { type: "hardBreak" },
        t("tail"),
      ]),
      p([]),
    ],
  };
  const fixtures = [...cases, ["UTF-16 and grapheme boundaries", json]];
  for (const sides of [[-1], [0], [1], [-1, 1], [-2, -1, 0, 1, 2]]) {
    fixtures.push([
      "widget affinity " + sides,
      json,
      (d) =>
        set(
          d,
          sides.flatMap((side) =>
            [1, 4, 6, d.content.size].map((pos) =>
              D.widget(
                pos,
                () => {
                  const b = document.createElement("button");
                  b.innerHTML = "<span>widget</span>";
                  return b;
                },
                { side, key: pos + ":" + side },
              ),
            ),
          ),
        ),
    ]);
  }
  fixtures.push([
    "widget marks and overlapping text wrappers",
    json,
    (d) =>
      set(d, [
        D.inline(2, 8, { nodeName: "span", class: "one" }),
        D.inline(4, 9, { nodeName: "i", class: "two" }),
        D.widget(6, () => document.createTextNode("|"), {
          side: -1,
          marks: [],
        }),
        D.widget(6, () => document.createTextNode("+"), {
          side: 1,
          marks: [schema.marks.underline.create()],
        }),
      ]),
  ]);
  const snapshots = [];
  for (const [label, document, decos] of fixtures) {
    const x = create(document, decos);
    try {
      snapshots.push({ label, dom: x.snapshot(), ...scan(x) });
    } finally {
      x.destroy();
    }
  }
  const x = create({
    type: "doc",
    content: [p([t("First")]), p([t("stable😀", ["bold"])])],
  });
  try {
    const stableNode = x.view.dom.lastChild;
    const updates = [];
    for (let i = 0; i < 24; i++) {
      const first = schema.node(
        "paragraph",
        null,
        schema.text(
          "Edit " + "😀".repeat((i % 4) + 1),
          i % 2 ? [schema.marks.italic.create()] : [],
        ),
      );
      const next = x.doc.copy(x.doc.content.replaceChild(0, first));
      const decorations = [
        D.inline(2, 4, { nodeName: i % 2 ? "i" : "span", class: "active" }),
        D.widget(first.nodeSize + 3, () => document.createTextNode("|"), {
          key: "same",
          side: i % 2 ? -1 : 1,
        }),
      ];
      if (i % 3)
        decorations.push(D.node(0, first.nodeSize, { nodeName: "section" }));
      x.update(next, set(next, decorations));
      if (x.view.dom.lastChild !== stableNode)
        throw Error("Position update replaced stable paragraph");
      updates.push(scan(x));
    }
    snapshots.push({
      label: "24 updates with retained nodes and shifted widgets",
      updates,
    });
  } finally {
    x.destroy();
  }
  return snapshots;
};
