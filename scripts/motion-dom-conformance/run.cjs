"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom/index.cjs");
let checks = 0;
function equal(a, b) {
  checks++;
  assert.ok(
    Object.is(a, b) ||
      (Number.isNaN(a) && Number.isNaN(b)) ||
      Math.abs(a - b) < 2e-6,
    `${a} != ${b}`,
  );
}
for (const [name, api] of [
  ["current14", require("../motion-utils-conformance/node_modules/motion-dom")],
  ["app12", require("../motion-utils-conformance/node_modules/motion-dom-app")],
]) {
  for (const size of [1, 2, 3, 16, 129])
    for (const descending of [false, true])
      for (const clamp of [false, true])
        for (const ease of [undefined, (x) => x * x, [(x) => x * x]]) {
          const input = Array.from(
              { length: size },
              (_, i) => i / Math.max(1, size - 1),
            ),
            output = input.map((x) => 20 * x * x - 5);
          if (descending) {
            input.reverse();
            output.reverse();
          }
          const a = api.interpolate(input, output, { clamp, ease }),
            b = vpm.interpolate(input, output, { clamp, ease });
          for (let i = -10; i <= 110; i++) equal(a(i / 100), b(i / 100));
        }
  for (const keys of [
    [0, 0, 1],
    [0, 1, 1],
    [0, 0, 0],
    [1, 0, 0],
  ])
    for (const clamp of [true, false]) {
      const output = [0, 5, 10],
        a = api.interpolate(keys, output, { clamp }),
        b = vpm.interpolate(keys, output, { clamp });
      for (const x of [-1, 0, 0.25, 1, 2, NaN]) equal(a(x), b(x));
    }
  for (const total of [1, 2, 5, 20])
    for (const from of ["first", "last", "center", 0, 2])
      for (const duration of [0.1, 0.25, -0.2])
        for (const ease of [undefined, (x) => x * x]) {
          const a = api.stagger(duration, { from, ease, startDelay: 0.25 }),
            b = vpm.stagger(duration, { from, ease, startDelay: 0.25 });
          for (let i = 0; i < total; i++) equal(a(i, total), b(i, total));
        }
  const mixer = (a, b) => (p) => ({ x: a.x + (b.x - a.x) * p });
  assert.deepEqual(
    vpm.interpolate([0, 1], [{ x: 0 }, { x: 8 }], { mixer })(0.25),
    api.interpolate([0, 1], [{ x: 0 }, { x: 8 }], { mixer })(0.25),
  );
  checks++;
  for (let i = -100; i <= 100; i++)
    equal(api.mixNumber(-15, 30, i / 100), vpm.mixNumber(-15, 30, i / 100));
  console.log(name, "numeric mapping and list delays pass");
}
const current = require("../motion-utils-conformance/node_modules/motion-dom");
for (const total of [1, 2, 5, 20])
  for (let i = 0; i < total; i++)
    equal(
      current.stagger(0.1, { from: "edges" })(i, total),
      vpm.stagger(0.1, { from: "edges" })(i, total),
    );
console.log(checks, "current/app comparisons passed");
