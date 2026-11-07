import type {
  NodeSpec,
  NodeType,
  Attrs,
  NodeRange,
  Schema,
} from "vprosemirror-model" with { "resolution-mode": "require" };
import type {
  Command,
  Transaction,
} from "vprosemirror-state" with { "resolution-mode": "require" };
export declare const orderedList: NodeSpec,
  bulletList: NodeSpec,
  listItem: NodeSpec;
export declare function addListNodes(
  nodes: Schema["spec"]["nodes"],
  itemContent: string,
  listGroup?: string,
): Schema["spec"]["nodes"];
export declare function wrapInList(
  listType: NodeType,
  attrs?: Attrs | null,
): Command;
export declare function wrapRangeInList(
  tr: Transaction | null,
  range: NodeRange,
  listType: NodeType,
  attrs?: Attrs | null,
): boolean;
export declare function splitListItem(
  itemType: NodeType | readonly NodeType[],
  itemAttrs?: Attrs,
): Command;
export declare function splitListItemKeepMarks(
  itemType: NodeType | readonly NodeType[],
  itemAttrs?: Attrs,
): Command;
export declare function liftListItem(
  itemType: NodeType | readonly NodeType[],
): Command;
export declare function sinkListItem(
  itemType: NodeType | readonly NodeType[],
): Command;
