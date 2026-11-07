import type {
  Node,
  Schema,
  Mark,
  MarkType,
  Slice,
  ResolvedPos,
} from "vprosemirror-model";
import { Transform } from "vprosemirror-transform";
import type { Mappable } from "vprosemirror-transform";
import type {
  EditorView,
  EditorProps,
} from "prosemirror-view" with { "resolution-mode": "require" };

export interface EditorStateConfig {
  schema?: Schema;
  doc?: Node;
  selection?: Selection;
  storedMarks?: readonly Mark[] | null;
  plugins?: readonly Plugin[];
}
export class EditorState {
  doc: Node;
  selection: Selection;
  storedMarks: readonly Mark[] | null;
  readonly schema: Schema;
  readonly plugins: readonly Plugin[];
  readonly tr: Transaction;
  apply(tr: Transaction): EditorState;
  applyTransaction(tr: Transaction): {
    state: EditorState;
    transactions: readonly Transaction[];
  };
  reconfigure(config: { plugins?: readonly Plugin[] }): EditorState;
  toJSON(pluginFields?: { [name: string]: Plugin }): any;
  static create(config: EditorStateConfig): EditorState;
  static fromJSON(
    config: { schema: Schema; plugins?: readonly Plugin[] },
    json: any,
    pluginFields?: { [name: string]: Plugin },
  ): EditorState;
}
export interface StateField<T> {
  init(config: EditorStateConfig, instance: EditorState): T;
  apply(
    tr: Transaction,
    value: T,
    oldState: EditorState,
    newState: EditorState,
  ): T;
  toJSON?(value: T): any;
  fromJSON?(config: EditorStateConfig, value: any, state: EditorState): T;
}
export type PluginView = {
  update?: (view: EditorView, prevState: EditorState) => void;
  destroy?: () => void;
};
export interface PluginSpec<T> {
  props?: EditorProps<Plugin<T>>;
  state?: StateField<T>;
  key?: PluginKey<T>;
  view?: (view: EditorView) => PluginView;
  filterTransaction?: (tr: Transaction, state: EditorState) => boolean;
  appendTransaction?: (
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState,
  ) => Transaction | null | undefined;
  [key: string]: any;
}
export class Plugin<T = any> {
  constructor(spec: PluginSpec<T>);
  readonly spec: PluginSpec<T>;
  readonly props: EditorProps<Plugin<T>>;
  getState(state: EditorState): T | undefined;
}
export class PluginKey<T = any> {
  constructor(name?: string);
  get(state: EditorState): Plugin<T> | undefined;
  getState(state: EditorState): T | undefined;
}
export type Command = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  view?: EditorView,
) => boolean;
export class Transaction extends Transform {
  time: number;
  storedMarks: readonly Mark[] | null;
  readonly selection: Selection;
  readonly selectionSet: boolean;
  readonly storedMarksSet: boolean;
  readonly scrolledIntoView: boolean;
  readonly isGeneric: boolean;
  setSelection(selection: Selection): this;
  setStoredMarks(marks: readonly Mark[] | null): this;
  ensureMarks(marks: readonly Mark[]): this;
  addStoredMark(mark: Mark): this;
  removeStoredMark(mark: Mark | MarkType): this;
  setTime(time: number): this;
  replaceSelection(slice: Slice): this;
  replaceSelectionWith(node: Node, inheritMarks?: boolean): this;
  deleteSelection(): this;
  insertText(text: string, from?: number, to?: number): this;
  setMeta(key: string | Plugin | PluginKey, value: any): this;
  getMeta(key: string | Plugin | PluginKey): any;
  scrollIntoView(): this;
}
export interface SelectionBookmark {
  map(mapping: Mappable): SelectionBookmark;
  resolve(doc: Node): Selection;
}
export class SelectionRange {
  constructor($from: ResolvedPos, $to: ResolvedPos);
  readonly $from: ResolvedPos;
  readonly $to: ResolvedPos;
}
export abstract class Selection {
  constructor(
    $anchor: ResolvedPos,
    $head: ResolvedPos,
    ranges?: readonly SelectionRange[],
  );
  readonly $anchor: ResolvedPos;
  readonly $head: ResolvedPos;
  ranges: readonly SelectionRange[];
  readonly anchor: number;
  readonly head: number;
  readonly from: number;
  readonly to: number;
  readonly $from: ResolvedPos;
  readonly $to: ResolvedPos;
  readonly empty: boolean;
  visible: boolean;
  abstract eq(selection: Selection): boolean;
  abstract map(doc: Node, mapping: Mappable): Selection;
  abstract toJSON(): any;
  content(): Slice;
  replace(tr: Transaction, content?: Slice): void;
  replaceWith(tr: Transaction, node: Node): void;
  getBookmark(): SelectionBookmark;
  static findFrom(
    pos: ResolvedPos,
    dir: number,
    textOnly?: boolean,
  ): Selection | null;
  static near(pos: ResolvedPos, bias?: number): Selection;
  static atStart(doc: Node): Selection;
  static atEnd(doc: Node): Selection;
  static fromJSON(doc: Node, json: any): Selection;
  static jsonID(
    id: string,
    selectionClass: { fromJSON(doc: Node, json: any): Selection },
  ): any;
}
interface TextBookmark extends SelectionBookmark {
  readonly anchor: number;
  readonly head: number;
  map(mapping: Mappable): TextBookmark;
}
interface NodeBookmark extends SelectionBookmark {
  readonly anchor: number;
  map(mapping: Mappable): TextBookmark | NodeBookmark;
}
export class TextSelection extends Selection {
  constructor($anchor: ResolvedPos, $head?: ResolvedPos);
  readonly $cursor: ResolvedPos | null;
  map(doc: Node, mapping: Mappable): Selection;
  eq(selection: Selection): boolean;
  toJSON(): any;
  getBookmark(): TextBookmark;
  static create(doc: Node, anchor: number, head?: number): TextSelection;
  static between(
    anchor: ResolvedPos,
    head: ResolvedPos,
    bias?: number,
  ): Selection;
}
export class NodeSelection extends Selection {
  constructor($pos: ResolvedPos);
  node: Node;
  map(doc: Node, mapping: Mappable): Selection;
  eq(selection: Selection): boolean;
  toJSON(): any;
  getBookmark(): NodeBookmark;
  static create(doc: Node, from: number): NodeSelection;
  static isSelectable(node: Node): boolean;
}
export class AllSelection extends Selection {
  constructor(doc: Node);
  map(doc: Node): AllSelection;
  eq(selection: Selection): boolean;
  toJSON(): any;
}
