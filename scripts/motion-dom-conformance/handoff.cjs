"use strict";
const assert = require("node:assert/strict"),
  fixture = require("./handoff-fixture.cjs");
require("../motion-utils-conformance/check-controls.cjs").check();
fixture.globals();
const current = require("../motion-utils-conformance/node_modules/motion-dom"),
  vpm = require("../../packages/vmotion-dom");
let checks = 0;
function sample(api, svg, existing, count) {
  const e = fixture.node(svg),
    owner = fixture.renderer(e),
    effect = svg ? api.svgEffect : api.styleEffect;
  const values = {};
  for (let i = 0; i < count; i++) {
    const k = "--value" + i;
    values[k] = api.motionValue(i / 10);
    if (existing) owner.addValue(k, api.motionValue(-1));
  }
  const dispose = effect([e], values);
  api.handOffElementState(e, owner);
  const result = [];
  for (const [k, v] of Object.entries(values)) {
    assert.equal(owner.getValue(k), v);
    assert.equal(v.owner, owner);
    assert.equal(effect.get(e, k), undefined);
    v.set(v.get() + 1);
    result.push(owner.getValue(k).get());
    checks += 3;
  }
  effect.flush(e);
  assert.deepEqual(Object.keys(e.style), ["setProperty"]);
  checks++;
  dispose();
  api.handOffElementState(e, owner);
  owner.destroy();
  api.releaseElement(e);
  api.frameSteps.read.process({
    timestamp: 1000,
    delta: 16,
    isProcessing: true,
  });
  return result;
}
for (const svg of [false, true])
  for (const existing of [false, true])
    for (const count of [0, 1, 3, 8, 16])
      assert.deepEqual(
        sample(vpm, svg, existing, count),
        sample(current, svg, existing, count),
      );
console.log(
  `${checks} renderer-handoff identity, ownership, queued-write and value comparisons pass against current 14.7.0`,
);
