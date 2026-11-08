"use strict";
const assert = require("node:assert/strict"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const Upstream = require("react-autosuggest"),
  Vpm = require("./load.cjs")();
let snapshots = 0;
for (const grouped of [false, true])
  for (const count of [0, 1, 2, 10])
    for (const always of [false, true])
      for (const styled of [false, true])
        for (const titled of [false, true]) {
          const rows = Array.from({ length: count }, (_, i) => ({
            title: "<Navigation " + i + ">",
          }));
          const props = {
            id: "sample",
            suggestions: grouped
              ? [
                  { title: "First", items: rows },
                  { title: "Navigation", items: rows },
                ]
              : rows,
            multiSection: grouped,
            getSectionSuggestions: (x) => x.items,
            renderSectionTitle: (x) => (titled ? x.title : null),
            alwaysRenderSuggestions: always,
            onSuggestionsFetchRequested() {},
            onSuggestionsClearRequested() {},
            getSuggestionValue: (x) => x.title,
            renderSuggestion: (x, { query, isHighlighted }) =>
              React.createElement(
                "span",
                { "data-query": query, "data-highlighted": isHighlighted },
                x.title,
              ),
            inputProps: {
              value: "  Nav  ",
              onChange() {},
              "aria-label": "Search",
            },
          };
          if (styled)
            props.theme = {
              container: "Container",
              suggestionsList: "List",
              suggestion: "Item",
            };
          const a = renderToStaticMarkup(React.createElement(Upstream, props)),
            b = renderToStaticMarkup(React.createElement(Vpm, props));
          // Attribute order is immaterial; the browser fixture compares the full
          // interactive accessibility state. Server checks cover exact text/tree shape.
          const normalize = (x) =>
            x.replace(
              /<(\w+)([^>]+)>/g,
              (_m, tag, attrs) =>
                "<" +
                tag +
                " " +
                (attrs.match(/[^\s=]+(?:="[^"]*")?/g) || []).sort().join(" ") +
                ">",
            );
          assert.equal(
            normalize(b),
            normalize(a),
            JSON.stringify({ grouped, count, always, styled }),
          );
          snapshots++;
        }
console.log(
  `${snapshots} server-rendered flat/grouped, empty/populated and themed contracts match upstream.`,
);
