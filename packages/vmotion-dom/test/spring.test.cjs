"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function near(a, b, e = 1e-9) {
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
}
test("undamped spring matches sine/cosine and conserves energy", () => {
  const g = api.spring({
    keyframes: [0, 1],
    stiffness: 100,
    damping: 0,
    velocity: 2,
    restDelta: 0,
    restSpeed: 0,
  });
  for (let t = 0; t < 1000; t += 13) {
    const s = t / 1000,
      x = g.next(t).value,
      v = g.velocity(t);
    near(x, 1 - Math.cos(10 * s) + 0.2 * Math.sin(10 * s));
    near(v, 10 * Math.sin(10 * s) + 2 * Math.cos(10 * s));
    near(0.5 * v * v + 50 * (x - 1) ** 2, 52, 1e-8);
    assert.equal(g.next(t).done, false);
  }
});
test("critical and overdamped analytical solutions are stable", () => {
  const critical = api.spring({
    keyframes: [0, 1],
    stiffness: 100,
    damping: 20,
    restSpeed: 0,
    restDelta: 0,
  });
  near(critical.next(100).value, 1 - 2 / Math.E);
  near(critical.velocity(100), 10 / Math.E);
  const over = api.spring({
    keyframes: [0, 1],
    stiffness: 100,
    damping: 20000,
  });
  assert.ok(over.next(100000).value > 0 && over.next(100000).value < 1);
  for (const g of [critical, over]) {
    assert.equal(g.next(1e9).value, 1);
    assert.equal(g.velocity(1e9), 0);
  }
});
test("near-critical spring is continuous on both sides of critical damping", () => {
  const critical = api.spring({
    keyframes: [0, 1],
    stiffness: 100,
    damping: 20,
    restSpeed: 0,
    restDelta: 0,
  });
  for (const damping of [19.999999, 20.000001]) {
    const g = api.spring({
      keyframes: [0, 1],
      stiffness: 100,
      damping,
      restSpeed: 0,
      restDelta: 0,
    });
    for (const t of [1, 100, 300])
      near(g.next(t).value, critical.next(t).value, 1e-7);
  }
});
test("physics options override time options and preserve initial velocity", () => {
  const a = api.spring({
    keyframes: [0, 1],
    stiffness: 550,
    damping: 30,
    velocity: 2,
  });
  const b = api.spring({
    keyframes: [0, 1],
    stiffness: 550,
    damping: 30,
    velocity: 2,
    duration: 500,
    bounce: 0.8,
    visualDuration: 0.2,
  });
  for (let t = 0; t < 500; t += 11) near(a.next(t).value, b.next(t).value);
  near(b.velocity(0), 2);
  assert.equal(b.calculatedDuration, null);
});
test("rest needs both low speed and small displacement", () => {
  const g = api.spring({
    keyframes: [0, 1],
    stiffness: 100,
    damping: 0,
    restDelta: 0.1,
    restSpeed: 0.1,
  });
  assert.equal(g.next(Math.PI * 50).done, false);
  assert.equal(g.next(0).done, false);
  const settled = api.spring({ keyframes: [3, 3] });
  assert.deepEqual(settled.next(0), { value: 3, done: true });
});
test("duration springs finish exactly, clamp bounds and support negative bounce", () => {
  for (const bounce of [-1, -0.5, 0, 0.3, 1]) {
    const g = api.spring({ keyframes: [0, 100], duration: 800, bounce });
    assert.equal(g.next(799).done, false);
    assert.deepEqual(g.next(800), { done: true, value: 100 });
  }
  assert.equal(api.spring({ duration: 0 }).calculatedDuration, 10);
  assert.equal(api.spring({ duration: 15000 }).calculatedDuration, 10000);
});
test("visualDuration works by itself and numeric shorthand matches", () => {
  const a = api.spring({ keyframes: [0, 1], visualDuration: 0.3 }),
    b = api.spring(0.3),
    c = api.spring({ keyframes: [0, 1], visualDuration: 0.3, bounce: 0.3 });
  for (let t = 0; t < 900; t += 17) {
    near(a.next(t).value, b.next(t).value);
    near(a.next(t).value, c.next(t).value);
  }
});
test("sample order does not affect value, velocity or resting state", () => {
  const g = api.spring({ keyframes: [0, 100] });
  const expected = [0, 100, 200].map((t) => ({
    ...g.next(t),
    velocity: g.velocity(t),
  }));
  g.next(5000);
  for (const [i, t] of [0, 100, 200].entries())
    assert.deepEqual({ ...g.next(t), velocity: g.velocity(t) }, expected[i]);
});
test("keyframes and option values are owned and retarget resets its sampling cache", () => {
  const keys = [0, 1],
    options = { keyframes: keys, restSpeed: 0.01 },
    g = api.spring(options);
  keys[0] = 999;
  options.restSpeed = 1000;
  g.next(100);
  g.retarget([0.3, 2], 4);
  near(g.next(0).value, 0.3);
  near(g.velocity(0), 4);
  assert.equal(g.next(0).done, false);
});
test("invalid parameters and sampling bounds fail explicitly", () => {
  for (const options of [
    { keyframes: [1] },
    { keyframes: [0, 1, 2] },
    { keyframes: [0, NaN] },
    { stiffness: 0 },
    { mass: 0 },
    { damping: -1 },
    { velocity: Infinity },
    { duration: NaN },
    { visualDuration: 0 },
    { bounce: 2 },
    { restDelta: -1 },
    { restSpeed: -1 },
    { stiffness: Number.MAX_VALUE, mass: Number.MIN_VALUE },
    { keyframes: [1e300, 0], stiffness: 1e100, damping: 0 },
  ])
    assert.throws(() => api.spring(options), Error);
  for (const invalid of [undefined, null, "0", NaN, Infinity, -Infinity]) {
    const g = api.spring();
    assert.throws(() => g.next(invalid), RangeError);
    assert.throws(() => g.velocity(invalid), RangeError);
    g.retarget([0, 2]);
    assert.throws(() => g.next(invalid), RangeError);
  }
  assert.throws(() => api.calcGeneratorDuration(api.spring(), 0), RangeError);
  assert.throws(
    () => api.calcGeneratorDuration(api.spring(), 1e-9),
    RangeError,
  );
});
test("duration estimation is bounded and nonsettling springs stay infinite", () => {
  assert.equal(
    api.calcGeneratorDuration(api.spring({ keyframes: [0, 100] })),
    1050,
  );
  assert.equal(api.calcGeneratorDuration(api.spring({ damping: 0 })), Infinity);
  assert.equal(api.calcGeneratorDuration(api.spring({ keyframes: [0, 0] })), 0);
});
function animation(options = {}) {
  let now = 1000,
    update;
  const values = [];
  const a = api.animateValue({
    keyframes: [0, 1],
    type: "spring",
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
    ...options,
    driver: (f) => ((update = f), { now: () => now, start() {}, stop() {} }),
    onUpdate: (v) => values.push(v),
  });
  return {
    a,
    values,
    tick(t) {
      now = t;
      update(t);
      return values.at(-1);
    },
  };
}
test("calendar scale springs finish at an exact endpoint", async () => {
  const h = animation();
  for (let t = 1000; t < 2000; t += 16) h.tick(t);
  await h.a.finished;
  assert.equal(h.a.state, "finished");
  assert.equal(h.values.at(-1), 1);
  assert.ok(h.values.some((v) => v > 1));
});
test("spring repeat gaps hold the endpoint instead of drifting again", () => {
  const h = animation({ repeat: 1, repeatDelay: 50, delay: 30 });
  h.tick(1330);
  near(h.tick(1370), 1);
  near(h.tick(1380), 1);
  assert.ok(h.tick(1390) < 0.1);
  h.a.stop();
});
test("spring controllers preserve pause and speed changes", () => {
  const h = animation();
  const x = h.tick(1075);
  h.a.pause();
  h.tick(1175);
  assert.equal(h.values.at(-1), x);
  h.a.play();
  h.a.speed = 0;
  near(h.tick(1200), x);
  h.a.speed = -1;
  assert.ok(h.tick(1210) < x);
  h.a.stop();
});
test("nonsettling springs can be stopped or explicitly completed", async () => {
  const h = animation({ stiffness: 100, damping: 0, restSpeed: 0.01 });
  assert.equal(h.a.duration, Infinity);
  h.tick(5000);
  assert.equal(h.a.state, "running");
  h.a.complete();
  await h.a.finished;
  assert.equal(h.values.at(-1), 1);
  assert.throws(
    () => animation({ damping: 0, repeat: 1, restSpeed: 0.01 }),
    RangeError,
  );
});
test("spring factory is accepted as the animation type", () => {
  const h = animation({ type: api.spring });
  h.tick(1100);
  assert.ok(h.values.at(-1) > 0);
  h.a.stop();
});

test("invalid retarget leaves the previous trajectory intact", () => {
  const g = api.spring({ keyframes: [0, 1], stiffness: 100, damping: 20 });
  const before = g.next(100).value;
  assert.throws(
    () => g.retarget([Number.MAX_VALUE, 0], Number.MAX_VALUE),
    RangeError,
  );
  assert.equal(g.next(100).value, before);
  near(g.next(200).value, 1 - 3 * Math.exp(-2));
  const fast = api.spring({ stiffness: 1e100, damping: 0 });
  const original = { ...fast.next(100) };
  assert.throws(() => fast.retarget([1e300, 0]), RangeError);
  assert.deepEqual(fast.next(100), original);
});
