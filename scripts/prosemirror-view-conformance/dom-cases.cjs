"use strict";
const { schema } = require("./schema.cjs");
const V = require("prosemirror-view"),
  S = require("prosemirror-state");
const { ReadOnlyRenderer } = require("vpm-readonly");
const text = (value, marks = []) => ({
  type: "text",
  text: value,
  marks: marks.map((m) => (typeof m === "string" ? { type: m } : m)),
});
const p = (value, attrs) => ({
  type: "paragraph",
  attrs,
  content: value ? [typeof value === "string" ? text(value) : value] : [],
});
const doc = (content) => ({ type: "doc", content });
const image =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="skyblue"/></svg>',
  );
const all = doc([
  {
    type: "heading",
    attrs: { level: 2, textAlign: "center" },
    content: [text("Read-only document")],
  },
  p("Plain paragraph"),
  {
    type: "paragraph",
    content: [
      text("Bold ", ["bold"]),
      text("both", ["bold", "italic"]),
      text(" underline ", ["underline"]),
      text("marked", [{ type: "highlight", attrs: { color: "#ffcc00" } }]),
      text(" x"),
      text("2", ["superscript"]),
      text(" and H"),
      text("2", ["subscript"]),
      text("O "),
      text("link", [
        {
          type: "link",
          attrs: {
            href: "https://example.com",
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        },
      ]),
    ],
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [
          p("First bullet"),
          {
            type: "orderedList",
            attrs: { start: 3 },
            content: [{ type: "listItem", content: [p("Nested number")] }],
          },
        ],
      },
    ],
  },
  {
    type: "taskList",
    content: [
      {
        type: "taskItem",
        attrs: { checked: true },
        content: [
          p("Completed"),
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [p("Nested task")],
              },
            ],
          },
        ],
      },
      {
        type: "taskItem",
        attrs: { checked: false },
        content: [p("Open task")],
      },
    ],
  },
  { type: "blockquote", content: [p("Quoted")] },
  {
    type: "codeBlock",
    attrs: { language: "js" },
    content: [text("const answer = 42;\n")],
  },
  { type: "horizontalRule" },
  { type: "paragraph", content: [text("Before break"), { type: "hardBreak" }] },
  p(""),
  {
    type: "image",
    attrs: { src: image, alt: "Blue rectangle", title: "Fixture" },
  },
]);
function check(ok, message) {
  if (!ok) throw Error(message);
}
function equal(a, b, name) {
  const visit = (x, y, path) => {
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (x && y && typeof x === "object" && typeof y === "object") {
      for (const key of new Set([...Object.keys(x), ...Object.keys(y)]))
        visit(x[key], y[key], path + "." + key);
    } else
      throw Error(
        name +
          " " +
          path +
          " upstream=" +
          JSON.stringify(x) +
          " VPM=" +
          JSON.stringify(y),
      );
  };
  visit(a, b, "snapshot");
}
function snapshot(dom) {
  if (dom.nodeType === 3) return dom.nodeValue;
  if (dom.nodeType !== 1) return null;
  const attrs = Object.fromEntries(
    [...dom.attributes]
      .filter((a) => !(dom.tagName === "INPUT" && a.name === "disabled"))
      .map((a) => [a.name, a.value])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
  return {
    tag: dom.tagName.toLowerCase(),
    attrs,
    children: [...dom.childNodes].map(snapshot),
  };
}
module.exports = function setup(name) {
  function create(json, decorations, owner = document) {
    const host = owner.createElement("section");
    owner.body.appendChild(host);
    let model = schema.nodeFromJSON(json),
      set = decorations ? decorations(model) : V.DecorationSet.empty;
    const view =
      name === "vpm"
        ? new ReadOnlyRenderer(host, { doc: model, decorations: set })
        : new V.EditorView(host, {
            state: S.EditorState.create({ doc: model }),
            editable: () => false,
            decorations: () => set,
          });
    return {
      view,
      host,
      get doc() {
        return model;
      },
      get set() {
        return set;
      },
      update(next, nextSet = set) {
        model = next;
        set = nextSet;
        if (name === "vpm") view.update(next, set);
        else view.updateState(S.EditorState.create({ doc: next }));
      },
      snapshot() {
        return [...view.dom.childNodes].map(snapshot);
      },
      destroy() {
        view.destroy();
        host.remove();
      },
    };
  }
  const D = V.Decoration;
  function set(doc, items) {
    return V.DecorationSet.create(doc, items);
  }
  const cases = [
    ["documentation schema", all],
    [
      "code and strike marks",
      doc([
        {
          type: "paragraph",
          content: [text("code", ["code"]), text(" removed", ["strike"])],
        },
      ]),
    ],
    [
      "inline attributes",
      doc([p("abcdef")]),
      (d) =>
        set(d, [
          D.inline(2, 5, {
            class: "hl",
            style: "color: red",
            "data-test": "inline",
          }),
        ]),
    ],
    [
      "inline overlaps",
      doc([p("abcdefgh")]),
      (d) =>
        set(d, [
          D.inline(1, 6, { class: "one" }),
          D.inline(3, 8, { class: "two" }),
        ]),
    ],
    [
      "inline custom tag",
      doc([p("abcdef")]),
      (d) => set(d, [D.inline(2, 5, { nodeName: "em", class: "hl" })]),
    ],
    [
      "multiple inline custom tags",
      doc([p("abcdef")]),
      (d) =>
        set(d, [
          D.inline(2, 5, { nodeName: "em", class: "one" }),
          D.inline(2, 5, { nodeName: "strong", class: "two" }),
        ]),
    ],
    [
      "marked decoration",
      doc([
        {
          type: "paragraph",
          content: [text("abc", ["bold"]), text("def", ["bold", "italic"])],
        },
      ]),
      (d) => set(d, [D.inline(2, 6, { class: "selected" })]),
    ],
    [
      "decorated break",
      doc([
        {
          type: "paragraph",
          content: [text("a"), { type: "hardBreak" }, text("b")],
        },
      ]),
      (d) => set(d, [D.inline(2, 3, { class: "line" })]),
    ],
    [
      "node attributes",
      doc([p("abcdef", { textAlign: "right" })]),
      (d) =>
        set(d, [
          D.node(0, 8, {
            class: "box",
            style: "color: red",
            "data-test": "node",
          }),
        ]),
    ],
    [
      "node wrapper",
      doc([p("abcdef")]),
      (d) => set(d, [D.node(0, 8, { nodeName: "section", class: "box" })]),
    ],
    [
      "node and inline composition",
      doc([p("abcdef")]),
      (d) =>
        set(d, [
          D.node(0, 8, { class: "box" }),
          D.inline(1, 4, { class: "selected" }),
        ]),
    ],
    [
      "inline span across paragraphs",
      doc([p("first"), p("second")]),
      (d) => set(d, [D.inline(2, 12, { class: "selected" })]),
    ],
    [
      "widgets and marks",
      doc([
        {
          type: "paragraph",
          content: [text("abc", ["bold"]), text("def", ["italic"])],
        },
      ]),
      (d) =>
        set(
          d,
          [-1, 1].map((side) =>
            D.widget(
              4,
              () => {
                const b = document.createElement("button");
                b.textContent = String(side);
                return b;
              },
              { side, key: String(side) },
            ),
          ),
        ),
    ],
    [
      "text widgets",
      doc([p("abc")]),
      (d) => set(d, [D.widget(2, () => document.createTextNode("|"))]),
    ],
  ];
  function baseline() {
    const values = [];
    for (const [label, json, dec] of cases) {
      const x = create(json, dec);
      check(!x.view.dom.isContentEditable, label + " editable");
      values.push({ label, dom: x.snapshot() });
      x.destroy();
    }
    return values;
  }
  function identity() {
    const x = create(doc([p("First"), p("Second"), p("Third")]));
    const second = x.view.dom.children[1],
      third = x.view.dom.children[2];
    const nodes = [];
    x.doc.forEach((n) => nodes.push(n));
    const edited = x.doc.copy(
      x.doc.content.replaceChild(
        0,
        schema.node("paragraph", null, schema.text("First changed")),
      ),
    );
    x.update(edited);
    check(
      x.view.dom.children[1] === second && x.view.dom.children[2] === third,
      "unaffected sibling replaced by edit",
    );
    x.update(x.doc, set(x.doc, [D.inline(2, 5, { class: "selected" })]));
    check(
      x.view.dom.children[1] === second,
      "unaffected sibling replaced by decoration",
    );
    x.update(
      x.doc.copy(
        x.doc.content.addToStart(
          schema.node("paragraph", null, schema.text("Inserted")),
        ),
      ),
      V.DecorationSet.empty,
    );
    check(
      x.view.dom.children[2] === second && x.view.dom.children[3] === third,
      "insertion replaced unaffected sibling",
    );
    const stable = x.view.dom.innerHTML,
      identity = x.view.dom.children[2];
    x.update(x.doc);
    check(
      x.view.dom.innerHTML === stable && x.view.dom.children[2] === identity,
      "noop changed DOM",
    );
    x.destroy();
    return true;
  }
  function widgets() {
    let created = 0,
      destroyed = 0,
      getPos;
    const factory = (_host, get) => {
      created++;
      getPos = get;
      const b = document.createElement("button");
      b.textContent = "widget";
      return b;
    };
    const spec = { key: "persistent", destroy: () => destroyed++ };
    const x = create(doc([p("First"), p("Second")]), (d) =>
      set(d, [D.widget(9, factory, spec)]),
    );
    const widget = x.view.dom.querySelector("button");
    widget.focus();
    check(document.activeElement === widget, "widget focus");
    const next = x.doc.copy(
      x.doc.content.replaceChild(
        0,
        schema.node("paragraph", null, schema.text("First changed")),
      ),
    );
    x.update(next, set(next, [D.widget(17, factory, spec)]));
    check(
      x.view.dom.querySelector("button") === widget,
      "widget was recreated after sibling edit",
    );
    check(created === 1, "factory called again");
    check(getPos() === 17, "stale widget position");
    check(document.activeElement === widget, "unaffected widget lost focus");
    x.update(next, V.DecorationSet.empty);
    check(destroyed === 1, "missing widget cleanup");
    check(getPos() === undefined, "removed widget has position");
    x.destroy();
    check(destroyed === 1, "duplicate widget cleanup");
    return true;
  }
  function updates() {
    const x = create(
      doc([
        p("abcdef"),
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [p("Retained list")] }],
        },
        { type: "image", attrs: { src: image, alt: "retained" } },
      ]),
    );
    const list = x.view.dom.querySelector("ul"),
      picture = x.view.dom.querySelector("img"),
      snapshots = [];
    for (let i = 0; i < 120; i++) {
      const marks = i % 3 ? [schema.marks.bold.create()] : [];
      const first = schema.node(
        "paragraph",
        { textAlign: i % 2 ? "right" : null },
        [schema.text("abc", marks), schema.text("def")],
      );
      const next = x.doc.copy(x.doc.content.replaceChild(0, first));
      const dec = [D.inline(2, 5, { class: i % 2 ? "red" : "blue" })];
      if (i % 4 === 0)
        dec.push(D.node(0, 8, { nodeName: "section", class: "frame" }));
      else if (i % 4 === 1) dec.push(D.node(0, 8, { "data-state": String(i) }));
      x.update(next, set(next, dec));
      check(
        x.view.dom.querySelector("ul") === list &&
          x.view.dom.querySelector("img") === picture,
        "unaffected document nodes replaced during updates",
      );
      snapshots.push(x.snapshot());
    }
    x.destroy();
    return snapshots;
  }

  function iframe() {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const owner = frame.contentDocument;
    const x = create(doc([p(text("foreign", ["bold"]))]), undefined, owner);
    check(
      x.view.dom.ownerDocument === owner &&
        x.view.dom.querySelector("strong").ownerDocument === owner,
      "wrong owner document",
    );
    for (let pos = 0; pos <= x.doc.content.size; pos++) {
      const point = x.view.domAtPos(pos, 1);
      check(
        point.node.ownerDocument === owner,
        "position lookup owner document",
      );
      check(
        x.view.posAtDOM(point.node, point.offset) === pos,
        "iframe position round trip",
      );
    }
    x.destroy();
    frame.remove();
    return true;
  }
  return {
    create,
    baseline,
    identity,
    widgets,
    iframe,
    updates,
    positions() {
      return require("./position-cases.cjs")({ create, cases, D, set, schema });
    },
    runComparisons(variants) {
      const snapshots = variants.upstream.baseline();
      const app = variants.app.baseline(),
        vpm = variants.vpm.baseline();
      for (let i = 0; i < snapshots.length; i++) {
        equal(snapshots[i], app[i], "app/current " + snapshots[i].label);
        equal(snapshots[i], vpm[i], "current/VPM " + snapshots[i].label);
      }
      const lookups = variants.upstream.positions();
      equal(lookups, variants.app.positions(), "app position lookup");
      equal(lookups, variants.vpm.positions(), "VPM position lookup");
      const edits = variants.upstream.updates();
      equal(edits, variants.app.updates(), "app update sequence");
      equal(edits, variants.vpm.updates(), "VPM update sequence");
      for (const v of Object.values(variants)) {
        v.identity();
        v.widgets();
        v.iframe();
      }
      const previews = document.createElement("main");
      previews.id = "previews";
      document.body.appendChild(previews);
      for (const [label, v] of Object.entries(variants)) {
        const preview = v.create(all);
        preview.host.dataset.variant = label;
        const title = document.createElement("h3");
        title.textContent = label;
        preview.host.prepend(title);
        previews.appendChild(preview.host);
      }
      return {
        variants: 3,
        snapshots: snapshots.length,
        updates: 120,
        positionFixtures: lookups.length,
        identity: true,
        widgets: true,
        iframe: true,
        taskCheckboxesDisabled: [
          ...previews.querySelectorAll("[data-variant=vpm] input"),
        ].every((i) => i.disabled),
      };
    },
  };
};
