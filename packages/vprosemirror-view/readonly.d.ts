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
  destroy(): void;
}
