"use strict";
const noop = () => {};
const defaultKeyExtractor = (index) => index;
function defaultRangeExtractor({
  startIndex,
  endIndex,
  overscan,
  count,
  lanes = 1,
}) {
  const start = Math.max(0, startIndex - overscan * lanes),
    end = Math.min(count - 1, endIndex + overscan * lanes);
  return Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, i) => start + i,
  );
}
function notUndefined(value, message) {
  if (value === undefined)
    throw Error("Unexpected undefined" + (message ? ": " + message : ""));
  return value;
}
const approxEqual = (a, b) => Math.abs(a - b) < 1.01;
function debounce(win, fn, delay) {
  let timer;
  function call(...args) {
    call.cancel();
    const receiver = this;
    timer = win.setTimeout(() => {
      timer = undefined;
      fn.apply(receiver, args);
    }, delay);
  }
  call.cancel = () => {
    if (timer !== undefined) win.clearTimeout(timer);
    timer = undefined;
  };
  return call;
}
function memo(dependencies, compute, options = {}) {
  let previous = options.initialDeps,
    result,
    first = true;
  const read = () => {
    const next = dependencies();
    if (
      !previous ||
      next.length !== previous.length ||
      next.some((x, i) => x !== previous[i])
    ) {
      result = compute(...next);
      previous = next.slice();
      if (!first || !options.skipInitialOnChange) options.onChange?.(result);
      first = false;
    }
    return result;
  };
  read.updateDeps = (next) => {
    previous = next.slice();
  };
  return read;
}
function owner(element) {
  return (
    element?.ownerDocument?.defaultView ||
    (element?.window === element ? element : null)
  );
}
function measureElement(element, entry, instance) {
  const box = entry?.borderBoxSize,
    size = box && (Array.isArray(box) ? box[0] : box);
  const key = instance.options.getItemKey(instance.indexFromElement(element));
  const cached = instance.itemSizeCache.get(key);
  if (instance.options.useCachedMeasurements)
    return (
      cached ??
      instance.options.estimateSize(instance.indexFromElement(element))
    );
  if (!entry && cached !== undefined) return cached;
  return size
    ? Math.round(size[instance.options.horizontal ? "inlineSize" : "blockSize"])
    : element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
}
function observeElementRect(instance, callback) {
  const element = instance.scrollElement,
    win = instance.targetWindow || owner(element);
  if (!element || !win) return;
  let live = true,
    frame;
  const report = () => {
    if (live)
      callback({ width: element.clientWidth, height: element.clientHeight });
  };
  report();
  const observer =
    win.ResizeObserver &&
    new win.ResizeObserver(() => {
      if (!live) return;
      if (instance.options.useAnimationFrameWithResizeObserver) {
        if (frame === undefined)
          frame = win.requestAnimationFrame(() => {
            frame = undefined;
            report();
          });
      } else report();
    });
  observer?.observe(element, { box: "border-box" });
  if (!observer) win.addEventListener("resize", report);
  return () => {
    live = false;
    observer?.disconnect();
    win.removeEventListener("resize", report);
    if (frame !== undefined) win.cancelAnimationFrame(frame);
  };
}
function observeWindowRect(instance, callback) {
  const win = instance.scrollElement;
  if (!win) return;
  const report = () =>
    callback({ width: win.innerWidth, height: win.innerHeight });
  report();
  win.addEventListener("resize", report, { passive: true });
  return () => win.removeEventListener("resize", report);
}
function observeOffset(instance, callback, isWindow) {
  const element = instance.scrollElement,
    win = instance.targetWindow || owner(element);
  if (!element || !win) return;
  let live = true;
  const offset = () =>
    (isWindow
      ? element[instance.options.horizontal ? "scrollX" : "scrollY"]
      : element[instance.options.horizontal ? "scrollLeft" : "scrollTop"]) *
    (instance.options.horizontal && instance.options.isRtl && !isWindow
      ? -1
      : 1);
  const end = () => {
    if (live) callback(offset(), false);
  };
  const settle = debounce(win, end, instance.options.isScrollingResetDelay);
  const nativeEnd =
    instance.options.useScrollendEvent && "onscrollend" in element;
  const scroll = () => {
    if (live) {
      callback(offset(), true);
      if (!nativeEnd) settle();
    }
  };
  element.addEventListener("scroll", scroll, { passive: true });
  if (nativeEnd) element.addEventListener("scrollend", end, { passive: true });
  return () => {
    live = false;
    settle.cancel();
    element.removeEventListener("scroll", scroll);
    element.removeEventListener("scrollend", end);
  };
}
const observeElementOffset = (instance, callback) =>
  observeOffset(instance, callback, false);
