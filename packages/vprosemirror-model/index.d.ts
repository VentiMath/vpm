import OrderedMap = require("vorderedmap");
export type Attrs = { readonly [name: string]: any };
export type Content = Fragment | Node | readonly Node[] | null;
export interface AttributeSpec {
  default?: any;
  validate?: string | ((value: any) => void);
}
export type DOMOutputSpec =
  | string
  | globalThis.Node
  | { dom: globalThis.Node; contentDOM?: HTMLElement }
  | readonly [string, ...any[]];
export interface GenericParseRule {
  priority?: number;
  consuming?: boolean;
  context?: string;
  mark?: string;
  ignore?: boolean;
  closeParent?: boolean;
  attrs?: Attrs;
}
export interface TagParseRule extends GenericParseRule {
  tag: string;
  namespace?: string;
  node?: string;
  skip?: boolean | globalThis.Node;
  getAttrs?: (node: HTMLElement) => Attrs | false | null;
  contentElement?: string | HTMLElement | ((node: HTMLElement) => HTMLElement);
  getContent?: (node: globalThis.Node, schema: Schema) => Fragment;
  preserveWhitespace?: boolean | "full";
}
export interface StyleParseRule extends GenericParseRule {
  style: string;
  getAttrs?: (value: string) => Attrs | false | null;
  clearMark?: (mark: Mark) => boolean;
}
export type ParseRule = TagParseRule | StyleParseRule;
export interface NodeSpec {
  content?: string;
  marks?: string;
  group?: string;
  inline?: boolean;
  atom?: boolean;
  attrs?: { [name: string]: AttributeSpec };
  selectable?: boolean;
  draggable?: boolean;
  code?: boolean;
  whitespace?: "normal" | "pre";
  defining?: boolean;
  definingAsContext?: boolean;
  definingForContent?: boolean;
  isolating?: boolean;
  linebreakReplacement?: boolean;
  parseDOM?: readonly TagParseRule[];
  toDOM?: (node: Node) => DOMOutputSpec;
  toDebugString?: (node: Node) => string;
  leafText?: (node: Node) => string;
  [name: string]: any;
}
export interface MarkSpec {
  attrs?: { [name: string]: AttributeSpec };
  inclusive?: boolean;
  excludes?: string;
  group?: string;
  spanning?: boolean;
  code?: boolean;
  parseDOM?: readonly ParseRule[];
  toDOM?: (mark: Mark, inline: boolean) => DOMOutputSpec;
  [name: string]: any;
}
export interface SchemaSpec<
  Nodes extends string = any,
  Marks extends string = any,
