import type {
  Node,
  ResolvedPos,
  NodeType,
  Attrs,
  MarkType,
} from "vprosemirror-model";
import type { Command } from "vprosemirror-state";

/** Commands return applicability without dispatching when no dispatch is supplied. */
export declare const deleteSelection: Command;
export declare const joinBackward: Command;
export declare const joinTextblockBackward: Command;
export declare const joinTextblockForward: Command;
export declare const selectNodeBackward: Command;
export declare const joinForward: Command;
export declare const selectNodeForward: Command;
export declare const joinUp: Command;
export declare const joinDown: Command;
export declare const lift: Command;
export declare const newlineInCode: Command;
export declare const exitCode: Command;
export declare const createParagraphNear: Command;
export declare const liftEmptyBlock: Command;
export declare const splitBlock: Command;
export declare const splitBlockKeepMarks: Command;
export declare const selectParentNode: Command;
export declare const selectAll: Command;
export declare const selectTextblockStart: Command;
export declare const selectTextblockEnd: Command;
export declare function splitBlockAs(
  choose?: (
    node: Node,
    atEnd: boolean,
    from: ResolvedPos,
  ) => { type: NodeType; attrs?: Attrs } | null,
): Command;
export declare function wrapIn(type: NodeType, attrs?: Attrs | null): Command;
export declare function setBlockType(
  type: NodeType,
  attrs?: Attrs | null,
): Command;
export declare function toggleMark(
  type: MarkType,
  attrs?: Attrs | null,
  options?: {
    removeWhenPresent?: boolean;
    enterInlineAtoms?: boolean;
    includeWhitespace?: boolean;
  },
): Command;
export declare function autoJoin(
  command: Command,
  joinable: ((before: Node, after: Node) => boolean) | readonly string[],
): Command;
export declare function chainCommands(...commands: readonly Command[]): Command;
export declare const pcBaseKeymap: { [key: string]: Command };
export declare const macBaseKeymap: { [key: string]: Command };
export declare const baseKeymap: { [key: string]: Command };
