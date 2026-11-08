export * from "vtanstack-virtual-core";
import type {
  Virtualizer,
  VirtualizerOptions,
  PartialKeys,
} from "vtanstack-virtual-core";
export type ReactVirtualizer<
  S extends Element | Window,
  E extends Element,
> = Virtualizer<S, E> & {
  /** Safe no-op in React-rendered mode; React owns item/container styles. */
  containerRef: (element: HTMLElement | null) => void;
};
export type ReactVirtualizerOptions<
  S extends Element | Window,
  E extends Element,
> = VirtualizerOptions<S, E> & {
  useFlushSync?: boolean;
  /** Direct DOM positioning is outside this adapter's table scope. */
  directDomUpdates?: false;
  directDomUpdatesMode?: "position" | "transform";
};
export function useVirtualizer<S extends Element, E extends Element>(
  options: PartialKeys<
    ReactVirtualizerOptions<S, E>,
    "observeElementRect" | "observeElementOffset" | "scrollToFn"
  >,
): ReactVirtualizer<S, E>;
export function useWindowVirtualizer<E extends Element>(
  options: PartialKeys<
    ReactVirtualizerOptions<Window, E>,
    | "getScrollElement"
    | "observeElementRect"
    | "observeElementOffset"
    | "scrollToFn"
  >,
): ReactVirtualizer<Window, E>;
