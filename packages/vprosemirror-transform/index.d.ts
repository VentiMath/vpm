import type {
  Node,
  Slice,
  Fragment,
  Mark,
  MarkType,
  Schema,
  NodeType,
  NodeRange,
  ContentMatch,
  Attrs,
} from "vprosemirror-model";
export interface Mappable {
  map(pos: number, assoc?: number): number;
  mapResult(pos: number, assoc?: number): MapResult;
}
export class MapResult {
  readonly pos: number;
  readonly deleted: boolean;
  readonly deletedBefore: boolean;
  readonly deletedAfter: boolean;
  readonly deletedAcross: boolean;
}
export class StepMap implements Mappable {
  constructor(ranges: readonly number[], inverted?: boolean);
  map(pos: number, assoc?: number): number;
  mapResult(pos: number, assoc?: number): MapResult;
  forEach(
    f: (
      oldStart: number,
      oldEnd: number,
      newStart: number,
      newEnd: number,
    ) => void,
  ): void;
  invert(): StepMap;
  static offset(n: number): StepMap;
  static empty: StepMap;
}
export class Mapping implements Mappable {
  constructor(
    maps?: readonly StepMap[],
    mirror?: number[],
    from?: number,
    to?: number,
  );
  readonly maps: readonly StepMap[];
  from: number;
  to: number;
  slice(from?: number, to?: number): Mapping;
  appendMap(map: StepMap, mirrors?: number): void;
  appendMapping(mapping: Mapping): void;
  getMirror(n: number): number | undefined;
  appendMappingInverted(mapping: Mapping): void;
  invert(): Mapping;
  map(pos: number, assoc?: number): number;
  mapResult(pos: number, assoc?: number): MapResult;
}
export abstract class Step {
  abstract apply(doc: Node): StepResult;
  getMap(): StepMap;
  abstract invert(doc: Node): Step;
  abstract map(mapping: Mappable): Step | null;
  merge(other: Step): Step | null;
  abstract toJSON(): any;
  static fromJSON(schema: Schema, json: any): Step;
  static jsonID(
    id: string,
    stepClass: { fromJSON(schema: Schema, json: any): Step },
  ): any;
}
export class StepResult {
  readonly doc: Node | null;
  readonly failed: string | null;
  static ok(doc: Node): StepResult;
  static fail(message: string): StepResult;
  static fromReplace(
    doc: Node,
    from: number,
    to: number,
    slice: Slice,
  ): StepResult;
}
export class ReplaceStep extends Step {
  constructor(from: number, to: number, slice: Slice, structure?: boolean);
  readonly from: number;
  readonly to: number;
  readonly slice: Slice;
  apply(doc: Node): StepResult;
  getMap(): StepMap;
  invert(doc: Node): ReplaceStep;
  map(mapping: Mappable): ReplaceStep | null;
  merge(other: Step): ReplaceStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): ReplaceStep;
}
export class ReplaceAroundStep extends Step {
  constructor(
    from: number,
    to: number,
    gapFrom: number,
    gapTo: number,
    slice: Slice,
    insert: number,
    structure?: boolean,
  );
  readonly from: number;
  readonly to: number;
  readonly gapFrom: number;
  readonly gapTo: number;
  readonly slice: Slice;
  readonly insert: number;
  apply(doc: Node): StepResult;
  getMap(): StepMap;
  invert(doc: Node): ReplaceAroundStep;
  map(mapping: Mappable): ReplaceAroundStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): ReplaceAroundStep;
}
export class AddMarkStep extends Step {
  constructor(from: number, to: number, mark: Mark);
  readonly from: number;
  readonly to: number;
  readonly mark: Mark;
  apply(doc: Node): StepResult;
  invert(doc: Node): Step;
  map(mapping: Mappable): AddMarkStep | null;
  merge(other: Step): AddMarkStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): AddMarkStep;
}
export class RemoveMarkStep extends Step {
  constructor(from: number, to: number, mark: Mark);
  readonly from: number;
  readonly to: number;
  readonly mark: Mark;
  apply(doc: Node): StepResult;
  invert(doc: Node): Step;
  map(mapping: Mappable): RemoveMarkStep | null;
  merge(other: Step): RemoveMarkStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): RemoveMarkStep;
}
export class AddNodeMarkStep extends Step {
  constructor(pos: number, mark: Mark);
  readonly pos: number;
  readonly mark: Mark;
  apply(doc: Node): StepResult;
  invert(doc: Node): Step;
  map(mapping: Mappable): AddNodeMarkStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): AddNodeMarkStep;
}
export class RemoveNodeMarkStep extends Step {
  constructor(pos: number, mark: Mark);
  readonly pos: number;
  readonly mark: Mark;
  apply(doc: Node): StepResult;
  invert(doc: Node): Step;
  map(mapping: Mappable): RemoveNodeMarkStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): RemoveNodeMarkStep;
}
export class AttrStep extends Step {
  constructor(pos: number, attr: string, value: any);
  readonly pos: number;
  readonly attr: string;
  readonly value: any;
  apply(doc: Node): StepResult;
  invert(doc: Node): AttrStep;
  map(mapping: Mappable): AttrStep | null;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): AttrStep;
}
export class DocAttrStep extends Step {
  constructor(attr: string, value: any);
  readonly attr: string;
  readonly value: any;
  apply(doc: Node): StepResult;
  invert(doc: Node): DocAttrStep;
  map(mapping: Mappable): this;
  toJSON(): any;
  static fromJSON(schema: Schema, json: any): DocAttrStep;
}
export class TransformError extends Error {}
export class Transform {
  constructor(doc: Node);
  doc: Node;
  readonly steps: Step[];
  readonly docs: Node[];
  readonly mapping: Mapping;
  readonly before: Node;
  readonly docChanged: boolean;
  step(step: Step): this;
  maybeStep(step: Step): StepResult;
  changedRange(): { from: number; to: number } | null;
  replace(from: number, to?: number, slice?: Slice): this;
  replaceWith(
    from: number,
    to: number,
    content: Fragment | Node | readonly Node[],
  ): this;
  delete(from: number, to: number): this;
  insert(pos: number, content: Fragment | Node | readonly Node[]): this;
  replaceRange(from: number, to: number, slice: Slice): this;
  replaceRangeWith(from: number, to: number, node: Node): this;
  deleteRange(from: number, to: number): this;
  lift(range: NodeRange, target: number): this;
  join(pos: number, depth?: number): this;
  wrap(
    range: NodeRange,
    wrappers: readonly { type: NodeType; attrs?: Attrs | null }[],
  ): this;
  setBlockType(
    from: number,
    to: number | undefined,
    type: NodeType,
    attrs?: Attrs | null | ((node: Node) => Attrs),
  ): this;
  setNodeMarkup(
    pos: number,
    type?: NodeType | null,
    attrs?: Attrs | null,
    marks?: readonly Mark[],
  ): this;
  setNodeAttribute(pos: number, attr: string, value: any): this;
  setDocAttribute(attr: string, value: any): this;
  addNodeMark(pos: number, mark: Mark): this;
  removeNodeMark(pos: number, mark: Mark | MarkType): this;
  split(
    pos: number,
    depth?: number,
    typesAfter?: (null | { type: NodeType; attrs?: Attrs | null })[],
  ): this;
  addMark(from: number, to: number, mark: Mark): this;
  removeMark(from: number, to: number, mark?: Mark | MarkType | null): this;
  clearIncompatible(pos: number, type: NodeType, match?: ContentMatch): this;
}
export function liftTarget(range: NodeRange): number | null;
export function findWrapping(
  range: NodeRange,
  type: NodeType,
  attrs?: Attrs | null,
  innerRange?: NodeRange,
): { type: NodeType; attrs: Attrs | null }[] | null;
export function canSplit(
  doc: Node,
  pos: number,
  depth?: number,
  typesAfter?: (null | { type: NodeType; attrs?: Attrs | null })[],
): boolean;
export function canJoin(doc: Node, pos: number): boolean;
export function joinPoint(
  doc: Node,
  pos: number,
  dir?: number,
): number | undefined;
export function insertPoint(
  doc: Node,
  pos: number,
  type: NodeType,
): number | null;
export function dropPoint(doc: Node, pos: number, slice: Slice): number | null;
export function replaceStep(
  doc: Node,
  from: number,
  to?: number,
  slice?: Slice,
): Step | null;
