import { Schema, Slice, Fragment } from "vprosemirror-model";
import {
  Transform,
  Step,
  StepMap,
  Mapping,
  AddMarkStep,
  ReplaceStep,
  findWrapping,
  liftTarget,
  canSplit,
  replaceStep,
} from "vprosemirror-transform";
const schema = new Schema({
  nodes: { doc: { content: "p+" }, p: { content: "text*" }, text: {} },
  marks: { em: {} },
});
const doc = schema.node(
  "doc",
  null,
  schema.node("p", null, schema.text("abc")),
);
const transform = new Transform(doc)
  .insert(2, schema.text("x"))
  .addMark(1, 2, schema.mark("em"));
const step: Step = new ReplaceStep(
  1,
  2,
  new Slice(Fragment.from(schema.text("a")), 0, 0),
);
transform.maybeStep(step);
new AddMarkStep(1, 2, schema.mark("em")).invert(doc);
const mapping = new Mapping([StepMap.offset(2)]);
const position: number = mapping.map(1);
mapping.mapResult(position).deletedAcross;
const range = doc.resolve(1).blockRange();
if (range) {
  liftTarget(range);
  findWrapping(range, schema.nodes.p);
}
canSplit(doc, 2);
replaceStep(doc, 1, 2);
transform.setBlockType(1, 2, schema.nodes.p, () => ({}));
// @ts-expect-error positions are numbers
mapping.map("1");
// @ts-expect-error steps require slices
new ReplaceStep(1, 2, {});
