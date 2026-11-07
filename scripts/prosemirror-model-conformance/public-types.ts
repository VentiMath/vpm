import {
  Schema,
  Node,
  NodeRange,
  Fragment,
  Slice,
  DOMParser,
  DOMSerializer,
  Mark,
  type NodeSpec,
  type MarkSpec,
} from "vprosemirror-model";
const paragraph: NodeSpec = {
  group: "block",
  content: "text*",
  parseDOM: [{ tag: "p" }],
  toDOM: () => ["p", 0],
};
const strong: MarkSpec = {
  parseDOM: [{ tag: "strong" }],
  toDOM: () => ["strong", 0],
};
const s = new Schema({
  nodes: { doc: { content: "block+" }, paragraph, text: {} },
  marks: { strong },
});
const n: Node = s.node("doc", null, [
  s.node("paragraph", null, s.text("hello", [s.marks.strong.create()])),
]);
const slice: Slice = n.slice(1, 3),
  pos = n.resolve(2),
  marks: readonly Mark[] = pos.marks();
const range: NodeRange | null = pos.blockRange();
const frag: Fragment = Fragment.from(n);
const host = document.createElement("div");
host.appendChild(
  DOMSerializer.fromSchema(s).serializeFragment(n.content, { document }),
);
const parsed: Node = DOMParser.fromSchema(s).parse(host, {
  findPositions: [{ node: host, offset: 0 }],
});
const json: any = parsed.toJSON();
void [slice, marks, range, frag, json];
// @ts-expect-error Unknown statically specified node name.
s.nodes.notInSchema.create();
// @ts-expect-error Position must be numeric.
n.resolve("2");
