"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
const options = { duration: 1, ease: "linear", autoplay: false };
function effect(extra = {}) {
  return api.createEffect(
    (s, state, k, v) => state.set(k, v, () => (s[k] = v.get())),
    { test: (s) => s?.custom, read: (s, k) => s[k], ...extra },
  );
}
async function settle(e, s) {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  api.frameSteps.update.process({
    timestamp: 1000,
    delta: 16,
    isProcessing: true,
  });
  e.flush(s);
}
function release(e, s, a = []) {
  a.forEach((h) => h.stop());
  e.state(s)?.release();
}
test("all custom properties must finish before snapshotted ends, with no early end-only writes", async () => {
  const e = effect(),
    s = { x: 0, y: 0 },
    end = { x: 5, hidden: 1 },
    a = api.animateEffectSubject(
      e,
      s,
      { x: [0, 20], y: [0, 10], transitionEnd: end },
      options,
    );
  end.hidden = 2;
  e.flush(s);
  assert.equal(Object.hasOwn(s, "hidden"), false);
  assert.equal(e.get(s, "hidden"), undefined);
  a[0].complete();
  await settle(e, s);
  assert.equal(s.x, 20);
  assert.equal(Object.hasOwn(s, "hidden"), false);
  a[1].complete();
  assert.equal(Object.hasOwn(s, "hidden"), false);
  await settle(e, s);
  assert.deepEqual(s, { x: 5, y: 10, hidden: 1 });
  release(e, s, a);
});
test("stopped, cancelled and superseded custom animations do not apply stale ends", async () => {
  for (const action of ["stop", "cancel", "replacement", "binding", "direct"]) {
    const e = effect(),
      s = { x: 0, hidden: 0 },
      a = api.animateEffectSubject(
        e,
        s,
        { x: [0, 20], transitionEnd: { hidden: 1 } },
        options,
      );
    let b = [];
    if (action === "stop" || action === "cancel") a[0][action]();
    else {
      a[0].complete();
      if (action === "replacement")
        b = api.animateEffectSubject(e, s, { x: [0, 5] }, options);
      if (action === "binding") e(s, { x: api.motionValue(99) });
      if (action === "direct")
        b = api.animateValues((k) => e.get(s, k), { x: [0, 3] }, options);
    }
    await settle(e, s);
    assert.equal(s.hidden, 0, action);
    release(e, s, [...a, ...b]);
  }
});
test("end-only targets are deferred and a newer end-only target owns the value", async () => {
  const e = effect(),
    s = { hidden: 0 };
  api.animateEffectSubject(e, s, { transitionEnd: { hidden: 1 } }, options);
  api.animateEffectSubject(e, s, { transitionEnd: { hidden: 2 } }, options);
  assert.equal(e.get(s, "hidden"), undefined);
  await settle(e, s);
  assert.equal(s.hidden, 2);
  release(e, s);
});
test("invalid ends reject before reads, binding or replacement", () => {
  let reads = 0;
  const e = effect({
      read(s, k) {
        reads++;
        return s[k];
      },
    }),
    s = { x: 0 };
  const a = api.animateEffectSubject(e, s, { x: 10 }, options);
  const before = reads;
  for (const end of [
    null,
    [],
    { x: Infinity },
    { x: {} },
    JSON.parse('{"__proto__":1}'),
  ])
    assert.throws(
      () =>
        api.animateEffectSubject(e, s, { x: 20, transitionEnd: end }, options),
      /transitionEnd|unsafe/,
    );
  assert.equal(reads, before);
  assert.equal(a[0].stopped, false);
  release(e, s, a);
});
test("failed later setup restores the earlier completion generation", async () => {
  const e = effect(),
    s = { x: 0, hidden: 0 },
    a = api.animateEffectSubject(
      e,
      s,
      { x: [0, 20], transitionEnd: { hidden: 1 } },
      options,
    );
  assert.throws(
    () =>
      api.animateEffectSubject(
        e,
        s,
        { transitionEnd: { hidden: 2 }, z: [0, 1] },
        { duration: -1 },
      ),
    /duration/,
  );
  assert.equal(e.get(s, "z"), undefined);
  a[0].complete();
  await settle(e, s);
  assert.equal(s.hidden, 1);
  release(e, s, a);
});
test("completion callback and MotionValue lifecycle errors suppress ends", async () => {
  for (const source of ["callback", "lifecycle"]) {
    const e = effect(),
      s = { x: 0, hidden: 0 },
      v = api.motionValue(0);
    e(s, { x: v });
    if (source === "lifecycle")
      v.on("animationComplete", () => {
        throw Error("lifecycle");
      });
    const a = api.animateEffectSubject(
      e,
      s,
      { x: 20, transitionEnd: { hidden: 1 } },
      {
        ...options,
        ...(source === "callback"
          ? {
              onComplete() {
                throw Error("callback");
              },
            }
          : {}),
      },
    );
    if (source === "callback") assert.throws(() => a[0].complete(), /callback/);
    else {
      const rejected = assert.rejects(a[0].finished, /lifecycle/);
      a[0].complete();
      await rejected;
    }
    await settle(e, s);
    assert.equal(s.hidden, 0);
    release(e, s, a);
  }
});
test("reentrant end writes cannot apply remaining values over a newer animation", async () => {
  const e = effect(),
    s = { x: 0, y: 0 },
    x = api.motionValue(0);
  e(s, { x });
  let next;
  x.on("change", (v) => {
    if (v === 7)
      next = api.animateEffectSubject(
        e,
        s,
        { transitionEnd: { y: 9 } },
        options,
      );
  });
  const a = api.animateEffectSubject(
    e,
    s,
    { x: 20, transitionEnd: { x: 7, y: 8 } },
    options,
  );
  a[0].complete();
  await settle(e, s);
  assert.equal(s.y, 0);
  await settle(e, s);
  assert.equal(s.y, 9);
  release(e, s, [...a, ...next]);
});
test("reentrant onPlay cannot surrender newer completion ownership", async () => {
  const e = effect(),
    s = { x: 0, hidden: 0 },
    a = api.animateEffectSubject(
      e,
      s,
      { x: 20, transitionEnd: { hidden: 1 } },
      {
        type: false,
        onPlay() {
          api.animateEffectSubject(
            e,
            s,
            { transitionEnd: { hidden: 2 } },
            options,
          );
        },
      },
    );
  a[0].complete();
  await settle(e, s);
  assert.equal(s.hidden, 2);
  release(e, s, a);
});
test("replacing an existing end-only binding suppresses the old end write", async () => {
  const e = effect(),
    s = { x: 0 },
    hidden = api.motionValue(0);
  e(s, { hidden });
  const a = api.animateEffectSubject(
    e,
    s,
    { x: 20, transitionEnd: { hidden: 1 } },
    options,
  );
  a[0].complete();
  e(s, { hidden: api.motionValue(3) });
  await settle(e, s);
  assert.equal(s.hidden, 3);
  release(e, s, a);
});
test("object and registered custom collections retain end snapshots across delay callbacks", async () => {
  for (const custom of [false, true]) {
    const e = custom ? effect() : api.propEffect,
      subjects = [
        { custom, x: 0 },
        { custom, x: 0 },
      ],
      end = { hidden: 1 };
    if (custom) api.addEffect(e);
    try {
      const g = api.animate(
        subjects,
        { x: [0, 10], transitionEnd: end },
        {
          ...options,
          delay() {
            end.hidden = 8;
            return 0;
          },
        },
      );
      g.complete();
      for (const s of subjects) {
        await settle(e, s);
        assert.equal(s.x, 10);
        assert.equal(s.hidden, 1);
        release(e, s);
      }
      g.stop();
    } finally {
      if (custom) api.removeEffect(e);
    }
  }
});
test("mixed DOM/object collections reject ends before any animation starts", () => {
  const s = { x: 0 },
    node = { nodeType: 1, style: {}, ownerDocument: { defaultView: {} } };
  let calls = 0;
  assert.throws(
    () =>
      api.animate(
        [s, node],
        { x: [0, 1], transitionEnd: { x: 2 } },
        {
          delay() {
            calls++;
            return 0;
          },
        },
      ),
    /transitionEnd/,
  );
  assert.equal(calls, 0);
  assert.equal(api.propEffect.get(s, "x"), undefined);
});
test("a throwing end accessor does not start or replace bindings", () => {
  const e = effect(),
    s = { x: 0 },
    a = api.animateEffectSubject(e, s, { x: 20 }, options);
  assert.throws(
    () =>
      api.animateEffectSubject(
        e,
        s,
        {
          x: 30,
          transitionEnd: {
            get hidden() {
              throw Error("end getter");
            },
          },
        },
        options,
      ),
    /end getter/,
  );
  assert.equal(a[0].stopped, false);
  release(e, s, a);
});
