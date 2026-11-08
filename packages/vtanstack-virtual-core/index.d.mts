export type Key = string | number | bigint;
export type ScrollAlignment = "start" | "center" | "end" | "auto";
export type ScrollBehavior = "auto" | "smooth" | "instant";
export interface ScrollToOptions {
  align?: ScrollAlignment;
  behavior?: ScrollBehavior;
}
export interface Rect {
  width: number;
  height: number;
}
export interface Range {
  startIndex: number;
  endIndex: number;
  overscan: number;
  count: number;
  lanes?: number;
}
export interface VirtualItem {
  key: Key;
  index: number;
  start: number;
  end: number;
  size: number;
  lane: number;
}
export type PartialKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
export type NoInfer<T> = [T][T extends unknown ? 0 : never];
export interface VirtualizerOptions<
  S extends Element | Window,
  E extends Element,
> {
  count: number;
  getScrollElement: () => S | null;
  estimateSize: (index: number) => number;
  scrollToFn: (
    offset: number,
    options: { adjustments?: number; behavior?: ScrollBehavior },
    instance: Virtualizer<S, E>,
  ) => void;
  observeElementRect: (
    instance: Virtualizer<S, E>,
    callback: (rect: Rect) => void,
  ) => void | (() => void);
  observeElementOffset: (
    instance: Virtualizer<S, E>,
    callback: (offset: number, isScrolling: boolean) => void,
  ) => void | (() => void);
  initialRect?: Rect;
  initialOffset?: number | (() => number);
  initialMeasurementsCache?: VirtualItem[];
  onChange?: (instance: Virtualizer<S, E>, sync: boolean) => void;
  measureElement?: (
    element: E,
    entry: ResizeObserverEntry | undefined,
    instance: Virtualizer<S, E>,
  ) => number;
  getItemKey?: (index: number) => Key;
  rangeExtractor?: (range: Range) => number[];
  overscan?: number;
  horizontal?: boolean;
  enabled?: boolean;
  debug?: boolean;
  isRtl?: boolean;
  paddingStart?: number;
  paddingEnd?: number;
  scrollPaddingStart?: number;
  scrollPaddingEnd?: number;
  scrollMargin?: number;
  gap?: number;
  indexAttribute?: string;
  isScrollingResetDelay?: number;
  useScrollendEvent?: boolean;
  useAnimationFrameWithResizeObserver?: boolean;
  useCachedMeasurements?: boolean;
  scrollEndThreshold?: number;
  /** Single-lane tables only; masonry and end-anchored feeds are unsupported. */
  lanes?: 1;
  anchorTo?: "start";
  followOnAppend?: false;
  laneAssignmentMode?: "estimate";
}
export class Virtualizer<
  S extends Element | Window = Element,
  E extends Element = Element,
> {
  constructor(options: VirtualizerOptions<S, E>);
  options: Required<VirtualizerOptions<S, E>>;
  scrollElement: S | null;
  targetWindow: (Window & typeof globalThis) | null;
  scrollRect: Rect | null;
  scrollOffset: number | null;
  isScrolling: boolean;
  scrollDirection: "forward" | "backward" | null;
  readonly scrollAdjustments: number;
  range: { startIndex: number; endIndex: number } | null;
  readonly measurementsCache: VirtualItem[];
  itemSizeCache: Map<Key, number>;
  elementsCache: Map<Key, E>;
  shouldAdjustScrollPositionOnItemSizeChange?: (
    item: VirtualItem,
    delta: number,
    instance: Virtualizer<S, E>,
  ) => boolean;
  setOptions(options: VirtualizerOptions<S, E>): void;
  _didMount(): () => void;
  _willUpdate(): void;
  calculateRange(): { startIndex: number; endIndex: number } | null;
  getVirtualIndexes(): number[];
  getVirtualItems(): VirtualItem[];
  getVirtualItemForOffset(offset: number): VirtualItem | undefined;
  indexFromElement(element: E): number;
  measureElement(element: E | null | undefined): void;
  resizeItem(index: number, size: number): void;
  measure(): void;
  getTotalSize(): number;
  takeSnapshot(): VirtualItem[];
  getOffsetForAlignment(
    offset: number,
    alignment: ScrollAlignment,
    itemSize?: number,
  ): number;
  getOffsetForIndex(
    index: number,
    alignment?: ScrollAlignment,
  ): readonly [number, ScrollAlignment] | undefined;
  scrollToOffset(offset: number, options?: ScrollToOptions): void;
  scrollToIndex(index: number, options?: ScrollToOptions): void;
  scrollBy(delta: number, options?: Pick<ScrollToOptions, "behavior">): void;
  scrollToEnd(options?: Pick<ScrollToOptions, "behavior">): void;
  cancelScroll(): void;
  getDistanceFromEnd(): number;
  isAtEnd(threshold?: number): boolean;
}
export function defaultKeyExtractor(index: number): number;
export function defaultRangeExtractor(range: Range): number[];
export function measureElement<E extends Element>(
  element: E,
  entry: ResizeObserverEntry | undefined,
  instance: Virtualizer<any, E>,
): number;
export function observeElementRect<S extends Element>(
  instance: Virtualizer<S, any>,
  callback: (rect: Rect) => void,
): (() => void) | undefined;
export function observeWindowRect(
  instance: Virtualizer<Window, any>,
  callback: (rect: Rect) => void,
): (() => void) | undefined;
export function observeElementOffset<S extends Element>(
  instance: Virtualizer<S, any>,
  callback: (offset: number, scrolling: boolean) => void,
): (() => void) | undefined;
export function observeWindowOffset(
  instance: Virtualizer<Window, any>,
  callback: (offset: number, scrolling: boolean) => void,
): (() => void) | undefined;
export function elementScroll<S extends Element>(
  offset: number,
  options: { adjustments?: number; behavior?: ScrollBehavior },
  instance: Virtualizer<S, any>,
): void;
export function windowScroll(
  offset: number,
  options: { adjustments?: number; behavior?: ScrollBehavior },
  instance: Virtualizer<Window, any>,
): void;
export function notUndefined<T>(value: T | undefined, message?: string): T;
export function approxEqual(a: number, b: number): boolean;
export function debounce<A extends unknown[], R>(
  window: Window & typeof globalThis,
  callback: (...args: A) => R,
  delay: number,
): ((...args: A) => void) & { cancel(): void };
export function memo<D extends readonly unknown[], R>(
  dependencies: () => D,
  compute: (...args: NoInfer<[...D]>) => R,
  options?: {
    key?: string | false;
    debug?: () => boolean;
    onChange?: (result: R) => void;
    initialDeps?: D;
    skipInitialOnChange?: boolean;
  },
): (() => R) & { updateDeps(dependencies: D): void };
