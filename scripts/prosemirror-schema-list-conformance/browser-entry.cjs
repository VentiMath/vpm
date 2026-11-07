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
        return out;
      } finally {
        const host = e.options.element;
        e.destroy();
        host.remove();
      }
    },
  };
};
