export interface ExpressionOptions { separator?: string; }
export interface MatcherOptions { separator?: string; }
export interface Segment {
  readonly type: 'tag' | 'deep-wildcard';
  readonly tag?: string;
  readonly namespace?: string;
  readonly attrName?: string;
  readonly attrValue?: string;
  readonly position?: 'first' | 'odd' | 'even' | 'nth';
  readonly positionValue?: number;
}
export class Expression<T = unknown> {
  readonly pattern: string;
  readonly separator: string;
  readonly segments: readonly Segment[];
  data: T | undefined;
  constructor(pattern: string, options?: ExpressionOptions, data?: T);
  readonly length: number;
  hasDeepWildcard(): boolean;
  hasAttributeCondition(): boolean;
  hasPositionSelector(): boolean;
  toString(): string;
}
export interface PathNode {
  tag: string;
  namespace?: string;
  position: number;
  counter: number;
  values?: Record<string, unknown>;
}
export interface SiblingLevel {
  counts: Map<string, number>;
  total: number;
  namespaceCounts?: Map<string, Map<string, number>>;
}
export interface KeptAttrEntry { depth: number; name: string; value: unknown; }
export interface MatcherSnapshot {
  path: PathNode[];
  siblingStacks: SiblingLevel[];
  keptAttrs: KeptAttrEntry[];
}
export interface PushOptions { keep?: readonly string[]; }
export class MatcherView {
  constructor(matcher: Matcher);
  readonly separator: string;
  /** Frozen inspection copies; attribute values themselves are shallow references. */
  readonly path: readonly Readonly<PathNode>[];
  getCurrentTag(): string | undefined;
  getCurrentNamespace(): string | undefined;
  getAttrValue(name: string): unknown;
  hasAttr(name: string): boolean;
  getAnyParentAttr(name: string): unknown;
  hasAnyParentAttr(name: string): boolean;
  getPosition(): number;
  getCounter(): number;
  /** @deprecated Use getPosition() or getCounter(). */
  getIndex(): number;
  getDepth(): number;
  toString(separator?: string, includeNamespace?: boolean): string;
  toArray(): string[];
  matches(expression: Expression): boolean;
  matchesAny(set: ExpressionSet): boolean;
  /** Independent structural snapshot; nested attribute values remain shared. */
  snapshot(): MatcherSnapshot;
}
export type ReadOnlyMatcher = MatcherView;
export class Matcher {
  constructor(options?: MatcherOptions);
  readonly separator: string;
  /** Inspection copies. Use push/pop/updateCurrent/restore to change state. */
  readonly path: PathNode[];
  readonly siblingStacks: SiblingLevel[];
  push(tag: string, values?: Record<string, unknown> | null, namespace?: string | null, options?: PushOptions | null): void;
  pop(): PathNode | undefined;
  updateCurrent(values: Record<string, unknown> | null): void;
  reset(): void;
  snapshot(): MatcherSnapshot;
  restore(snapshot: MatcherSnapshot): void;
  readOnly(): MatcherView;
  getCurrentTag(): string | undefined;
  getCurrentNamespace(): string | undefined;
  getAttrValue(name: string): unknown;
  hasAttr(name: string): boolean;
  getAnyParentAttr(name: string): unknown;
  hasAnyParentAttr(name: string): boolean;
  getPosition(): number;
  getCounter(): number;
  /** @deprecated Use getPosition() or getCounter(). */
  getIndex(): number;
  getDepth(): number;
  toString(separator?: string, includeNamespace?: boolean): string;
  toArray(): string[];
  matches(expression: Expression): boolean;
  matchesAny(set: ExpressionSet): boolean;
}
export class ExpressionSet<T = unknown> {
  readonly size: number;
  readonly isSealed: boolean;
  add(expression: Expression<T>): this;
  addAll(expressions: readonly Expression<T>[]): this;
  has(expression: Expression<T>): boolean;
  seal(): this;
  matchesAny(matcher: Matcher | MatcherView): boolean;
  /** Exact bucket, wildcard bucket, deep-tag bucket, then deep fallback; insertion order within each bucket. */
  findMatch(matcher: Matcher | MatcherView): Expression<T> | null;
}
declare const api: {Expression: typeof Expression; Matcher: typeof Matcher; MatcherView: typeof MatcherView; ExpressionSet: typeof ExpressionSet};
export default api;
