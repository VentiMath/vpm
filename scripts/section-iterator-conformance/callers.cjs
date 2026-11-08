"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  load = require("./load.cjs");
const make = (entry) => {
  const C = load(entry);
  return function trace(counts, multiSection) {
    const records = [];
    const items = multiSection
      ? counts.map((n) => ({
          items: Array.from({ length: n }, (_, i) => String(i)),
        }))
      : Array.from({ length: counts }, (_, i) => String(i));
    let component;
    const props = {
      ...C.defaultProps,
      multiSection,
      items,
      getSectionItems: (s) => s.items,
      inputProps: {
        onKeyDown(event, position) {
          records.push([event.keyCode, position]);
          if (event.keyCode === 38 || event.keyCode === 40)
            component.props = {
              ...component.props,
              highlightedSectionIndex: position.newHighlightedSectionIndex,
              highlightedItemIndex: position.newHighlightedItemIndex,
            };
        },
      },
    };
    component = new C(props);
    for (const keyCode of [
      ...Array(20).fill(40),
      ...Array(20).fill(38),
      13,
      27,
    ])
      component.onKeyDown({ keyCode });
    const nextProps = {
      ...component.props,
      items: [],
      highlightedSectionIndex: null,
      highlightedItemIndex: null,
    };
    component.UNSAFE_componentWillReceiveProps(nextProps);
    component.props = nextProps;
    component.onKeyDown({ keyCode: 40 });
    return records;
  };
};
const upstream = make(require.resolve("section-iterator")),
  vpm = make(
    process.env.VPM_SECTION_ENTRY ||
      path.resolve(__dirname, "../../packages/vsection-iterator"),
  );
let calls = 0;
for (const [data, multi] of [
  [0, false],
  [1, false],
  [10, false],
  [[], true],
  [[0, 0], true],
  [[0, 2, 0, 1, 0], true],
  [[3, 0, 0, 2, 0, 1], true],
]) {
  const actual = vpm(data, multi);
  assert.deepEqual(actual, upstream(data, multi));
  calls += actual.length;
}
console.log(
  `Unmodified react-autosuggest Autowhatever: ${calls} keyboard callbacks match, including wraparound, empty groups and item-list replacement.`,
);
