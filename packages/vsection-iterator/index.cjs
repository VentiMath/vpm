"use strict";
module.exports = function createSectionIterator({
  data,
  multiSection = false,
}) {
  if (typeof multiSection !== "boolean")
    throw new TypeError("multiSection must be a boolean");
  const validCount = (n) => Number.isSafeInteger(n) && n >= 0;
  if (!multiSection) {
    if (!validCount(data))
      throw new RangeError("data must be a nonnegative safe integer");
    function item(position) {
      if (!Array.isArray(position) || position.length !== 2)
        throw new TypeError("position must be a two-element array");
      const [section, index] = position;
      if (
        section !== null ||
        (index !== null && (!validCount(index) || index >= data))
      )
        throw new RangeError("Invalid flat-list position");
      return index;
    }
    return {
      next(position) {
        const i = item(position);
        return [
          null,
          data === 0 || i === data - 1 ? null : i === null ? 0 : i + 1,
        ];
      },
      prev(position) {
        const i = item(position);
        return [
          null,
          data === 0 || i === 0 ? null : i === null ? data - 1 : i - 1,
        ];
      },
      isLast(position) {
        const i = item(position);
        return data === 0 ? i === null : i === data - 1;
      },
    };
  }
  if (!Array.isArray(data))
    throw new TypeError("Grouped data must be an array of counts");
  const counts = [],
    occupied = [];
  for (let i = 0; i < data.length; i++) {
    const count = data[i];
    if (!validCount(count))
      throw new RangeError("Section counts must be nonnegative safe integers");
    counts.push(count);
    if (count) occupied.push(i);
  }
  const first = occupied[0],
    last = occupied[occupied.length - 1];
  function check(position) {
    if (!Array.isArray(position) || position.length !== 2)
      throw new TypeError("position must be a two-element array");
    const [s, i] = position;
    if (s === null && i === null) return;
    if (
      !validCount(s) ||
      s >= counts.length ||
      !validCount(i) ||
      i >= counts[s]
    )
      throw new RangeError("Invalid grouped-list position");
  }
  function rank(section) {
    let low = 0,
      high = occupied.length;
    while (low < high) {
      const middle = low + ((high - low) >>> 1);
      if (occupied[middle] < section) low = middle + 1;
      else high = middle;
    }
    return low;
  }
  return {
    next(position) {
      check(position);
      const [s, i] = position;
      if (s === null) return first === undefined ? [null, null] : [first, 0];
      if (i + 1 < counts[s]) return [s, i + 1];
      const next = occupied[rank(s) + 1];
      return next === undefined ? [null, null] : [next, 0];
    },
    prev(position) {
      check(position);
      const [s, i] = position;
      if (s === null)
        return last === undefined ? [null, null] : [last, counts[last] - 1];
      if (i > 0) return [s, i - 1];
      const previous = occupied[rank(s) - 1];
      return previous === undefined
        ? [null, null]
        : [previous, counts[previous] - 1];
    },
    isLast(position) {
      check(position);
      const [s, i] = position;
      return last === undefined
        ? s === null
        : s === last && i === counts[last] - 1;
    },
  };
};
