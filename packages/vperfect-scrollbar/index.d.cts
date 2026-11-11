export interface Options {
  handlers?: ("click-rail" | "drag-thumb" | "keyboard" | "wheel")[];
  wheelSpeed?: number;
  wheelPropagation?: boolean;
  useBothWheelAxes?: boolean;
  minScrollbarLength?: number | null;
  maxScrollbarLength?: number | null;
  scrollingThreshold?: number;
  scrollXMarginOffset?: number;
  scrollYMarginOffset?: number;
  suppressScrollX?: boolean;
  suppressScrollY?: boolean;
  /** VentiMath disables custom scrollbars on touch/mobile devices. */
  swipeEasing?: never;
}
export default class PerfectScrollbar {
  constructor(element: string | HTMLElement, options?: Options);
  update(): void;
  destroy(): void;
  readonly element: HTMLElement;
  readonly isAlive: boolean;
  readonly isRtl: boolean;
  readonly isNegativeScroll: boolean;
  readonly negativeScrollAdjustment: number;
  readonly settings: Readonly<Options>;
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly scrollbarX: HTMLElement;
  readonly scrollbarY: HTMLElement;
  readonly scrollbarXRail: HTMLElement;
  readonly scrollbarYRail: HTMLElement;
  readonly scrollbarXActive: boolean;
  readonly scrollbarYActive: boolean;
  readonly scrollbarXWidth: number;
  readonly scrollbarYHeight: number;
  readonly scrollbarXLeft: number;
  readonly scrollbarYTop: number;
  readonly lastScrollLeft: number;
  readonly lastScrollTop: number;
  readonly reach: { x: "start" | "end" | null; y: "start" | "end" | null };
}
export namespace PerfectScrollbar {
  export type Options = import("./index.mjs").Options;
}
