import type { Node as DocumentNode, Mark } from "vprosemirror-model";
import type { Mapping } from "vprosemirror-transform";
import type { EditorView } from "prosemirror-view" with { "resolution-mode": "require" };

/** Host type only. This internal milestone does not implement EditorView. */
export type WidgetConstructor =
  | globalThis.Node
  | ((view: EditorView, getPos: () => number | undefined) => globalThis.Node);
export interface DecorationAttrs {
  nodeName?: string;
  class?: string;
  style?: string;
  [attribute: string]: string | undefined;
}
export interface WidgetSpec {
  side?: number;
  relaxedSide?: boolean;
  marks?: readonly Mark[];
  stopEvent?: (event: Event) => boolean;
  ignoreSelection?: boolean;
  key?: string;
  destroy?: (node: globalThis.Node) => void;
  [key: string]: any;
}
export interface InlineSpec {
  inclusiveStart?: boolean;
  inclusiveEnd?: boolean;
  [key: string]: any;
}
export declare class Decoration {
  private constructor();
  readonly from: number;
  readonly to: number;
  readonly spec: any;
  static widget(
    pos: number,
    toDOM: WidgetConstructor,
    spec?: WidgetSpec,
  ): Decoration;
  static inline(
    from: number,
    to: number,
    attrs: DecorationAttrs,
    spec?: InlineSpec,
  ): Decoration;
  static node(
    from: number,
    to: number,
    attrs: DecorationAttrs,
    spec?: any,
  ): Decoration;
}
export interface DecorationSource {
  map(mapping: Mapping, doc: DocumentNode): DecorationSource;
  forChild(offset: number, child: DocumentNode): DecorationSource;
  forEachSet(callback: (set: DecorationSet) => void): void;
}
export declare class DecorationSet implements DecorationSource {
  private constructor();
  /** Unlike upstream, input arrays are retained unchanged. */
  static create(
    doc: DocumentNode,
    decorations: readonly Decoration[],
  ): DecorationSet;
  static readonly empty: DecorationSet;
  find(
    start?: number,
    end?: number,
    predicate?: (spec: any) => boolean,
  ): Decoration[];
  map(
    mapping: Mapping,
    doc: DocumentNode,
    options?: { onRemove?: (spec: any) => void },
  ): DecorationSet;
  add(doc: DocumentNode, decorations: readonly Decoration[]): DecorationSet;
  remove(decorations: readonly Decoration[]): DecorationSet;
  forChild(offset: number, child: DocumentNode): DecorationSource;
  forEachSet(callback: (set: DecorationSet) => void): void;
}
