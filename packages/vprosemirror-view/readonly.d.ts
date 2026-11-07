import type { Node as DocumentNode } from "vprosemirror-model";
import type { DecorationSet } from "./decorations.d.ts";
import type { EditorView } from "prosemirror-view" with { "resolution-mode": "require" };
export interface ReadOnlyOptions {
  doc: DocumentNode;
  decorations?: DecorationSet;
  attributes?: Record<string, string>;
  /** Optional host passed to widget factories; no EditorView host is synthesized. */
  widgetHost?: EditorView;
}
/** Internal rendering primitive. Does not implement EditorView or input handling. */
export declare class ReadOnlyRenderer {
  constructor(place: HTMLElement | ShadowRoot, options: ReadOnlyOptions);
  readonly dom: HTMLDivElement;
  readonly doc: DocumentNode;
  readonly destroyed: boolean;
  update(doc: DocumentNode, decorations?: DecorationSet): void;
  /** Find a DOM boundary; side < 0 prefers preceding content, > 0 following content. */
  domAtPos(
    pos: number,
    side?: number,
  ): { node: globalThis.Node; offset: number };
  /** Return the rendered document node immediately after pos, or null. */
  nodeDOM(pos: number): globalThis.Node | null;
  /** Resolve a DOM boundary. bias > 0 chooses the end inside an opaque leaf. */
  posAtDOM(node: globalThis.Node, offset: number, bias?: number): number;
  destroy(): void;
}
