"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const create = require(process.env.VPM_SECTION_ENTRY || "..");
test("flat traversal includes the unhighlighted state on both wrap directions", () => {
  const iterator = create({ data: 3 });
  let p = [null, null];
  const expected = [
    [null, 0],
    [null, 1],
    [null, 2],
    [null, null],
    [null, 0],
  ];
  for (const next of expected) {
    p = iterator.next(p);
    assert.deepEqual(p, next);
  }
  assert.deepEqual(iterator.prev([null, null]), [null, 2]);
  assert.deepEqual(iterator.prev([null, 0]), [null, null]);
  assert(iterator.isLast([null, 2]));
  assert(!iterator.isLast([null, null]));
  for (const method of ["next", "prev"])
    assert.deepEqual(create({ data: 0 })[method]([null, null]), [null, null]);
  assert(create({ data: 0 }).isLast([null, null]));
});
test("group boundaries skip empty sections and returned positions are independent", () => {
  const iterator = create({ data: [0, 2, 0, 0, 1, 0], multiSection: true });
  const positions = [
    [null, null],
    [1, 0],
    [1, 1],
    [4, 0],
    [null, null],
  ];
  for (let i = 0; i < positions.length - 1; i++)
    assert.deepEqual(iterator.next(positions[i]), positions[i + 1]);
  for (let i = positions.length - 1; i > 0; i--)
    assert.deepEqual(iterator.prev(positions[i]), positions[i - 1]);
  const p = iterator.next([null, null]);
  p[0] = 99;
  assert.deepEqual(iterator.next([null, null]), [1, 0]);
  assert(iterator.isLast([4, 0]));
  assert(!iterator.isLast([1, 1]));
  assert(create({ data: [0, 0], multiSection: true }).isLast([null, null]));
});
test("counts are detached snapshots and huge item counts need no item-sized storage", () => {
  const data = [1, 0, 2];
  const iterator = create({ data, multiSection: true });
  data[0] = 100;
  data[2] = 0;
  data.push(7);
  assert.deepEqual(iterator.next([0, 0]), [2, 0]);
  assert.deepEqual(iterator.prev([null, null]), [2, 1]);
  const huge = create({ data: Number.MAX_SAFE_INTEGER });
  assert.deepEqual(huge.prev([null, null]), [
    null,
    Number.MAX_SAFE_INTEGER - 1,
  ]);
  assert.deepEqual(huge.next([null, Number.MAX_SAFE_INTEGER - 1]), [
    null,
    null,
  ]);
  const frozen = create({ data: Object.freeze([0, 1]), multiSection: true });
  assert.deepEqual(frozen.next(Object.freeze([null, null])), [1, 0]);
});
test("invalid counts and positions fail explicitly", () => {
  for (const data of [
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "3",
    null,
  ]) {
    assert.throws(() => create({ data }), RangeError);
    assert.throws(
      () => create({ data: [data], multiSection: true }),
      RangeError,
    );
  }
  assert.throws(() => create({ data: [], multiSection: 1 }), TypeError);
  assert.throws(() => create({ data: 1, multiSection: true }), TypeError);
  for (const [iterator, invalid] of [
    [
      create({ data: 2 }),
      [
        [0, 0],
        [null, 2],
        [null, -1],
        [null, 1.5],
      ],
    ],
    [
      create({ data: [0, 2], multiSection: true }),
      [
        [0, 0],
        [1, 2],
        [null, 0],
        [1, null],
        [2, 0],
      ],
    ],
  ])
    for (const pos of invalid)
      for (const method of ["next", "prev", "isLast"])
        assert.throws(() => iterator[method](pos), RangeError);
});

test("cursor shapes and sparse counts are rejected", () => {
  for (const iterator of [
    create({ data: 2 }),
    create({ data: [2], multiSection: true }),
  ])
    for (const value of [[], [null], [null, null, 0], null, "ab"])
      for (const method of ["next", "prev", "isLast"])
        assert.throws(() => iterator[method](value), TypeError);
  assert.throws(
    () => create({ data: Array(2), multiSection: true }),
    RangeError,
  );
});
