"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const R = require(process.env.VPM_ROPE_ENTRY || "../index.cjs"),
  U = require("../../../scripts/rope-sequence-conformance/node_modules/rope-sequence");
test("identity, reverse indexing, stopping and mapping agree with upstream", () => {
  for (const C of [R, U]) {
    const r = C.from([1, 2, 3, 4]);
    assert.equal(C.from(r), r);
    assert.equal(r.slice(), r);
    assert.equal(r.append([]), r);
    assert.equal(r.prepend([]), r);
    assert.equal(r.slice(1, 1), C.empty);
    const seen = [];
    assert.equal(
      r.forEach(
        (x, i) => {
          seen.push([x, i]);
          return x !== 2;
        },
        4,
        0,
      ),
      undefined,
    );
    assert.deepEqual(seen, [
      [4, 3],
      [3, 2],
      [2, 1],
    ]);
    assert.deepEqual(
      r.map((x, i) => [x, i], 3, 1),
      [
        [3, 2],
        [2, 1],
      ],
    );
    assert.equal(r.get(-1), undefined);
    assert.equal(r.get(4), undefined);
    assert.deepEqual(r.slice(-3, 99).flatten(), [1, 2, 3, 4]);
  }
});
test("6000 deterministic persistent edits agree with array and upstream oracles", () => {
  for (let seed = 1; seed <= 6; seed++) {
    let rand = seed,
      a = [],
      r = R.empty,
      u = U.empty;
    const next = () => {
      rand ^= rand << 13;
      rand ^= rand >>> 17;
      rand ^= rand << 5;
      return rand >>> 0;
    };
    const saved = [];
    for (let i = 0; i < 1000; i++) {
      if (i % 37 === 0) saved.push([r, a.slice()]);
      const op = next() % 4;
      if (op < 2) {
        const chunk = Array.from(
          { length: 1 + (next() % 80) },
          () => next() % 10000,
        );
        if (op === 0) {
          r = r.append(chunk);
          u = u.append(chunk);
          a = a.concat(chunk);
        } else {
          r = r.prepend(chunk);
          u = u.prepend(chunk);
          a = chunk.concat(a);
        }
      } else if (op === 2) {
        const start = next() % (a.length + 1),
          end = start + (next() % (a.length - start + 1));
        r = r.slice(start, end);
        u = u.slice(start, end);
        a = a.slice(start, end);
      } else {
        const clone = R.from(a);
        r = r.append(clone);
        u = u.append(a);
        a = a.concat(a);
      }
      if (a.length > 8192) {
        r = r.slice(a.length - 8192);
        u = u.slice(a.length - 8192);
        a = a.slice(-8192);
      }
      assert.deepEqual(r.flatten(), a);
      assert.deepEqual(r.flatten(), u.flatten());
      assert.equal(r.length, a.length);
      if (a.length) {
        const idx = next() % a.length;
        assert.equal(r.get(idx), a[idx]);
        const lo = next() % (a.length + 1),
          hi = next() % (a.length + 1);
        assert.deepEqual(
          r.map((v, i) => [v, i], lo, hi),
          u.map((v, i) => [v, i], lo, hi),
        );
      }
    }
    for (const [old, values] of saved) assert.deepEqual(old.flatten(), values);
  }
});
test("input and flattened arrays cannot corrupt snapshots; element identity is retained", () => {
  const unusual = [1, 2];
  unusual.slice = () => unusual;
  unusual.constructor = {
    [Symbol.species]: function () {
      return unusual;
    },
  };
  const detached = R.from(unusual);
  unusual[0] = 99;
  assert.deepEqual(detached.flatten(), [1, 2]);
  const item = {},
    source = [item, 2, 3],
    r = R.from(source);
  source[0] = 99;
  source.push(4);
  assert.equal(r.length, 3);
  assert.equal(r.get(0), item);
  const flat = r.flatten();
  flat.length = 0;
  assert.equal(r.length, 3);
  assert.deepEqual(r.flatten(), [item, 2, 3]);
  const add = [4],
    later = r.append(add);
  add[0] = 50;
  assert.equal(later.get(3), 4);
  assert.equal(r.length, 3);
  assert.throws(() => {
    r.length = 99;
  }, TypeError);
  assert.throws(() => {
    R.empty = r;
  }, TypeError);
});
test("large alternating concatenation and slices stay usable without exposing storage", () => {
  let r = R.empty;
  for (let i = 0; i < 30000; i++) r = i % 2 ? r.append([i]) : r.prepend([i]);
  assert.equal(r.length, 30000);
  const a = r.flatten();
  assert.equal(a[0], 29998);
  assert.equal(a[29999], 29999);
  for (let i = 0; i < 1000; i++) {
    const start = i * 13,
      end = start + 500;
    assert.deepEqual(r.slice(start, end).flatten(), a.slice(start, end));
  }
  assert.deepEqual(Object.keys(r), []);
});
test("boundaries are stable across shapes and invalid iteration is rejected", () => {
  for (const r of [
    R.empty,
    R.from([1, 2]),
    R.from(Array.from({ length: 1024 }, (_, i) => i)),
  ]) {
    for (const n of [NaN, 0.5, "1"]) {
      assert.throws(() => r.slice(n), RangeError);
      assert.throws(() => r.forEach(() => {}, n), RangeError);
      assert.equal(r.get(n), undefined);
    }
    assert.throws(() => r.forEach(() => {}, -1), RangeError);
    assert.throws(() => r.map((x) => x, 0, r.length + 1), RangeError);
    assert.equal(r.slice(-Infinity, Infinity), r);
    assert.equal(r.get(Infinity), undefined);
    assert.equal(r.slice(99999), R.empty);
  }
  assert.throws(() => R.from({ length: 1, 0: "x" }), TypeError);
  assert.equal(R.from(), R.empty);
});
