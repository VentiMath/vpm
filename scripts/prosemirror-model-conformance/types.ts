import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Schema, Node as DocumentNode, Slice } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { Transform } from "prosemirror-transform";
const editor = new Editor({
  extensions: [StarterKit, TaskList, TaskItem],
  content: "<p>Text</p>",
});
const doc: DocumentNode = editor.state.doc;
const state: EditorState = EditorState.create({ schema: editor.schema, doc });
const selection = TextSelection.create(doc, 1);
const slice: Slice = selection.content();
const tr = new Transform(doc).replaceRange(1, 2, slice);
void [tr, state];
