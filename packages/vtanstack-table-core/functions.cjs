"use strict";
const functionalUpdate = (value, previous) =>
  typeof value === "function" ? value(previous) : value;
const basic = (a, b) => (a === b ? 0 : a > b ? 1 : -1);
const string = (value) => String(value ?? "");
const sortable = (value) =>
  typeof value === "string"
    ? value
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
function natural(a, b, sensitive = false) {
  const aa =
      (sensitive ? sortable(a) : sortable(a).toLowerCase()).match(/\d+|\D+/g) ??
      [],
    bb =
      (sensitive ? sortable(b) : sortable(b).toLowerCase()).match(/\d+|\D+/g) ??
      [];
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
    if (aa[i] === bb[i]) continue;
    const an = Number(aa[i]),
      bn = Number(bb[i]);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) {
      const order = basic(an, bn);
      if (order) return order;
      continue;
    }
    if (Number.isNaN(an) !== Number.isNaN(bn)) return Number.isNaN(an) ? -1 : 1;
    return basic(aa[i], bb[i]);
  }
  return basic(aa.length, bb.length);
}
const sortFns = {
  basic: (a, b, id) => basic(a.getValue(id), b.getValue(id)),
  text: (a, b, id) =>
    basic(
      sortable(a.getValue(id)).toLowerCase(),
      sortable(b.getValue(id)).toLowerCase(),
    ),
  textCaseSensitive: (a, b, id) =>
    basic(sortable(a.getValue(id)), sortable(b.getValue(id))),
  alphanumeric: (a, b, id) => natural(a.getValue(id), b.getValue(id)),
  alphanumericCaseSensitive: (a, b, id) =>
    natural(a.getValue(id), b.getValue(id), true),
  datetime: (a, b, id) => {
    const x = a.getValue(id),
      y = b.getValue(id);
    return x > y ? 1 : x < y ? -1 : 0;
  },
};
const filterFns = {
  includesString: (row, id, value) =>
    string(row.getValue(id))
      .toLowerCase()
      .includes(string(value).toLowerCase()),
  includesStringSensitive: (row, id, value) =>
    string(row.getValue(id)).includes(string(value)),
  equalsString: (row, id, value) =>
    string(row.getValue(id)).toLowerCase() === string(value).toLowerCase(),
  arrIncludes: (row, id, value) => row.getValue(id)?.includes(value),
  arrIncludesAll: (row, id, value) =>
    value.every((x) => row.getValue(id)?.includes(x)),
  arrIncludesSome: (row, id, value) =>
    value.some((x) => row.getValue(id)?.includes(x)),
  equals: (row, id, value) => row.getValue(id) === value,
  weakEquals: (row, id, value) => row.getValue(id) == value,
  inNumberRange: (row, id, value) =>
    row.getValue(id) >= value[0] && row.getValue(id) <= value[1],
};
for (const [name, fn] of Object.entries(filterFns))
  fn.autoRemove = (value) =>
    value == null ||
    value === "" ||
    (name.startsWith("arrIncludes") && Array.isArray(value) && !value.length);
filterFns.inNumberRange.resolveFilterValue = (value) => {
  let [a, b] = value.map((x) => (x == null || x === "" ? NaN : Number(x)));
  a = Number.isNaN(a) ? -Infinity : a;
  b = Number.isNaN(b) ? Infinity : b;
  return a > b ? [b, a] : [a, b];
};
filterFns.inNumberRange.autoRemove = (value) =>
  value == null || value.every((x) => x == null || x === "");
const aggregationFns = {
  sum: (id, rows) =>
    rows.reduce(
      (s, r) => s + (typeof r.getValue(id) === "number" ? r.getValue(id) : 0),
      0,
    ),
  count: (_id, rows) => rows.length,
  min: (id, rows) => {
    const values = rows.map((r) => r.getValue(id)).filter((v) => v != null);
    return values.length ? values.reduce((a, b) => (a < b ? a : b)) : undefined;
  },
  max: (id, rows) => {
    const values = rows.map((r) => r.getValue(id)).filter((v) => v != null);
    return values.length ? values.reduce((a, b) => (a > b ? a : b)) : undefined;
  },
  mean: (id, rows) => {
    const values = rows
      .map((r) => r.getValue(id))
      .filter((v) => typeof v === "number");
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : undefined;
  },
  median: (id, rows) => {
    const values = rows
      .map((r) => r.getValue(id))
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);
    return values.length
      ? (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2
      : undefined;
  },
  unique: (id, rows) => [
    ...new Set(rows.flatMap((r) => r.getUniqueValues(id))),
  ],
  uniqueCount: (id, rows) =>
    new Set(rows.flatMap((r) => r.getUniqueValues(id))).size,
};
aggregationFns.extent = (id, rows) => [
  aggregationFns.min(id, rows),
  aggregationFns.max(id, rows),
];
function createColumnHelper() {
  return {
    accessor: (accessor, definition) => ({
      ...definition,
      ...(typeof accessor === "function"
        ? { accessorFn: accessor }
        : { accessorKey: accessor }),
    }),
    display: (definition) => definition,
    group: (definition) => definition,
  };
}
module.exports = {
  functionalUpdate,
  sortFns,
  sortingFns: sortFns,
  filterFns,
  aggregationFns,
  createColumnHelper,
};
for (const [name, fn] of Object.entries(sortFns))
  module.exports["sortFn_" + name] = fn;
for (const [name, fn] of Object.entries(filterFns))
  module.exports["filterFn_" + name] = fn;
for (const [name, fn] of Object.entries(aggregationFns))
  module.exports["aggregationFn_" + name] = fn;