const observeWindowOffset = (instance, callback) =>
  observeOffset(instance, callback, true);
function elementScroll(offset, { adjustments = 0, behavior } = {}, instance) {
  const horizontal = instance.options.horizontal;
  instance.scrollElement?.scrollTo({
    [horizontal ? "left" : "top"]:
      (offset + adjustments) *
      (horizontal &&
      instance.options.isRtl &&
      instance.scrollElement?.ownerDocument
        ? -1
        : 1),
    behavior,
  });
}
const windowScroll = elementScroll;
const defaults = {
  debug: false,
  enabled: true,
  initialRect: { width: 0, height: 0 },
  initialOffset: 0,
  overscan: 1,
  horizontal: false,
  paddingStart: 0,
  paddingEnd: 0,
  scrollPaddingStart: 0,
  scrollPaddingEnd: 0,
  scrollMargin: 0,
  gap: 0,
  lanes: 1,
  anchorTo: "start",
  followOnAppend: false,
  scrollEndThreshold: 1,
  laneAssignmentMode: "estimate",
  useCachedMeasurements: false,
  isRtl: false,
  isScrollingResetDelay: 150,
  useScrollendEvent: false,
  useAnimationFrameWithResizeObserver: false,
  indexAttribute: "data-index",
  initialMeasurementsCache: [],
  getItemKey: defaultKeyExtractor,
  rangeExtractor: defaultRangeExtractor,
  measureElement,
  onChange: noop,
};
function nonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(name + " must be finite and nonnegative");
  return value;
}
class Virtualizer {
  constructor(options) {
    this.scrollElement =
      this.targetWindow =
      this.scrollRect =
      this.scrollOffset =
      this.scrollDirection =
      this.range =
        null;
    this.isScrolling = false;
    this.itemSizeCache = new Map();
    this.elementsCache = new Map();
    this._starts = new Float64Array(0);
    this._sizes = new Float64Array(0);
    this._keys = [];
    this._count = 0;
    this._dirty = 0;
    this._generation = 0;
    this._objects = new Map();
    this._unsubs = [];
    this._epoch = 0;
    this._frames = new Set();
    this._observer = null;
    this._indexDeps = [];
    this._indexes = [];
    this._items = [];
    this._itemsGeneration = -1;
    this._notified = [];
    this._command = null;
    this._commandFrame = null;
    // Stable bound callbacks are safe as React refs and adapter lifecycle hooks.
    for (const name of [
      "setOptions",
      "_didMount",
      "_willUpdate",
      "calculateRange",
      "getVirtualIndexes",
      "indexFromElement",
      "measureElement",
      "resizeItem",
      "getVirtualItems",
      "getVirtualItemForOffset",
      "getOffsetForAlignment",
      "getOffsetForIndex",
      "scrollToOffset",
      "scrollToIndex",
      "scrollBy",
      "scrollToEnd",
      "cancelScroll",
      "getTotalSize",
      "takeSnapshot",
      "getDistanceFromEnd",
      "isAtEnd",
      "measure",
    ])
      this[name] = this[name].bind(this);
    this.setOptions(options);
    for (const item of this.options.initialMeasurementsCache)
      this.itemSizeCache.set(
        item.key,
        nonnegative(item.size, "measurement size"),
      );
  }
  get scrollAdjustments() {
    return 0;
  }
  get measurementsCache() {
    this._ensure();
    return Array.from({ length: this._count }, (_, i) => this._item(i));
  }
  setOptions(input) {
    const next = { ...defaults };
    for (const name of Object.keys(input))
      if (input[name] !== undefined) next[name] = input[name];
    if (!Number.isSafeInteger(next.count) || next.count < 0)
      throw new RangeError("count must be a nonnegative safe integer");
    if (
      next.lanes !== 1 ||
      next.anchorTo !== "start" ||
      next.followOnAppend ||
      next.laneAssignmentMode !== "estimate"
    )
      throw new RangeError(
        "This table virtualizer supports one lane with start anchoring",
      );
    for (const name of [
      "overscan",
      "paddingStart",
      "paddingEnd",
      "scrollPaddingStart",
      "scrollPaddingEnd",
      "gap",
      "isScrollingResetDelay",
    ])
      nonnegative(next[name], name);
    if (!Number.isInteger(next.overscan))
      throw new RangeError("overscan must be an integer");
    const old = this.options;
    if (
      !old ||
      [
        "getItemKey",
        "paddingStart",
        "scrollMargin",
        "gap",
        "horizontal",
        "enabled",
      ].some((key) => old[key] !== next[key])
    )
      this._invalidate(0);
    else if (old.count !== next.count) this._invalidate(0);
    if (old && old.horizontal !== next.horizontal) this.itemSizeCache.clear();
    this.options = next;
  }
  _invalidate(from) {
    this._dirty = Math.min(this._dirty, from);
    this._generation++;
    this._objects.clear();
  }
  _ensure() {
    const opts = this.options,
      count = opts.enabled ? opts.count : 0;
    if (this._dirty >= count && this._count === count) return;
    if (this._starts.length < count) {
      const capacity = Math.max(count, this._starts.length * 2, 16),
        starts = new Float64Array(capacity),
        sizes = new Float64Array(capacity);
      starts.set(this._starts);
      sizes.set(this._sizes);
      this._starts = starts;
      this._sizes = sizes;
    }
    const from = Math.min(this._dirty, count);
    let start = from
      ? this._starts[from - 1] + this._sizes[from - 1] + opts.gap
      : opts.paddingStart + opts.scrollMargin;
    const customKeys = opts.getItemKey !== defaultKeyExtractor;
    const hasMeasuredSizes = this.itemSizeCache.size !== 0;
    for (let i = from; i < count; i++) {
      const key = customKeys ? opts.getItemKey(i) : i,
        measured = hasMeasuredSizes ? this.itemSizeCache.get(key) : undefined;
      const size =
        measured === undefined
          ? nonnegative(opts.estimateSize(i), "estimated size")
          : measured;
      if (customKeys) this._keys[i] = key;
      this._starts[i] = start;
      this._sizes[i] = size;
      start += size + opts.gap;
    }
    this._keys.length = customKeys ? count : 0;
    this._count = count;
    this._dirty = count;
  }
  _key(index) {
    return this.options.getItemKey === defaultKeyExtractor
      ? index
      : this._keys[index];
  }
  _item(index) {
    let item = this._objects.get(index);
    if (!item) {
      const start = this._starts[index],
        size = this._sizes[index];
      item = {
        index,
        key: this._key(index),
        start,
        size,
        end: start + size,
        lane: 0,
      };
      this._objects.set(index, item);
    }
    return item;
  }
  _size() {
    return this.options.enabled
      ? (this.scrollRect || this.options.initialRect)[
          this.options.horizontal ? "width" : "height"
        ]
      : 0;
  }
  _offset() {
    if (!this.options.enabled) return 0;
    return (this.scrollOffset ??=
      typeof this.options.initialOffset === "function"
        ? this.options.initialOffset()
        : this.options.initialOffset);
  }
  _floor(offset) {
    let lo = 0,
      hi = this._count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1,
        at = this._starts[mid];
      if (at === offset) return mid;
      if (at < offset) lo = mid + 1;
      else hi = mid - 1;
    }
    return Math.max(0, lo - 1);
  }
  calculateRange() {
    this._ensure();
    const size = this._size();
    if (!this._count || size <= 0) return (this.range = null);
    const offset = Math.min(
        this._offset(),
        Math.max(0, this.getTotalSize() + this.options.scrollMargin - size),
      ),
      first = this._floor(offset);
    let last = first;
    while (
      last < this._count - 1 &&
      this._starts[last] + this._sizes[last] < offset + size
    )
      last++;
    if (this.range?.startIndex !== first || this.range.endIndex !== last)
      this.range = { startIndex: first, endIndex: last };
    return this.range;
  }
  getVirtualIndexes() {
    const range = this.calculateRange(),
      opts = this.options;
    const deps = [
      range?.startIndex,
      range?.endIndex,
      opts.overscan,
      opts.count,
      opts.rangeExtractor,
    ];
    if (
      deps.some((x, i) => x !== this._indexDeps[i]) ||
      deps.length !== this._indexDeps.length
    ) {
      this._indexDeps = deps;
      this._indexes = range
        ? opts.rangeExtractor({
            ...range,
            overscan: opts.overscan,
            count: opts.count,
            lanes: 1,
          })
        : [];
    }
    return this._indexes;
  }
  getVirtualItems() {
    const indexes = this.getVirtualIndexes();
    if (
      indexes !== this._itemIndexes ||
      this._itemsGeneration !== this._generation
    ) {
      this._itemIndexes = indexes;
      this._itemsGeneration = this._generation;
      this._items = indexes
        .filter((i) => Number.isInteger(i) && i >= 0 && i < this._count)
        .map((i) => this._item(i));
    }
    return this._items;
  }
  getVirtualItemForOffset(offset) {
    this._ensure();
    return this._count ? this._item(this._floor(offset)) : undefined;
  }
  getTotalSize() {
    this._ensure();
    const n = this._count;
    return Math.max(
      0,
      (n
        ? this._starts[n - 1] + this._sizes[n - 1]
        : this.options.paddingStart) -
        this.options.scrollMargin +
        this.options.paddingEnd,
    );
  }
  _notify(force = false) {
    const range = this.calculateRange(),
      next = [this.isScrolling, range?.startIndex, range?.endIndex];
    if (
      force ||
      next.some((x, i) => x !== this._notified[i]) ||
      !this._notified.length
    ) {
      this._notified = next;
      this.options.onChange(this, force ? false : this.isScrolling);
    }
  }
  _cleanup() {
    this._epoch++;
    this.cancelScroll();
    this._binding = null;
    for (const stop of this._unsubs.splice(0)) stop?.();
    this._observer?.disconnect();
    this._observer = null;
    for (const id of this._frames) this.targetWindow?.cancelAnimationFrame(id);
    this._frames.clear();
    this.scrollElement = this.targetWindow = null;
  }
  _didMount() {
    return () => {
      this._cleanup();
      this.elementsCache.clear();
    };
  }
  _willUpdate() {
    const element = this.options.enabled
      ? this.options.getScrollElement()
      : null;
    const binding = [
      element,
      this.options.horizontal,
      this.options.isRtl,
      this.options.observeElementRect,
      this.options.observeElementOffset,
      this.options.useScrollendEvent,
      this.options.isScrollingResetDelay,
    ];
    if (this._binding && binding.every((x, i) => x === this._binding[i]))
      return;
    const offset = this._offset();
    this._cleanup();
    this._binding = binding;
    if (!element) {
      this.scrollRect = null;
      this.scrollOffset = null;
      this.isScrolling = false;
      this.scrollDirection = null;
      this._notify();
      return;
    }
    this.scrollElement = element;
    this.targetWindow = owner(element);
    const epoch = this._epoch;
    const alive = () => epoch === this._epoch;
    this._unsubs.push(
      this.options.observeElementRect(this, (rect) => {
        if (alive()) {
          this.scrollRect = rect;
          this._notify();
        }
      }),
    );
    this._unsubs.push(
      this.options.observeElementOffset(this, (position, scrolling) => {
        if (!alive()) return;
        const before = this._offset();
        this.scrollDirection = scrolling
          ? position > before
            ? "forward"
            : "backward"
          : null;
        this.scrollOffset = position;
        this.isScrolling = scrolling;
        this._notify();
      }),
    );
    const win = this.targetWindow;
    if (win?.ResizeObserver) {
      this._observer = new win.ResizeObserver((entries) => {
        if (!alive()) return;
        const apply = () => {
          if (!alive()) return;
          for (const entry of entries) this._readElement(entry.target, entry);
        };
        if (this.options.useAnimationFrameWithResizeObserver) {
          const id = win.requestAnimationFrame(() => {
            this._frames.delete(id);
            apply();
          });
          this._frames.add(id);
        } else apply();
      });
      for (const node of this.elementsCache.values())
        if (node.ownerDocument?.defaultView === win)
          this._observer.observe(node, { box: "border-box" });
    }
    const interrupt = () => this.cancelScroll();
    element.addEventListener?.("wheel", interrupt, { passive: true });
    element.addEventListener?.("touchstart", interrupt, { passive: true });
    this._unsubs.push(() => {
      element.removeEventListener?.("wheel", interrupt);
      element.removeEventListener?.("touchstart", interrupt);
    });
    this.options.scrollToFn(
      offset,
      { adjustments: 0, behavior: undefined },
      this,
    );
  }
  indexFromElement(node) {
    const value = node.getAttribute(this.options.indexAttribute);
    return value !== null && /^\d+$/.test(value) ? Number(value) : -1;
  }
  _readElement(node, entry) {
    const index = this.indexFromElement(node);
    this._ensure();
    if (
      index < 0 ||
      index >= this._count ||
      this.elementsCache.get(this._key(index)) !== node ||
      !node.isConnected
    )
      return;
    this.resizeItem(index, this.options.measureElement(node, entry, this));
  }
  measureElement(node) {
    if (!node) {
      for (const [key, element] of this.elementsCache)
        if (!element.isConnected) {
          this._observer?.unobserve(element);
          this.elementsCache.delete(key);
        }
      return;
    }
    const index = this.indexFromElement(node);
    this._ensure();
    if (index < 0 || index >= this._count) return;
    const key = this._key(index),
      previous = this.elementsCache.get(key);
    if (previous !== node) {
      if (previous) this._observer?.unobserve(previous);
      this.elementsCache.set(key, node);
      this._observer?.observe(node, { box: "border-box" });
    }
    if (!this.options.useCachedMeasurements || !this.itemSizeCache.has(key))
      this._readElement(node);
  }
  resizeItem(index, size) {
    nonnegative(size, "measurement size");
    this._ensure();
    if (index < 0 || index >= this._count || !Number.isInteger(index)) return;
    const item = this._item(index),
      delta = size - item.size;
    if (!delta) return;
    this.itemSizeCache.set(item.key, size);
    const adjust = this.shouldAdjustScrollPositionOnItemSizeChange
      ? this.shouldAdjustScrollPositionOnItemSizeChange(item, delta, this)
      : item.start < this._offset();
    this._invalidate(index);
    if (adjust) {
      this.scrollOffset = Math.max(0, this._offset() + delta);
      this.options.scrollToFn(
        this.scrollOffset,
        { adjustments: 0, behavior: "auto" },
        this,
      );
    }
    this._notify(true);
    if (this._command) this._reconcile();
  }
  measure() {
    this.itemSizeCache.clear();
    this._invalidate(0);
    this._notify(true);
  }
  takeSnapshot() {
    this._ensure();
    const result = [];
    for (let i = 0; i < this._count; i++)
      if (this.itemSizeCache.has(this._key(i)))
        result.push({ ...this._item(i) });
    return result;
  }
  _max() {
    const element = this.scrollElement;
    if (!element) return 0;
    const windowMode = element.window === element,
      scroll = windowMode ? element.document.documentElement : element;
    return Math.max(
      0,
      scroll[this.options.horizontal ? "scrollWidth" : "scrollHeight"] -
        this._size(),
    );
  }
  getDistanceFromEnd() {
    return Math.max(0, this._max() - this._offset());
  }
  isAtEnd(threshold = this.options.scrollEndThreshold) {
    return this.getDistanceFromEnd() <= threshold;
  }
  getOffsetForAlignment(offset, align, itemSize = 0) {
    const size = this._size();
    if (align === "auto")
      align = offset >= this._offset() + size ? "end" : "start";
    if (align === "center") offset -= (size - itemSize) / 2;
    if (align === "end") offset -= size;
    return Math.max(0, Math.min(this._max(), offset));
  }
  getOffsetForIndex(index, align = "auto") {
    this._ensure();
    if (!this._count) return;
    index = Math.max(0, Math.min(this._count - 1, Math.trunc(index)));
    const item = this._item(index),
      offset = this._offset(),
      size = this._size();
    if (align === "auto") {
      if (item.end >= offset + size - this.options.scrollPaddingEnd)
        align = "end";
      else if (item.start <= offset + this.options.scrollPaddingStart)
        align = "start";
      else return [offset, "auto"];
    }
    if (align === "end" && index === this._count - 1)
      return [
        Math.max(
          0,
          Math.min(
            this._max(),
            this._max() -
              this.options.paddingEnd +
              this.options.scrollPaddingEnd,
          ),
        ),
        align,
      ];
    const target =
      align === "end"
        ? item.end + this.options.scrollPaddingEnd
        : item.start - this.options.scrollPaddingStart;
    return [this.getOffsetForAlignment(target, align, item.size), align];
  }
  scrollToOffset(offset, { align = "start", behavior = "auto" } = {}) {
    this.cancelScroll();
    this.options.scrollToFn(
      this.getOffsetForAlignment(offset, align),
      { behavior },
      this,
    );
  }
  scrollBy(delta, { behavior = "auto" } = {}) {
    this.scrollToOffset(this._offset() + delta, { behavior });
  }
  scrollToEnd({ behavior = "auto" } = {}) {
    this.scrollToOffset(this._max(), { behavior });
  }
  scrollToIndex(index, { align = "auto", behavior = "auto" } = {}) {
    this.cancelScroll();
    const target = this.getOffsetForIndex(index, align);
    if (!target) return;
    this.options.scrollToFn(target[0], { behavior }, this);
    if (this.targetWindow && this.elementsCache.size) {
      this._command = {
        index,
        align: target[1],
        behavior,
        attempts: 0,
        target: target[0],
      };
      this._reconcile();
    }
  }
  _reconcile() {
    if (this._commandFrame !== null || !this.targetWindow || !this._command)
      return;
    this._commandFrame = this.targetWindow.requestAnimationFrame(() => {
      this._commandFrame = null;
      const command = this._command;
      if (!command) return;
      const target = this.getOffsetForIndex(command.index, command.align);
      if (!target || ++command.attempts > 60) {
        this.cancelScroll();
        return;
      }
      if (Math.abs(target[0] - command.target) > 1) {
        command.target = target[0];
        this.options.scrollToFn(
          target[0],
          { behavior: command.behavior },
          this,
        );
      }
      if (approxEqual(this._offset(), target[0])) this.cancelScroll();
      else this._reconcile();
    });
  }
  cancelScroll() {
    if (this._commandFrame !== null)
      this.targetWindow?.cancelAnimationFrame(this._commandFrame);
    this._commandFrame = null;
    this._command = null;
  }
}
module.exports = {
  Virtualizer,
  defaultKeyExtractor,
  defaultRangeExtractor,
  measureElement,
  observeElementRect,
  observeElementOffset,
  observeWindowRect,
  observeWindowOffset,
  elementScroll,
  windowScroll,
  notUndefined,
  approxEqual,
  memo,
  debounce,
};
