import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useMRT_RowVirtualizer } from "./node_modules/.vpm-virtual/src/hooks/useMRT_RowVirtualizer.ts";
import { useMRT_ColumnVirtualizer } from "./node_modules/.vpm-virtual/src/hooks/useMRT_ColumnVirtualizer.ts";
import * as core from "@tanstack/virtual-core";
const e = React.createElement,
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (condition, message) => {
  if (!condition) throw Error(message);
};
export default function setup(variant) {
  (window.virtualCases ??= {})[variant] = async () => {
    const results = [];
    for (const framed of [false, true]) {
      const frame = framed ? document.createElement("iframe") : null;
      if (frame) {
        document.body.append(frame);
        frame.contentDocument.write("<!doctype html><body></body>");
        frame.contentDocument.close();
      }
      const doc = frame?.contentDocument || document,
        win = doc.defaultView,
        host = doc.createElement("div"),
        viewport = doc.createElement("div");
      doc.body.append(host);
      host.append(viewport);
      viewport.style.cssText =
        "height:240px;width:460px;overflow:auto;position:relative;overflow-anchor:none;scrollbar-width:none";
      const mount = doc.createElement("div");
      viewport.append(mount);
      const original = win.ResizeObserver,
        observers = new Set();
      win.ResizeObserver = class extends original {
        constructor(fn) {
          super(fn);
          this.targets = new Set();
          observers.add(this);
        }
        observe(n, o) {
          this.targets.add(n);
          super.observe(n, o);
        }
        unobserve(n) {
          this.targets.delete(n);
          super.unobserve(n);
        }
        disconnect() {
          this.targets.clear();
          super.disconnect();
        }
      };
      let count = 200,
        density = "compact",
        expanded = false,
        draggingRow,
        draggingColumn,
        pinning = { left: [], right: [] },
        row,
        col,
        changes = 0;
      const allColumns = Array.from({ length: 30 }, (_, i) => ({
        id: "c" + i,
        getSize: () => 80 + (i % 4) * 10,
        getPinnedIndex: () => (i === 0 ? 0 : 0),
      }));
      const heights = new Map(),
        ref = { current: viewport };
      const table = {
        getState: () => ({
          density,
          expanded,
          draggingRow,
          draggingColumn,
          columnPinning: pinning,
          columnVisibility: {},
        }),
        getRowModel: () => ({
          rows: Array.from({ length: count }, (_, i) => ({ id: "r" + i })),
        }),
        getVisibleLeafColumns: () => allColumns,
        getLeftVisibleLeafColumns: () =>
          pinning.left.length ? [allColumns[0]] : [],
        getRightVisibleLeafColumns: () =>
          pinning.right.length ? [allColumns.at(-1)] : [],
        refs: { tableContainerRef: ref },
        options: {
          enableRowVirtualization: true,
          enableColumnVirtualization: true,
          enableColumnPinning: true,
          rowVirtualizerOptions: { onChange: () => changes++ },
          columnVirtualizerOptions: { onChange: () => changes++ },
        },
      };
      function App() {
        table.options.renderDetailPanel = expanded ? () => null : undefined;
        row = useMRT_RowVirtualizer(table);
        col = useMRT_ColumnVirtualizer(table);
        const normal = density === "compact" ? 37 : 58;
        return e(
          "div",
          {
            style: {
              height: row.getTotalSize(),
              width: col.getTotalSize(),
              position: "relative",
            },
          },
          e(
            "div",
            { style: { position: "sticky", top: 0, height: 0, zIndex: 1 } },
            col.getVirtualItems().map((item) =>
              e(
                "div",
                {
                  key: item.key,
                  "data-index": item.index,
                  ref: col.measureElement,
                  style: {
                    position: "absolute",
                    left: item.start,
                    width: allColumns[item.index].getSize(),
                    height: 20,
                    boxSizing: "border-box",
                    background: "#eee",
                  },
                },
                "C" + item.index,
              ),
            ),
          ),
          row.getVirtualItems().map((item) =>
            e(
              "div",
              {
                key: item.key,
                "data-index": item.index,
                "data-row": item.index,
                ref: row.measureElement,
                style: {
                  position: "absolute",
                  top: item.start,
                  width: col.getTotalSize(),
                  height:
                    heights.get(item.index) ??
                    (expanded && item.index % 2 ? 85 : normal),
                  boxSizing: "border-box",
                },
              },
              e("button", null, "R" + item.index),
            ),
          ),
        );
      }
      const root = createRoot(mount),
        render = () => flushSync(() => root.render(e(App)));
      const settle = async () => {
        await wait(200);
        await new Promise((r) =>
          win.requestAnimationFrame(() => win.requestAnimationFrame(r)),
        );
      };
      const snap = (label) =>
        results.push({
          label,
          framed,
          rows: row.getVirtualItems().map((x) => [x.index, x.start, x.size]),
          cols: col.getVirtualItems().map((x) => [x.index, x.start, x.size]),
          padding: [col.virtualPaddingLeft, col.virtualPaddingRight],
          total: [row.getTotalSize(), col.getTotalSize()],
          scroll: [viewport.scrollTop, viewport.scrollLeft],
        });
      try {
        render();
        await settle();
        snap("initial");
        viewport.scrollTo({ top: 740, left: 600 });
        await settle();
        snap("scroll");
        const focus = mount.querySelector('[data-row="22"] button');
        focus.focus();
        render();
        await settle();
        check(doc.activeElement === focus, "focus survives unchanged render");
        snap("rerender");
        draggingRow = { id: "r0" };
        draggingColumn = { id: "c0" };
        pinning = { left: ["c0"], right: ["c29"] };
        render();
        await settle();
        snap("pinned-dragged");
        check(
          row.getVirtualItems().some((x) => x.index === 0),
          "dragged row retained",
        );
        check(
          col.getVirtualItems().at(-1).index === 29,
          "pinned column retained",
        );
        heights.set(22, 80);
        render();
        await settle();
        snap("resize-visible");
        row.scrollToIndex(70, { align: "center" });
        await settle();
        snap("scroll-index");
        col.scrollToIndex(20, { align: "end" });
        await settle();
        snap("column-index");
        draggingRow = undefined;
        draggingColumn = undefined;
        expanded = true;
        render();
        await settle();
        snap("detail-panels");
        row.scrollToOffset(0);
        await settle();
        expanded = false;
        density = "comfortable";
        heights.clear();
        render();
        row.measure();
        await settle();
        snap("density");
        count = 7;
        render();
        await settle();
        snap("filter");
        // Real ResizeObserver delivery and all observers belong to the iframe too.
        check(
          row.targetWindow === win && col.targetWindow === win,
          "owner-window instance",
        );
        root.unmount();
        const before = changes;
        viewport.scrollTop = 0;
        viewport.dispatchEvent(new win.Event("scroll"));
        await settle();
        check(changes === before, "no callback after unmount");
        check(
          [...observers].every((x) => x.targets.size === 0),
          "all observers released",
        );
        results.push({ label: "cleanup", framed });
      } finally {
        win.ResizeObserver = original;
        host.remove();
        frame?.remove();
      }
    }
    // Current viewport sizing excludes border and scrollbars.
    const element = document.createElement("div");
    element.style.cssText =
      "width:100px;height:80px;border:7px solid;overflow:scroll";
    document.body.append(element);
    const instance = new core.Virtualizer({
      count: 10,
      estimateSize: () => 20,
      getScrollElement: () => element,
      observeElementRect: core.observeElementRect,
      observeElementOffset: core.observeElementOffset,
      scrollToFn: core.elementScroll,
    });
    const cleanup = instance._didMount();
    instance._willUpdate();
    await wait(50);
    const actual = instance.scrollRect, expected = {width:element.clientWidth,height:element.clientHeight};
    cleanup();
    element.remove();
    results.push({ label: "viewport", actual, expected });
    const frame = document.createElement("iframe");
    frame.style.cssText = "height:180px;width:400px";
    document.body.append(frame);
    const doc = frame.contentDocument;
    doc.write(
      '<!doctype html><body style="margin:0"><div style="height:2000px"></div></body>',
    );
    doc.close();
    const win = frame.contentWindow;
    const windowList = new core.Virtualizer({
      count: 100,
      estimateSize: () => 20,
      getScrollElement: () => win,
      observeElementRect: core.observeWindowRect,
      observeElementOffset: core.observeWindowOffset,
      scrollToFn: core.windowScroll,
    });
    const stop = windowList._didMount();
    windowList._willUpdate();
    windowList.scrollToIndex(50, { align: "start" });
    await wait(200);
    results.push({
      label: "window-scroll",
      offset: win.scrollY,
      rows: windowList.getVirtualItems().map((x) => x.index),
    });
    stop();
    frame.remove();
    return results;
  };
}
