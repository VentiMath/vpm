import {
  useVirtualizer,
  useWindowVirtualizer,
  Virtualizer,
  defaultRangeExtractor,
  type ReactVirtualizer,
} from "vtanstack-react-virtual";
export function useRows() {
  const rows = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: 1000,
    getScrollElement: () => document.querySelector("div"),
    estimateSize: () => 37,
    useFlushSync: false,
    onChange(instance, sync) {
      const offset: number | null = instance.scrollOffset;
      void [offset, sync];
    },
  });
  rows.measureElement(document.querySelector("tr"));
  rows.containerRef(document.querySelector("div"));
  rows.scrollToIndex(10, { align: "center" });
  const typed: ReactVirtualizer<HTMLDivElement, HTMLTableRowElement> = rows;
  return typed;
}
export function useWindowRows() {
  return useWindowVirtualizer<HTMLDivElement>({
    count: 20,
    estimateSize: () => 40,
  });
}
export function unsupported() {
  useVirtualizer({
    count: 0,
    getScrollElement: () => null,
    estimateSize: () => 20,
    // @ts-expect-error direct DOM updates are excluded from this contract
    directDomUpdates: true,
  });
}
void [Virtualizer, defaultRangeExtractor];
