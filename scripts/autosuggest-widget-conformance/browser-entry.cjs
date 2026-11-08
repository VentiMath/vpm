const React = require("react"),
  { createRoot } = require("react-dom/client"),
  { createPortal } = require("react-dom");
const components = {
  upstream: require("react-autosuggest"),
  vpm: require("vpm-under-test"),
};
const h = React.createElement,
  rows = [
    "Algebra",
    "Algorithms",
    "Archive",
    "Calculus",
    "Campus",
    "Contest",
  ].map((title, index) => ({ title, index }));
const navigationRows = [
  "AMC Series",
  "AMC 8",
  "AMC 10",
  "AMC 12",
  "AIME",
  "ARML",
  "ARML Local",
  "Putnam",
  "USAMO",
  "USAMTS",
].map((title, index) => ({ title, index }));
window.controls = {};
window.logs = {};
window.refs = {};
const hosts = {};
for (const variant of Object.keys(components)) {
  const host = document.createElement("section");
  host.id = variant;
  hosts[variant] = host;
  document.body.append(host);
  const portal = document.createElement("section");
  portal.id = variant + "-portal";
  document.body.append(portal);
  const root = createRoot(host);
  function mount(options = {}) {
    window.logs[variant] = [];
    const choices = options.navigation ? navigationRows : rows;
    function Harness() {
      const [value, setValue] = React.useState(options.value || ""),
        [suggestions, setSuggestions] = React.useState(
          options.always ? choices : [],
        ),
        [tick, setTick] = React.useState(0);
      const record = (...args) => window.logs[variant].push(args);
      const grouped = !!options.grouped;
      const group = (items) =>
        grouped
          ? options.emptySection
            ? [
                { name: "Empty", items: [] },
                { name: "Navigation", items },
              ]
            : [
                { name: "Navigation", items },
                { name: "Empty", items: [] },
              ]
          : items;
      const [items, setItems] = React.useState(group(suggestions));
      const inputRef = React.useRef(null);
      const [refMode, setRefMode] = React.useState(0);
      const cleanupRef = React.useCallback(
        (node) => {
          inputRef.current = node;
          record("input-ref", !!node, refMode);
          if (node)
            return () => {
              inputRef.current = null;
              record("ref-cleanup", refMode);
            };
        },
        [refMode],
      );
      window.controls[variant] = {
        setValue,
        update: (items) => setItems(group(items)),
        rerender: () => setTick((x) => x + 1),
        inputRef,
        swapRef: () => setRefMode((x) => x + 1),
        rows: choices,
        root,
      };
      const props = {
        id: variant,
        ref: (node) => {
          window.refs[variant] = node;
        },
        highlightFirstSuggestion: options.first !== false,
        suggestions: items,
        alwaysRenderSuggestions: options.always,
        focusInputOnSuggestionClick: options.focus !== false,
        multiSection: grouped,
        getSectionSuggestions: (section) => section.items,
        renderSectionTitle: (section) => section.name,
        shouldKeepSuggestionsOnSelect: options.keep ? () => true : undefined,
        shouldRenderSuggestions: options.minimum
          ? (value) => value.trim().length >= options.minimum
          : undefined,
        onSuggestionsFetchRequested: ({ value, reason }) => {
          record("fetch", value, reason);
          if (!options.async)
            setItems(
              group(
                choices.filter((x) =>
                  x.title.toLowerCase().startsWith(value.trim().toLowerCase()),
                ),
              ),
            );
        },
        onSuggestionsClearRequested: () => {
          record("clear");
          setItems(group([]));
        },
        getSuggestionValue: (x) => x.title,
        renderSuggestion: (x, { query, isHighlighted }) =>
          h(
            "span",
            { "data-query": query, "data-highlighted": isHighlighted },
            x.title,
          ),
        onSuggestionSelected: (_event, data) =>
          record(
            "select",
            data.suggestion.title,
            data.suggestionValue,
            data.suggestionIndex,
            data.sectionIndex,
            data.method,
          ),
        onSuggestionHighlighted: ({ suggestion }) =>
          record("highlight", suggestion?.title ?? null),
        inputProps: {
          id: variant + "-input",
          ref: options.cleanupRef ? cleanupRef : inputRef,
          value,
          onChange: (_event, data) => {
            record("change", data.newValue, data.method);
            setValue(data.newValue);
          },
          onBlur: (_event, data) =>
            record("blur", data?.highlightedSuggestion?.title ?? null),
          onFocus: () => record("focus"),
          autoFocus: options.autoFocus,
          "aria-label": "Search navigation",
        },
        theme: {
          container: "flex flex-1 w-full",
          suggestionsList: "FuseSearch-suggestionsList",
          suggestion: "FuseSearch-suggestion",
        },
        renderInputComponent: (inputProps) =>
          h(
            "div",
            { "data-custom-input": true },
            h("input", { ...inputProps, key: refMode }),
          ),
        renderSuggestionsContainer: ({ containerProps, children, query }) => {
          const { key, ...rest } = containerProps;
          const node = h(
            "div",
            {
              key,
              ...rest,
              style: { maxHeight: 45, overflow: "auto" },
              "data-query": query,
            },
            children,
          );
          return options.portal === false ? node : createPortal(node, portal);
        },
      };
      return h(components[variant], props);
    }
    root.render(h(Harness, { key: Math.random() }));
  }
  window["mount_" + variant] = mount;
  mount();
}
window.runChecks = async () => {
  for (let i = 0; i < 200; i++) {
    if (window.controls.upstream && window.controls.vpm) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("Not mounted");
};
window.snapshot = (variant) => {
  const input = document.getElementById(variant + "-input"),
    host = hosts[variant],
    portal = document.getElementById(variant + "-portal");
  const all = [
    ...host.querySelectorAll("[role=option]"),
    ...portal.querySelectorAll("[role=option]"),
  ];
  const selected = input.getAttribute("aria-activedescendant");
  return {
    value: input.value,
    expanded: host
      .querySelector("[role=combobox]")
      .getAttribute("aria-expanded"),
    options: all.map((x) => ({
      text: x.textContent,
      selected: x.getAttribute("aria-selected"),
      query: x.firstChild?.getAttribute("data-query"),
    })),
    active: selected
      ? (document.getElementById(selected)?.textContent ?? null)
      : null,
    focused: document.activeElement === input,
    ref: window.refs[variant]?.input === input,
    forwarded: window.controls[variant].inputRef.current === input,
  };
};
