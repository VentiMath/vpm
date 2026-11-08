import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { renderToString } from "react-dom/server.browser";
import * as api from "@tanstack/react-table";
import { createAtom } from "@tanstack/store";
const h = React.createElement,
  wait = () => new Promise((r) => setTimeout(r, 30)),
  check = (value, message) => {
    if (!value) throw Error(message);
  };
const features = api.tableFeatures({
  rowSortingFeature: api.rowSortingFeature,
  sortedRowModel: api.createSortedRowModel(),
  sortFns: { basic: api.sortFn_basic },
  rowSelectionFeature: api.rowSelectionFeature,
  rowPaginationFeature: api.rowPaginationFeature,
  paginatedRowModel: api.createPaginatedRowModel(),
});
const columns = [
  { accessorKey: "problem", header: "Problem" },
  {
    accessorKey: "score",
    header: "Score",
    sortFn: "basic",
    cell: ({ getValue }) => h("b", null, getValue()),
  },
];
const data = Array.from({ length: 12 }, (_, i) => ({
  id: "p" + i,
  problem: "Problem " + (i + 1),
  score: 12 - i,
}));
export default function setup(variant) {
  (window.adapterCases ??= {})[variant] = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    let table,
      renders = 0,
      children = 0;
    const root = createRoot(host),
      shared = [],
      messages = [],
      original = console.error;
    console.error = (...args) => messages.push(args.map(String).join(" "));
    const pause = new Promise(() => {}),
      events = [];
    function App({
      rows = data,
      select = (s) => ({ sorting: s.sorting }),
      controlled,
      handler,
      blocked = false,
    }) {
      renders++;
      table = api.useTable(
        {
          features,
          data: rows,
          columns,
          getRowId: (r) => r.id,
          initialState: { pagination: { pageSize: 4, pageIndex: 0 } },
          state: controlled,
          ...(handler ? { onSortingChange: handler } : {}),
          autoResetPageIndex: false,
        },
        select,
      );
      if (blocked) throw pause;
      return h(
        "section",
        null,
        h("output", { "data-state": true }, JSON.stringify(table.state)),
        h(table.Subscribe, { selector: (s) => s.rowSelection }, (s) => {
          children++;
          return h(
            "output",
            { "data-selection": true },
            Object.keys(s).join(","),
          );
        }),
        h(
          "table",
          null,
          h(
            "tbody",
            null,
            table.getRowModel().rows.map((row) =>
              h(
                "tr",
                { key: row.id },
                row
                  .getAllCells()
                  .map((cell) =>
                    h("td", { key: cell.id }, h(table.FlexRender, { cell })),
                  ),
              ),
            ),
          ),
        ),
        h(
          "button",
          { onClick: () => table.setSorting([{ id: "score", desc: false }]) },
          "Sort",
        ),
      );
    }
    const view = (props) =>
      h(
        React.StrictMode,
        null,
        h(React.Suspense, { fallback: h("p", null, "pending") }, h(App, props)),
      );
    try {
      flushSync(() => root.render(view({})));
      await wait();
      const first = table,
        button = host.querySelector("button");
      button.focus();
      const initial = host.querySelector("tbody").textContent;
      flushSync(() => root.render(view({})));
      check(first.store === table.store, "store identity");
      check(
        host.querySelector("button") === button &&
          document.activeElement === button,
        "DOM/focus identity",
      );
      shared.push(initial);
      const before = renders;
      flushSync(() => table.setRowSelection({ p1: true }));
      await wait();
      check(
        renders === before,
        "selection must not rerender sorting-only parent",
      );
      check(
        host.querySelector("[data-selection]").textContent === "p1",
        "selection child",
      );
      const beforeChild = children;
      flushSync(() => table.setRowSelection({ p1: true }));
      await wait();
      check(
        children === beforeChild,
        "shallow-equal selector result should not rerender",
      );
      shared.push("selector isolation");
      button.click();
      await wait();
      shared.push(host.querySelector("tbody").textContent);
      check(table.getRowModel().rows[0].id === "p11", "sort updates");
      flushSync(() =>
        root.render(
          view({ rows: data.slice(0, 3), select: (s) => s.pagination }),
        ),
      );
      await wait();
      shared.push(host.querySelector("tbody").textContent);
      check(table.state.pageSize === 4, "changed selector");
      flushSync(() =>
        root.render(
          view({ controlled: { sorting: [{ id: "score", desc: true }] } }),
        ),
      );
      await wait();
      check(table.getRowModel().rows[0].id === "p0", "controlled sort");
      shared.push("controlled");
      flushSync(() =>
        root.render(view({ handler: () => events.push("temporary") })),
      );
      await wait();
      flushSync(() => root.render(view({})));
      await wait();
      table.setSorting([{ id: "score", desc: false }]);
      await wait();
      const releasedControl = table.getRowModel().rows[0].id === "p11";
      const a = createAtom(1),
        b = createAtom(10);
      function Source({ source }) {
        return h(
          api.Subscribe,
          { source, selector: (n) => ({ twice: n * 2 }) },
          (s) => h("output", { "data-source": true }, s.twice),
        );
      }
      flushSync(() => root.render(h(Source, { source: a })));
      a.set(2);
      await wait();
      check(host.textContent === "4", "source update");
      flushSync(() => root.render(h(Source, { source: b })));
      a.set(9);
      await wait();
      check(host.textContent === "20", "old source detached");
      b.set(11);
      await wait();
      check(host.textContent === "22", "new source connected");
      shared.push("source replacement");
      flushSync(() =>
        root.render(view({ handler: () => events.push("committed") })),
      );
      await wait();
      const mounted = table;
      React.startTransition(() =>
        root.render(
          view({ handler: () => events.push("abandoned"), blocked: true }),
        ),
      );
      await wait();
      mounted.setSorting([]);
      await wait();
      const committedHandler = events.at(-1) === "committed";
      flushSync(() =>
        root.render(view({ handler: () => events.push("committed") })),
      );
      await wait();
      root.unmount();
      const eventCount = events.length;
      mounted.setSorting([]);
      await wait();
      const quietAfterDispose = events.length === eventCount;
      function Static() {
        const t = api.useTable({ features, data: data.slice(0, 2), columns });
        return h(
          "div",
          null,
          t
            .getRowModel()
            .rows.map((r) =>
              h(
                "span",
                { key: r.id },
                h(t.FlexRender, { cell: r.getAllCells()[1] }),
              ),
            ),
        );
      }
      host.innerHTML = renderToString(h(Static));
      const firstSpan = host.querySelector("span"),
        errors = [];
      const hydrated = hydrateRoot(host, h(Static), {
        onRecoverableError: (e) => errors.push(e.message),
      });
      await wait();
      check(
        host.querySelector("span") === firstSpan && !errors.length,
        "hydration identity",
      );
      shared.push("hydration");
      hydrated.unmount();
      const renderables = [
        0,
        "plain",
        null,
        false,
        h("i", null, "element"),
        React.memo(({ x }) => h("b", null, x)),
        React.forwardRef(({ x }, ref) => h("u", { ref }, x)),
        ({ x }) => h("em", null, x),
      ];
      shared.push(
        renderables.map((value) =>
          renderToString(
            h(React.Fragment, null, api.flexRender(value, { x: "value" })),
          ),
        ),
      );
      return {
        shared,
        committedHandler,
        quietAfterDispose,
        releasedControl,
        warnings: messages.filter((m) =>
          /Cannot update|cached|Maximum update/.test(m),
        ),
      };
    } finally {
      console.error = original;
      host.remove();
    }
  };
}
