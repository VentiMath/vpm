"use strict";
const { Editor } = require("@tiptap/core"),
  StarterKit = require("@tiptap/starter-kit").default,
  TaskList = require("@tiptap/extension-task-list").default,
  TaskItem = require("@tiptap/extension-task-item").default;
function create(content) {
  const element = document.createElement("div");
  document.body.append(element);
  return new Editor({
    element,
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
    content,
  });
}
function point(e, text, offset = 0) {
  let at;
  e.state.doc.descendants((n, p) => {
    if (n.isText && n.text === text) at = p + offset;
  });
  if (at == null) throw Error("Missing " + text);
  return at;
}
function snap(e) {
  return {
    doc: e.getJSON(),
    html: e.getHTML(),
    selection: e.state.selection.toJSON(),
    text: e.state.doc.textContent,
  };
}
module.exports = function setup(name) {
  const editor = create(
      "<ul><li><p>alpha</p></li><li><p>beta</p></li><li><p>gamma</p></li></ul>",
    ),
    events = [];
  editor.view.dom.dataset.variant = name;
  editor.view.dom.addEventListener("keydown", (e) =>
    events.push({
      key: e.key,
      trusted: e.isTrusted,
      prevented: e.defaultPrevented,
    }),
  );
  return {
    prepare() {
      editor.commands.setTextSelection(point(editor, "beta", 4));
      editor.view.focus();
      events.length = 0;
    },
    snapshot() {
      return { ...snap(editor), events: events.slice() };
    },
    exercise() {
      const e = create("<p>alpha</p><p>beta</p><p>gamma</p>"),
        out = [];
      const record = () => out.push(snap(e)),
        run = (name, ...args) => {
          if (!e.commands[name](...args)) throw Error("Command failed " + name);
          record();
        };
      try {
        e.commands.selectAll();
        run("toggleBulletList");
        e.commands.setTextSelection(point(e, "beta", 2));
        run("sinkListItem", "listItem");
        run("liftListItem", "listItem");
        run("splitListItem", "listItem");
        e.commands.selectAll();
        run("toggleOrderedList");
        e.commands.setTextSelection(point(e, "gamma", 1));
        run("liftListItem", "listItem");
        e.commands.setContent({
          type: "doc",
          content: [
            {
              type: "taskList",
              content: ["first", "second"].map((text) => ({
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  { type: "paragraph", content: [{ type: "text", text }] },
                ],
              })),
            },
          ],
        });
        record();
        e.commands.setTextSelection(point(e, "second", 3));
        run("sinkListItem", "taskItem");
        run("liftListItem", "taskItem");
        run("splitListItem", "taskItem");
        run("updateAttributes", "taskItem", { checked: true });
        run("undo");
        const input = require("./transform-followup.json");
        const names = {
          bullet_list: "bulletList",
          ordered_list: "orderedList",
          list_item: "listItem",
        };
        const convert = (node) => ({
          ...node,
          type: names[node.type] || node.type,
          ...(node.type === "ordered_list"
            ? { attrs: { start: node.attrs.order } }
            : {}),
          ...(node.content ? { content: node.content.map(convert) } : {}),
        });
        e.commands.setContent(convert(input.doc));
        e.commands.setTextSelection({
          from: input.selection[0],
          to: input.selection[1],
        });
        run("insertContent", "x");
        if (e.state.selection.anchor !== 6 || e.state.selection.head !== 6)
          throw Error("Cross-list cursor moved past inserted text");
        const deletion = require("./deletion-followup.json");
        const from = Math.min(...deletion.selection),
          to = Math.max(...deletion.selection);
        e.commands.setContent(convert(deletion.doc));
        e.commands.setTextSelection({ from, to });
        run("deleteSelection");
        if (name === "app") {
          // Transform 1.11.0 is an explicit older control for this 1.12.5 behavior.
          const expected = {
            type: "doc",
            content: [
              {
                type: "bulletList",
                content: [
                  { type: "listItem", content: [{ type: "paragraph" }] },
                ],
              },
              convert(deletion.doc.content[2]),
            ],
          };
          if (
            JSON.stringify(e.getJSON()) !== JSON.stringify(expected) ||
            e.getHTML() !==
              "<ul><li><p></p></li></ul><ul><li><p>a</p></li></ul>" ||
            e.state.selection.anchor !== 3 ||
            e.state.selection.head !== 3
          )
            throw Error(
              "Unexpected change in the transform 1.11.0 deletion control",
            );
        } else if (
          e.state.selection.anchor !== 1 ||
          e.state.selection.head !== 1
        ) {
          throw Error(
            "Cross-list deletion did not retain the empty paragraph cursor",
          );
        }
        const nested = require("./nested-fitting-followup.json");
        e.commands.setContent(convert(nested.doc));
        e.commands.setTextSelection({
          from: nested.selection[0],
          to: nested.selection[1],
        });
        run("deleteSelection");
        if (e.state.selection.anchor !== 5 || e.state.selection.head !== 5)
          throw Error("Nested suffix deletion moved its cursor");
        for (const input of [
          require("./cursor-followup.json"),
          require("./nested-insertion-followup.json"),
        ]) {
          e.commands.setContent(convert(input.doc));
          e.commands.setTextSelection({
            from: input.selection[0],
            to: input.selection[1],
          });
          if (input.operation === "deleteSelection") run("deleteSelection");
          else run("insertContent", "x");
          if (e.state.selection.anchor !== 5 || e.state.selection.head !== 5)
            throw Error("Preserved text tail lost its cursor anchor");
        }
        const structural = require("./structure-followup.json");
        e.commands.setContent(convert(structural.doc));
        e.commands.setTextSelection({
          from: structural.selection[0],
          to: structural.selection[1],
        });
        run("deleteSelection");
        if (e.state.selection.anchor !== 9 || e.state.selection.head !== 9)
          throw Error("Cross-depth deletion lost its cursor");
        return out;
      } finally {
        const host = e.options.element;
        e.destroy();
        host.remove();
      }
    },
  };
};