> {
  nodes: { [name in Nodes]: NodeSpec } | OrderedMap<NodeSpec>;
  marks?: { [name in Marks]: MarkSpec } | OrderedMap<MarkSpec>;
  topNode?: Nodes;
}
export class Schema<Nodes extends string = any, Marks extends string = any> {
  constructor(spec: SchemaSpec<Nodes, Marks>);
  readonly spec: {
    nodes: OrderedMap<NodeSpec>;
    marks: OrderedMap<MarkSpec>;
    topNode?: string;
  };
  readonly nodes: { [name in Nodes]: NodeType };
  readonly marks: { [name in Marks]: MarkType };
  readonly topNodeType: NodeType;
  readonly linebreakReplacement: NodeType | null;
  readonly cached: { [name: string]: any };
  node(
    type: string | NodeType,
    attrs?: Attrs | null,
    content?: Content,
    marks?: readonly Mark[],
  ): Node;
  text(text: string, marks?: readonly Mark[]): Node;
  mark(type: string | MarkType, attrs?: Attrs | null): Mark;
  nodeFromJSON(json: any): Node;
  markFromJSON(json: any): Mark;
  nodeType(name: string): NodeType;
}
export class NodeType {
  readonly name: string;
  readonly schema: Schema;
  readonly spec: NodeSpec;
  readonly isBlock: boolean;
  readonly isText: boolean;
  readonly isInline: boolean;
  readonly isTextblock: boolean;
  readonly isLeaf: boolean;
  readonly isAtom: boolean;
  readonly inlineContent: boolean;
  readonly whitespace: "normal" | "pre";
  readonly contentMatch: ContentMatch;
  readonly markSet: readonly MarkType[] | null;
  hasRequiredAttrs(): boolean;
  isInGroup(group: string): boolean;
  compatibleContent(other: NodeType): boolean;
  create(
    attrs?: Attrs | null,
    content?: Content,
    marks?: readonly Mark[] | Mark,
  ): Node;
  createChecked(
    attrs?: Attrs | null,
    content?: Content,
    marks?: readonly Mark[] | Mark,
  ): Node;
  createAndFill(
    attrs?: Attrs | null,
    content?: Content,
    marks?: readonly Mark[] | Mark,
  ): Node | null;
  validContent(content: Fragment): boolean;
  checkContent(content: Fragment): void;
  checkAttrs(attrs: Attrs): void;
  allowsMarkType(type: MarkType): boolean;
  allowsMarks(marks: readonly Mark[]): boolean;
  allowedMarks(marks: readonly Mark[]): readonly Mark[];
}
export class MarkType {
  readonly name: string;
  readonly schema: Schema;
  readonly spec: MarkSpec;
  create(attrs?: Attrs | null): Mark;
  removeFromSet(set: readonly Mark[]): readonly Mark[];
  isInSet(set: readonly Mark[]): Mark | undefined;
  excludes(type: MarkType): boolean;
}
export class Mark {
  readonly type: MarkType;
  readonly attrs: Attrs;
  addToSet(set: readonly Mark[]): readonly Mark[];
  removeFromSet(set: readonly Mark[]): readonly Mark[];
  isInSet(set: readonly Mark[]): boolean;
  eq(other: Mark): boolean;
  toJSON(): any;
  static readonly none: readonly Mark[];
  static fromJSON(schema: Schema, json: any): Mark;
  static sameSet(a: readonly Mark[], b: readonly Mark[]): boolean;
  static setFrom(marks?: Mark | readonly Mark[] | null): readonly Mark[];
}
export type NodeVisitor = (
  node: Node,
  position: number,
  parent: Node | null,
  index: number,
) => boolean | void;
export class Node {
  readonly type: NodeType;
  readonly attrs: Attrs;
  readonly marks: readonly Mark[];
  readonly content: Fragment;
  readonly children: readonly Node[];
  readonly text?: string;
  readonly nodeSize: number;
  readonly childCount: number;
  readonly firstChild: Node | null;
  readonly lastChild: Node | null;
  readonly textContent: string;
  readonly isBlock: boolean;
  readonly isText: boolean;
  readonly isInline: boolean;
  readonly isTextblock: boolean;
  readonly isLeaf: boolean;
  readonly isAtom: boolean;
  readonly inlineContent: boolean;
  child(index: number): Node;
  maybeChild(index: number): Node | null;
  forEach(fn: (node: Node, offset: number, index: number) => void): void;
  nodesBetween(
    from: number,
    to: number,
    fn: NodeVisitor,
    startPos?: number,
  ): void;
  descendants(fn: NodeVisitor): void;
  textBetween(
    from: number,
    to: number,
    blockSeparator?: string | null,
    leafText?: string | ((node: Node) => string),
  ): string;
  eq(other: Node): boolean;
  sameMarkup(other: Node): boolean;
  hasMarkup(
    type: NodeType,
    attrs?: Attrs | null,
    marks?: readonly Mark[],
  ): boolean;
  copy(content?: Fragment | null): Node;
  mark(marks: readonly Mark[]): Node;
  cut(from: number, to?: number): Node;
  slice(from: number, to?: number, includeParents?: boolean): Slice;
  replace(from: number, to: number, slice: Slice): Node;
  nodeAt(pos: number): Node | null;
  childAfter(pos: number): { node: Node | null; index: number; offset: number };
  childBefore(pos: number): {
    node: Node | null;
    index: number;
    offset: number;
  };
  resolve(pos: number): ResolvedPos;
  resolveNoCache(pos: number): ResolvedPos;
  rangeHasMark(from: number, to: number, type: Mark | MarkType): boolean;
  contentMatchAt(index: number): ContentMatch;
  canReplace(
    from: number,
    to: number,
    replacement?: Fragment,
    start?: number,
    end?: number,
  ): boolean;
  canReplaceWith(
    from: number,
    to: number,
    type: NodeType,
    marks?: readonly Mark[],
  ): boolean;
  canAppend(other: Node): boolean;
  check(): void;
  toJSON(): any;
  toString(): string;
  static fromJSON(schema: Schema, json: any): Node;
}
export class Fragment {
  readonly content: readonly Node[];
  readonly size: number;
  readonly childCount: number;
  readonly firstChild: Node | null;
  readonly lastChild: Node | null;
  child(index: number): Node;
  maybeChild(index: number): Node | null;
  forEach(fn: (node: Node, offset: number, index: number) => void): void;
  nodesBetween(
    from: number,
    to: number,
    fn: NodeVisitor,
    startPos?: number,
    parent?: Node,
  ): void;
  descendants(fn: NodeVisitor): void;
  textBetween(
    from: number,
    to: number,
    blockSeparator?: string | null,
    leafText?: string | ((node: Node) => string),
  ): string;
  append(other: Fragment): Fragment;
  cut(from: number, to?: number): Fragment;
  cutByIndex(from: number, to: number): Fragment;
  replaceChild(index: number, node: Node): Fragment;
  addToStart(node: Node): Fragment;
  addToEnd(node: Node): Fragment;
  eq(other: Fragment): boolean;
  findDiffStart(other: Fragment, pos?: number): number | null;
  findDiffEnd(
    other: Fragment,
    pos?: number,
    otherPos?: number,
  ): { a: number; b: number } | null;
  toJSON(): any;
  toString(): string;
  static readonly empty: Fragment;
  static from(content?: Content): Fragment;
  static fromArray(nodes: readonly Node[]): Fragment;
  static fromJSON(schema: Schema, json: any): Fragment;
}
export class ResolvedPos {
  readonly pos: number;
  readonly parentOffset: number;
  readonly depth: number;
  readonly parent: Node;
  readonly doc: Node;
  readonly textOffset: number;
  readonly nodeBefore: Node | null;
  readonly nodeAfter: Node | null;
  node(depth?: number | null): Node;
  index(depth?: number | null): number;
  indexAfter(depth?: number | null): number;
  start(depth?: number | null): number;
  end(depth?: number | null): number;
  before(depth?: number | null): number;
  after(depth?: number | null): number;
  posAtIndex(index: number, depth?: number | null): number;
  marks(): readonly Mark[];
  marksAcross(end: ResolvedPos): readonly Mark[] | null;
  sharedDepth(pos: number): number;
  sameParent(other: ResolvedPos): boolean;
  blockRange(
    other?: ResolvedPos,
    predicate?: (node: Node) => boolean,
  ): NodeRange | null;
  min(other: ResolvedPos): ResolvedPos;
  max(other: ResolvedPos): ResolvedPos;
}
export class NodeRange {
  constructor($from: ResolvedPos, $to: ResolvedPos, depth: number);
  readonly $from: ResolvedPos;
  readonly $to: ResolvedPos;
  readonly depth: number;
  readonly start: number;
  readonly end: number;
  readonly parent: Node;
  readonly startIndex: number;
  readonly endIndex: number;
}
export class Slice {
  constructor(content: Fragment, openStart: number, openEnd: number);
  readonly content: Fragment;
  readonly openStart: number;
  readonly openEnd: number;
  readonly size: number;
  eq(other: Slice): boolean;
  toJSON(): any;
  toString(): string;
  static readonly empty: Slice;
  static fromJSON(schema: Schema, json: any): Slice;
  static maxOpen(fragment: Fragment, openIsolating?: boolean): Slice;
}
export class ReplaceError extends Error {}
export class ContentMatch {
  readonly validEnd: boolean;
  readonly defaultType: NodeType | null;
  readonly edgeCount: number;
  matchType(type: NodeType): ContentMatch | null;
  matchFragment(
    fragment: Fragment,
    start?: number,
    end?: number,
  ): ContentMatch | null;
  fillBefore(
    after: Fragment,
    toEnd?: boolean,
    startIndex?: number,
  ): Fragment | null;
  findWrapping(target: NodeType): readonly NodeType[] | null;
  edge(index: number): { type: NodeType; next: ContentMatch };
  static readonly empty: ContentMatch;
}
export interface ParseOptions {
  preserveWhitespace?: boolean | "full";
  findPositions?: { node: globalThis.Node; offset: number; pos?: number }[];
  from?: number;
  to?: number;
  topNode?: Node;
  topMatch?: ContentMatch;
  context?: ResolvedPos;
  ruleFromNode?: (node: globalThis.Node) => Omit<TagParseRule, "tag"> | null;
}
export class DOMParser {
  constructor(schema: Schema, rules: readonly ParseRule[]);
  readonly schema: Schema;
  readonly rules: readonly ParseRule[];
  parse(dom: globalThis.Node, options?: ParseOptions): Node;
  parseSlice(dom: globalThis.Node, options?: ParseOptions): Slice;
  static fromSchema(schema: Schema): DOMParser;
  static schemaRules(schema: Schema): ParseRule[];
}
export class DOMSerializer {
  constructor(
    nodes: { [name: string]: (node: Node) => DOMOutputSpec },
    marks: { [name: string]: (mark: Mark, inline: boolean) => DOMOutputSpec },
  );
  readonly nodes: { [name: string]: (node: Node) => DOMOutputSpec };
  readonly marks: {
    [name: string]: (mark: Mark, inline: boolean) => DOMOutputSpec;
  };
  serializeFragment(
    fragment: Fragment,
    options?: { document?: Document },
    target?: HTMLElement | DocumentFragment,
  ): HTMLElement | DocumentFragment;
  serializeNode(node: Node, options?: { document?: Document }): globalThis.Node;
  serializeMark(
    mark: Mark,
    inline: boolean,
    options?: { document?: Document },
  ): { dom: globalThis.Node; contentDOM?: HTMLElement } | null;
  static renderSpec(
    document: Document,
    spec: DOMOutputSpec,
    namespace?: string | null,
  ): { dom: globalThis.Node; contentDOM?: HTMLElement };
  static fromSchema(schema: Schema): DOMSerializer;
  static nodesFromSchema(schema: Schema): {
    [name: string]: (node: Node) => DOMOutputSpec;
  };
  static marksFromSchema(schema: Schema): {
    [name: string]: (mark: Mark, inline: boolean) => DOMOutputSpec;
  };
}
