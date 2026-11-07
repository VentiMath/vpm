"use strict";
function assert(value) {
  if (!value) throw new Error("Caller contract failed");
}
const { Editor, Extension } = require("@tiptap/core");
const { Plugin } = require("prosemirror-state");
const { Schema, DOMParser, DOMSerializer } = require("prosemirror-model");
const StarterKit = require("@tiptap/starter-kit").default;
const TaskList = require("@tiptap/extension-task-list").default;
const TaskItem = require("@tiptap/extension-task-item").default;
const Image = require("@tiptap/extension-image").default;
const Link = require("@tiptap/extension-link").default;
const Highlight = require("@tiptap/extension-highlight").default;
const Underline = require("@tiptap/extension-underline").default;
const TextAlign = require("@tiptap/extension-text-align").default;
const Subscript = require("@tiptap/extension-subscript").default;
const Superscript = require("@tiptap/extension-superscript").default;
function exercise(document) {
  const trailing = Extension.create({
    name: "trailing",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          appendTransaction(_transactions, _old, state) {
            return state.doc.lastChild?.type.name === "paragraph"
              ? null
              : state.tr.insert(
                  state.doc.content.size,
                  state.schema.nodes.paragraph.create(),
                );
          },
        }),
      ];
    },
  });
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      trailing,
    ],
    content:
      '<h2>Title</h2><p>Hello <strong>world</strong> <a href="https://ventimath.org">link</a></p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Task</p></li></ul><p><sub>i</sub><sup>2</sup><mark data-color="#ffff00" style="background-color:#ffff00">lit</mark></p><img src="https://ventimath.org/image.png" alt="sample"><p>End</p>',
  });
  const snapshots = [],
    save = (label) => {
      editor.state.doc.check();
      snapshots.push({
        label,
        json: editor.getJSON(),
        html: editor.getHTML(),
        selection: editor.state.selection.toJSON(),
      });
    };
  assert(editor.schema instanceof Schema);
  save("parse app extensions");
  editor.commands.setTextSelection(2);
  editor.commands.insertContent("new ");
  save("insert text");
  editor.chain().selectAll().setTextAlign("center").run();
  save("alignment");
  editor.commands.setContent("<p>alpha beta</p><p>gamma</p>");
  editor.commands.setTextSelection({ from: 1, to: 6 });
  editor.commands.toggleBold();
  editor.commands.toggleUnderline();
  save("marks");
  editor.commands.setTextSelection(7);
  editor.commands.splitBlock();
  save("split");
  editor.commands.joinBackward();
  save("join");
  editor.commands.toggleBulletList();
  save("list wrapping");
  editor.commands.toggleOrderedList();
  save("list conversion");
  editor.commands.undo();
  save("undo");
  editor.commands.redo();
  save("redo");
  editor.commands.setContent("<p>one</p><p>two</p><p>three</p>");
  editor.commands.setTextSelection({ from: 2, to: 12 });
  editor.commands.deleteSelection();
  save("cross-block delete");
  editor.commands.insertContent(
    "<blockquote><p>pasted <em>content</em></p></blockquote>",
  );
  save("paste block");
  editor.commands.setContent("<h1>End heading</h1>");
  editor.commands.insertContent("!");
  save("trailing paragraph");
  const serialized = DOMSerializer.fromSchema(editor.schema).serializeFragment(
    editor.state.doc.content,
    { document },
  );
  const host = document.createElement("div");
  host.appendChild(serialized);
  assert(DOMParser.fromSchema(editor.schema).parse(host).eq(editor.state.doc));
  editor.destroy();
  element.remove();
  return snapshots;
}
module.exports = exercise;
