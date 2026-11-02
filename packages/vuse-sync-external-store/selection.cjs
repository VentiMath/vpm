'use strict';

// This reader belongs to one render configuration, not a ref shared by all
// concurrent renders. Cache a pair only after selector and equality succeed.
exports.selectionReader = function selectionReader(select, equal, committed) {
  let entry;

  return snapshot => {
    if (entry && Object.is(entry.snapshot, snapshot))
      return entry.value;

    const selected = select(snapshot);
    const previous = entry || committed();
    const value = previous && equal && equal(previous.value, selected) ? previous.value : selected;

    entry = {
      snapshot,
      value
    };

    return value;
  };
};
