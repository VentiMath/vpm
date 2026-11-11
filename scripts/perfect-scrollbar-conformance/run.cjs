"use strict";
const assert = require("node:assert/strict"),
  { fixture } = require("./dom.cjs");
const entries = [
  require.resolve("./node_modules/perfect-scrollbar"),
  process.env.VPERFECT_ENTRY ||
    require.resolve("../../packages/vperfect-scrollbar"),
];
for (const file of entries) {
  const f = fixture(),
    Ps = require(file);
  const p = new Ps(f.element, { wheelPropagation: true });
  assert.equal(p.isAlive, true);
  assert.equal(p.scrollbarYActive, true);
  assert.equal(p.scrollbarXActive, true);
  const events = [];
  for (const name of ["ps-scroll-y", "ps-scroll-down", "ps-y-reach-end"])
    f.element.addEventListener(name, () => events.push(name));
  f.element.scrollTop = 400;
  f.element.dispatchEvent(new f.win.Event("scroll"));
  assert.ok(events.includes("ps-scroll-y"));
  assert.ok(events.includes("ps-scroll-down"));
  assert.equal(p.reach.y, "end");
  f.dimensions.contentHeight = 800;
  p.update();
  assert.equal(p.contentHeight, 800);
  assert.equal(p.reach.y, null);
  p.destroy();
  p.destroy();
  assert.equal(f.element.querySelectorAll(".ps__rail-x,.ps__rail-y").length, 0);
  assert.equal(p.isAlive, false);
  f.close();
}
console.log(
  "Not-modified upstream/VPM constructor, native scroll events, resize update and double destroy pass.",
);
