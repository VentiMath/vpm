declare namespace parser {
  interface BaseNode { type: string; value: string; sourceIndex: number; sourceEndIndex: number }
  interface WordNode extends BaseNode { type: 'word' }
  interface SpaceNode extends BaseNode { type: 'space' }
  interface UnicodeRangeNode extends BaseNode { type: 'unicode-range' }
  interface StringNode extends BaseNode { type: 'string'; quote: '"' | "'"; unclosed?: true }
  interface CommentNode extends BaseNode { type: 'comment'; unclosed?: true }
  interface DivNode extends BaseNode { type: 'div'; before: string; after: string }
  interface FunctionNode extends BaseNode { type: 'function'; before: string; after: string; nodes: Node[]; unclosed?: true }
  type Node = WordNode | SpaceNode | UnicodeRangeNode | StringNode | CommentNode | DivNode | FunctionNode;
  type WalkCallback = (node: Node, index: number, siblings: Node[]) => void | boolean;
  type CustomStringifierCallback = (node: Node) => string | undefined;
  interface Dimension { number: string; unit: string }
  interface ParsedValue { nodes: Node[]; walk(callback: WalkCallback, bubble?: boolean): this; toString(): string }
  interface ValueParser {
    (value: string): ParsedValue;
    new (value: string): ParsedValue;
    unit(value: string): Dimension | false;
    walk(nodes: Node[], callback: WalkCallback, bubble?: boolean): void;
    stringify(nodes: Node | Node[], custom?: CustomStringifierCallback): string;
  }
}
declare const parser: parser.ValueParser;
export = parser;
