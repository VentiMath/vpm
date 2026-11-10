"use strict";
const assert = require("node:assert/strict"),
  fixture = require("./handoff-fixture.cjs");
require("../motion-utils-conformance/check-controls.cjs").check();
fixture.globals();
const current = require("../motion-utils-conformance/node_modules/motion-dom"),
  vpm = require("../../packages/vmotion-dom");
let checks = 0;
async function scenario(api, count, delay, repeat) {
  api.time.set(1000);
  const values = [],
    members = [],
    ticks = [];
  for (let i = 0; i < count; i++) {
    const value = {
      current: 0,
      get() {
        return this.current;
      },
    };
    values.push(value);
    members.push(
      new api.JSAnimation({
        keyframes: [0, 10 + i],
        duration: 200 * (i + 1),
        delay: delay * 1000,
        repeat,
        repeatType: "reverse",
        autoplay: false,
        ease: "linear",
        driver: (tick) => (
          ticks.push(tick),
          { now: () => 1000, start() {}, stop() {} }
        ),
        onUpdate: (v) => {
          value.current = v;
        },
      }),
    );
  }

  api.flushKeyframeResolvers();
  const g = new api.GroupAnimation([...members, undefined]),
    samples = [];
  for (const t of [0, 0.1, 0.25, 0.5, 1]) {
    g.time = t;
    for (const tick of ticks) tick(1000);

    samples.push(values.map((v) => v.get()));
  }
  const result = {
    samples,
    duration: g.duration,
    iteration: g.iterationDuration,
    time: g.time,
  };
  g.speed = 0.5;
  result.speed = g.speed;
  g.play();
  g.pause();
  result.state = g.state;
  g.complete();
  for (const tick of ticks) tick(1000);
  for (let i = 0; i < 8; i++) {
    for (const step of Object.values(api.frameSteps))
      step.process({ timestamp: 1000 + i * 16, delta: 16, isProcessing: true });
    await Promise.resolve();
  }
  await g.finished;
  result.final = values.map((v) => v.get());
  g.stop();
  return result;
}
const timeout = setTimeout(() => {
  console.error("group conformance did not finish");
  process.exit(1);
}, 15000);
(async () => {
  for (const count of [1, 2, 8])
    for (const delay of [0])
      for (const repeat of [0, 1, 2]) {
        const a = await scenario(current, count, delay, repeat),
          b = await scenario(vpm, count, delay, repeat);
        const stable = (x) =>
          JSON.parse(
            JSON.stringify(x, (_, v) =>
              typeof v === "number" ? Math.round(v * 1e8) / 1e8 : v,
            ),
          );
        assert.deepEqual(stable(b), stable(a));
        checks += a.samples.length * count + 6;
      }
  console.log(
    `${checks} grouped-control comparisons against motion-dom 14.7.0 pass.`,
  );
})()
  .finally(() => clearTimeout(timeout))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
