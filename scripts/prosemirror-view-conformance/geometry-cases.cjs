// Native-layout observations of the public caret rectangle contract.
module.exports = function geometry({ create, D, set, schema }, probe = false) {
  const t = (text, marks) => ({
    type: "text",
    text,
    marks: marks?.map((type) => ({ type })),
  });
  const p = (content = []) => ({ type: "paragraph", content });
  const doc = (content) => ({ type: "doc", content });
  const image = {
    type: "image",
    attrs: {
      src:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="blue"/></svg>',
        ),
      alt: "fixture",
    },
  };
  const cases = [
    [
      "wrapped text",
      doc([
        p([t("one two three four five six seven eight nine ten 😀 end")]),
        p([t("last")]),
      ]),
    ],
    [
      "marks and wrappers",
      doc([
        p([
          t("one two three ", ["bold"]),
          t("four five six seven eight nine ten ", ["italic"]),
          t("end"),
        ]),
      ]),
      (d) =>
        set(d, [
          D.inline(3, 26, { nodeName: "span", style: "padding:0 2px" }),
          D.node(0, d.firstChild.nodeSize, {
            nodeName: "section",
            style: "border:2px solid;padding:3px",
          }),
        ]),
    ],
    [
      "breaks and empty blocks",
      doc([
        p(),
        p([
          { type: "hardBreak" },
          { type: "hardBreak" },
          t("after"),
          { type: "hardBreak" },
        ]),
        p([t("before"), { type: "hardBreak" }, t("after")]),
        p(),
      ]),
    ],
    [
      "images and rules",
      doc([
        p([t("before")]),
        image,
        { type: "horizontalRule" },
        p([t("after")]),
      ]),
    ],
    [
      "code newlines",
      doc([{ type: "codeBlock", content: [t("first\nsecond\n\nlast\n")] }]),
    ],
    [
      "lists and task content holes",
      doc([
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [p([t("a long list item with several words to wrap")])],
            },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [p([t("a task item with several words to wrap")])],
            },
          ],
        },
      ]),
    ],
    [
      "widgets",
      doc([p([t("before widget and after widget wraps across lines")])]),
      (d) =>
        set(
          d,
          [-1, 1].map((side) =>
            D.widget(
              8,
              () => {
                const b = document.createElement("button");
                b.textContent = "button";
                b.style.cssText = "width:50px;height:32px";
                return b;
              },
              { side, key: String(side) },
            ),
          ),
        ),
    ],
    [
      "mixed direction",
      doc([p([t("abc אבג דהו def")]), p([t("אבג abc דהו")])]),
      (d) =>
        set(d, [
          D.node(d.firstChild.nodeSize, d.content.size, {
            style: "direction:rtl;text-align:right",
          }),
        ]),
    ],
  ];
  const styleText =
    ".geometry .ProseMirror{white-space:pre-wrap;overflow-wrap:break-word}.geometry img.ProseMirror-separator{display:inline!important;border:none!important;margin:0!important}.geometry{font:16px/24px Arial!important;width:190px;position:absolute;left:64px;top:80px;color:#111}.geometry *{box-sizing:border-box}.geometry p{margin:0 0 12px}.geometry pre{font:16px/24px monospace;white-space:pre;margin:0}.geometry img:not(.ProseMirror-separator){display:block;width:80px;height:40px;max-width:none}.geometry hr{margin:8px 0}.geometry ul{margin:0;padding-left:24px}.geometry ul[data-type=taskList]{list-style:none}.geometry li[data-type=taskItem]{display:flex;gap:8px}.geometry li[data-type=taskItem]>div{flex:1;min-width:0}";
  const style = document.createElement("style");
  style.textContent = styleText;
  document.head.appendChild(style);
  const rect = (r) => ({
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
  });
  const rangeRect = (owner, n, from, to) => {
    const r = owner.createRange();
    r.setStart(n, from);
    r.setEnd(n, to);
    return [...r.getClientRects()].map(rect);
  };
  const results = [];
  const scan = (label, x) => {
    const owner = x.view.dom.ownerDocument,
      win = owner.defaultView;
    const observer = new win.MutationObserver(() => {});
    observer.observe(x.view.dom, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    const focus = owner.activeElement;
    const selection = win.getSelection();
    const saved = [
      selection.anchorNode,
      selection.anchorOffset,
      selection.focusNode,
      selection.focusOffset,
    ];
    const rows = [];
    for (let pos = 0; pos <= x.doc.content.size; pos++)
      for (const side of [-1, 0, 1]) {
        const found = x.view.coordsAtPos(pos, side);
        const row = { pos, side, rect: rect(found) };
        if (
          side === 1 &&
          JSON.stringify(rect(x.view.coordsAtPos(pos))) !==
            JSON.stringify(row.rect)
        )
          throw Error("Default geometry side");
        if (probe) {
          const at = x.view.domAtPos(pos, side < 0 ? -1 : 1);
          row.dom = {
            tag: at.node.nodeName,
            offset: at.offset,
            text: at.node.nodeValue,
          };
          if (at.node.nodeType === 3) {
            row.collapsed = rangeRect(owner, at.node, at.offset, at.offset);
            row.before = at.offset
              ? rangeRect(owner, at.node, at.offset - 1, at.offset)
              : [];
            row.after =
              at.offset < at.node.length
                ? rangeRect(owner, at.node, at.offset, at.offset + 1)
                : [];
          }
        }
        rows.push(row);
      }
    const writes = observer.takeRecords();
    observer.disconnect();
    if (writes.length) throw Error("Geometry wrote document DOM: " + label);
    if (
      focus !== owner.activeElement ||
      saved.some(
        (v, i) =>
          v !==
          [
            selection.anchorNode,
            selection.anchorOffset,
            selection.focusNode,
            selection.focusOffset,
          ][i],
      )
    )
      throw Error("Geometry changed focus or selection: " + label);
    results.push({ label, rows });
    return rows;
  };
  const mounted = (json, decos, owner = document) => {
    const x = create(json, decos, owner);
    x.host.classList.add("geometry");
    return x;
  };
  try {
    for (const [label, json, decos] of cases) {
      const x = mounted(json, decos);
      try {
        scan(label, x);
      } finally {
        x.destroy();
      }
    }
    const textDocument = doc(
      Array.from({ length: 5 }, (_, i) =>
        p([
          t(
            "Paragraph " + i + " has many words to wrap around the next line. ",
          ),
        ]),
      ),
    );
    const scrolled = mounted(textDocument);
    try {
      scrolled.host.style.cssText = "height:90px;overflow:auto";
      const before = scan("scroll container before", scrolled);
      scrolled.host.scrollTop = 48;
      if (scrolled.host.scrollTop !== 48)
        throw Error("Scroll fixture did not scroll");
      const after = scan("scroll container after", scrolled);
      if (Math.abs(after[3].rect.top - before[3].rect.top + 48) > 0.05)
        throw Error("Geometry did not follow container scroll");
      scrolled.view.dom.style.whiteSpace = "pre";
      const horizontal = scan("horizontal scroll before", scrolled);
      scrolled.host.scrollLeft = 45;
      if (scrolled.host.scrollLeft !== 45)
        throw Error("Horizontal fixture did not scroll");
      const shifted = scan("horizontal scroll after", scrolled);
      if (Math.abs(shifted[3].rect.left - horizontal[3].rect.left + 45) > 0.05)
        throw Error("Geometry did not follow horizontal scroll");
      scrolled.host.scrollLeft = 0;
      scrolled.view.dom.style.whiteSpace = "";
      const stable = scrolled.view.dom.lastChild;
      scrolled.host.style.width = "125px";
      scan("narrower container without a model update", scrolled);
      const next = scrolled.doc.copy(
        scrolled.doc.content.replaceChild(
          0,
          schema.node(
            "paragraph",
            null,
            schema.text(
              "Changed first paragraph with additional wrapped text",
              [schema.marks.bold.create()],
            ),
          ),
        ),
      );
      scrolled.update(
        next,
        set(next, [
          D.inline(2, 12, { class: "highlight", style: "font-size:20px" }),
        ]),
      );
      if (scrolled.view.dom.lastChild !== stable)
        throw Error("Geometry fixture replaced unchanged node");
      scan("document and decoration update", scrolled);
    } finally {
      scrolled.destroy();
    }
    const oldHeight = document.body.style.minHeight,
      oldX = window.scrollX,
      oldY = window.scrollY;
    const page = mounted(doc([p([t("viewport scrolling text")])]));
    try {
      document.body.style.minHeight = "3000px";
      page.host.style.top = "900px";
      window.scrollTo(0, 0);
      const before = scan("viewport before scroll", page);
      window.scrollTo(0, 240);
      if (window.scrollY !== 240)
        throw Error("Viewport fixture did not scroll");
      const after = scan("viewport after scroll", page);
      if (Math.abs(after[3].rect.top - before[3].rect.top + 240) > 0.05)
        throw Error("Geometry did not follow viewport scroll");
    } finally {
      page.destroy();
      document.body.style.minHeight = oldHeight;
      window.scrollTo(oldX, oldY);
    }
    const frame = document.createElement("iframe");
    frame.style.cssText =
      "position:absolute;left:700px;top:430px;width:400px;height:250px";
    document.body.appendChild(frame);
    try {
      const owner = frame.contentDocument;
      const sheet = owner.createElement("style");
      sheet.textContent = styleText;
      owner.head.appendChild(sheet);
      const x = mounted(textDocument, undefined, owner);
      try {
        const rows = scan("iframe viewport coordinates", x);
        if (
          Math.abs(rows[0].rect.left - 64) > 0.05 ||
          Math.abs(rows[0].rect.top - 80) > 0.05
        )
          throw Error("Iframe coordinates escaped the owner viewport");
        x.host.style.cssText = "height:90px;overflow:auto";
        x.host.scrollTop = 36;
        scan("iframe scrolled container", x);
      } finally {
        x.destroy();
        sheet.remove();
      }
    } finally {
      frame.remove();
    }
    const focused = mounted(
      doc([p([t("focused widget has surrounding text")])]),
      (d) =>
        set(d, [
          D.widget(
            8,
            () => {
              const b = document.createElement("button");
              b.textContent = "focus";
              return b;
            },
            { key: "focused" },
          ),
        ]),
    );
    try {
      focused.view.dom.querySelector("button").focus();
      const point = focused.view.domAtPos(2, 1),
        r = document.createRange();
      r.setStart(point.node, point.offset);
      r.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
      scan("focused widget and existing DOM selection", focused);
    } finally {
      focused.destroy();
    }
    return results;
  } finally {
    style.remove();
  }
};
