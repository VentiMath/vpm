"use strict";
module.exports = function props({
  text = "Algebra study guide",
  query = "study",
  exact = true,
  disabled = false,
  column = false,
  custom = false,
} = {}) {
  const definition = {
    filterVariant: "text",
    _filterFn: exact ? "contains" : "fuzzy",
  };
  if (custom)
    definition.Cell = ({ renderedCellValue }) =>
      require("react").createElement("em", null, renderedCellValue);
  return {
    cell: {
      getIsAggregated: () => false,
      getIsGrouped: () => false,
      renderValue: () => text,
      row: { getIsGrouped: () => false },
      column: {
        columnDef: definition,
        getFilterValue: () => (column ? query : undefined),
        getCanGlobalFilter: () => true,
      },
    },
    table: {
      getState: () => ({
        globalFilter: column ? "" : query,
        globalFilterFn: exact ? "contains" : "fuzzy",
      }),
      options: {
        enableFilterMatchHighlighting: !disabled,
        mrtTheme: { matchHighlightColor: "#ffcf33" },
      },
    },
  };
};
