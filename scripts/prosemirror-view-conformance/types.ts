import {
  Decoration,
  DecorationSet,
  type DecorationSource,
} from "vprosemirror-view/decorations";
import { Schema } from "vprosemirror-model";
import { Mapping } from "vprosemirror-transform";
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, schema.text("word")),
]);
const widget = Decoration.widget(
  1,
  (_view, getPos) => {
    getPos();
    return document.createElement("button");
  },
  {
    key: "key",
    side: -1,
    destroy(node) {
      node.parentNode?.removeChild(node);
    },
  },
);
const decorations: readonly Decoration[] = [
  widget,
  Decoration.inline(1, 3, { class: "selection" }, { inclusiveEnd: true }),
  Decoration.node(0, 6, { class: "node" }),
];
const set = DecorationSet.create(doc, decorations)
  .add(doc, decorations)
  .remove([widget]);
const mapped = set.map(new Mapping(), doc, {
  onRemove(spec) {
    void spec.key;
  },
});
const source: DecorationSource = mapped.forChild(0, doc.firstChild!);
source.forEachSet((set) => set.find(0, 3, (s) => s.key === "key"));
// @ts-expect-error EditorView is deliberately not exported by this milestone.
import { EditorView } from "vprosemirror-view/decorations";
// @ts-expect-error A full view replacement is deliberately unavailable.
import * as View from "vprosemirror-view";

import { ReadOnlyRenderer } from "vprosemirror-view/readonly";
const readonlyView = new ReadOnlyRenderer(document.createElement("div"), {
  doc,
  decorations: set,
});
readonlyView.update(doc, mapped);
readonlyView.destroy();
