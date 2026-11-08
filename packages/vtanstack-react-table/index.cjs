"use client";
"use strict";
const React = require("react"),
  core = require("vtanstack-table-core"),
  { shallow } = require("vtanstack-store");
const identity = (value) => value,
  owners = new WeakMap();
const commitEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
function useProjection(source, selector = identity) {
  if (
    !source ||
    typeof source.get !== "function" ||
    typeof source.subscribe !== "function"
  )
    throw new TypeError("A table subscription needs a readable source");
  const committed = React.useRef({ has: false, value: undefined });
  const get = React.useMemo(() => {
    let has = false,
      previous,
      selected;
    return () => {
      const snapshot = source.get();
      if (has && Object.is(snapshot, previous)) return selected;
      const next = selector(snapshot);
      previous = snapshot;
      if (has && shallow(selected, next)) return selected;
      has = true;
      selected =
        committed.current.has && shallow(committed.current.value, next)
          ? committed.current.value
          : next;
      return selected;
    };
  }, [source, selector]);
  const subscribe = React.useCallback(
    (notify) => {
      const owner = owners.get(source);
      const listener = () => {
        if (owner?.settingOptions) owner.pending.add(notify);
        else notify();
      };
      const subscription = source.subscribe(listener);
      return () => {
        owner?.pending.delete(notify);
        if (typeof subscription === "function") subscription();
        else subscription.unsubscribe();
      };
    },
    [source],
  );
  const selected = React.useSyncExternalStore(subscribe, get, get);
  commitEffect(() => {
    committed.current = { has: true, value: selected };
  });
  return selected;
}
function Subscribe({ source, selector, children }) {
  const selected = useProjection(source, selector);
  return typeof children === "function" ? children(selected) : children;
}
function flexRender(component, props) {
  if (component == null || typeof component === "boolean") return null;
  if (
    typeof component === "function" ||
    (typeof component === "object" &&
      [
        Symbol.for("react.memo"),
        Symbol.for("react.forward_ref"),
        Symbol.for("react.lazy"),
      ].includes(component.$$typeof))
  )
    return React.createElement(component, props);
  return component;
}
function FlexRender(props) {
  const keys = ["cell", "header", "footer"].filter((k) => props[k] != null);
  if (keys.length !== 1)
    throw new TypeError(
      "FlexRender requires exactly one cell, header or footer",
    );
  const key = keys[0],
    item = props[key],
    definition = item.column.columnDef;
  const renderer = definition[key];
  if (renderer === undefined && key === "cell")
    return item.renderValue()?.toString() ?? null;
  return flexRender(renderer, item.getContext());
}
function own(table, binding) {
  table.FlexRender = FlexRender;
  table.Subscribe = function TableSubscribe(props) {
    return React.createElement(Subscribe, {
      ...props,
      source: props.source ?? table.store,
    });
  };
  for (const source of [
    table.store,
    table.optionsStore,
    ...Object.values(table.atoms),
  ])
    owners.set(source, binding);
  return table;
}
function useCallbacks(binding, options) {
  // Events from a mounted table retain the handlers from its last committed render.
  React.useInsertionEffect(() => {
    binding.committed = options;
  });
  commitEffect(() => {
    binding.live = true;
    return () => {
      binding.live = false;
    };
  }, [binding]);
  const prepared = { ...options, state: options.state };
  for (const key of Object.keys(binding.table.options))
    if (/^on.+Change$/.test(key) && !Object.hasOwn(options, key))
      prepared[key] = undefined;
  for (const key of Object.keys(options))
    if (/^on.+Change$/.test(key) && typeof options[key] === "function") {
      prepared[key] = binding.callbacks[key] ??= function (...args) {
        if (binding.live) return binding.committed[key]?.(...args);
      };
    }
  return prepared;
}
function useTable(options, selector = identity) {
  const [binding] = React.useState(() => {
    const b = {
      committed: options,
      live: true,
      callbacks: {},
      pending: new Set(),
      settingOptions: false,
    };
    b.table = own(core.constructTable(options), b);
    return b;
  });
  const prepared = useCallbacks(binding, options),
    table = binding.table;
  binding.settingOptions = true;
  try {
    table.setOptions((old) => ({ ...old, ...prepared }));
  } finally {
    binding.settingOptions = false;
  }
  const selected = useProjection(table.store, selector);

  commitEffect(() => {
    const listeners = [...binding.pending];
    binding.pending.clear();
    for (const notify of listeners) notify();
  });
  return { ...table, state: selected };
}
function useReactTable(options) {
  const [binding] = React.useState(() => {
    const b = {
      committed: options,
      live: true,
      callbacks: {},
      pending: new Set(),
      settingOptions: false,
    };
    b.table = core.createTable({
      ...options,
      state: {},
      onStateChange: () => {},
    });
    return b;
  });
  const [state, setState] = React.useState(() => binding.table.initialState),
    prepared = useCallbacks(binding, options),
    table = binding.table;
  const change = React.useCallback(
    (updater) => {
      if (!binding.live) return;
      setState(updater);
      binding.committed.onStateChange?.(updater);
    },
    [binding],
  );
  const mergedState = { ...state, ...options.state };
  if (
    mergedState.pagination?.pageIndex == null ||
    mergedState.pagination?.pageSize == null
  )
    mergedState.pagination = {
      pageIndex:
        mergedState.pagination?.pageIndex ?? state.pagination.pageIndex,
      pageSize: mergedState.pagination?.pageSize ?? state.pagination.pageSize,
    };
  table.setOptions((old) => ({
    ...old,
    ...prepared,
    state: mergedState,
    onStateChange: change,
  }));
  return table;
}
function useLegacyTable(options) {
  const features = {
    ...core.stockFeatures(),
    sortFns: options.sortingFns ?? core.sortFns,
    filterFns: options.filterFns ?? core.filterFns,
    aggregationFns: options.aggregationFns ?? core.aggregationFns,
  };
  for (const [old, next] of Object.entries({
    getCoreRowModel: "coreRowModel",
    getFilteredRowModel: "filteredRowModel",
    getSortedRowModel: "sortedRowModel",
    getGroupedRowModel: "groupedRowModel",
    getExpandedRowModel: "expandedRowModel",
    getPaginationRowModel: "paginatedRowModel",
    getFacetedRowModel: "facetedRowModel",
    getFacetedUniqueValues: "facetedUniqueValues",
    getFacetedMinMaxValues: "facetedMinMaxValues",
  }))
    if (options[old]) features[next] = options[old];
  return useTable({ ...options, features });
}
module.exports = {
  ...core,
  useTable,
  useReactTable,
  useLegacyTable,
  Subscribe,
  FlexRender,
  flexRender,
  legacyCreateColumnHelper: core.createColumnHelper,
};
