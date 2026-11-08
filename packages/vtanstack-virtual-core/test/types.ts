import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
  type VirtualizerOptions,
  memo,
} from "vtanstack-virtual-core";
const opts: VirtualizerOptions<HTMLDivElement, HTMLTableRowElement> = {
  count: 500,
  getScrollElement: () => document.querySelector("div"),
  estimateSize: () => 37,
  observeElementRect,
  observeElementOffset,
  scrollToFn: elementScroll,
};
const rows = new Virtualizer(opts);
rows.measureElement(document.querySelector("tr"));
rows.resizeItem(0, 47);
rows.scrollToIndex(45, { align: "center", behavior: "smooth" });
const total: number = rows.getTotalSize();
const key: string | number | bigint = rows.getVirtualItems()[0]!.key;
rows.shouldAdjustScrollPositionOnItemSizeChange = (item, delta, instance) =>
  item.start < instance.scrollOffset! && delta !== 0;
const read = memo(
  () => [total] as const,
  (n) => n + 1,
);
const answer: number = read();
// @ts-expect-error masonry is intentionally not in the table-only contract
rows.setOptions({ ...opts, lanes: 2 });
void [key, answer];
