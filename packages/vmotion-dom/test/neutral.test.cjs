"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function resolve(name, frames) {
  let result, final;
  const r = new api.DOMKeyframesResolver(
    frames,
    (x, f) => {
      result = x;
      final = f;
    },
    name,
  );
  r.scheduleResolve();
  api.flushKeyframeResolvers();
  return { result, final };
}
test("filter neutrality uses identity multipliers and zero additive effects", () => {
  for (const key of ["filter", "backdropFilter"]) {
    assert.equal(
      api.getAnimatableNone(
        key,
        "brightness(.5) contrast(20%) saturate(2) opacity(.4)",
      ),
      "brightness(1) contrast(100%) saturate(1) opacity(1)",
    );
    assert.equal(
      api.getAnimatableNone(
        key,
        "blur(10px) hue-rotate(20deg) invert(80%) grayscale(.5) sepia(.6)",
      ),
      "blur(0px) hue-rotate(0deg) invert(0%) grayscale(0) sepia(0)",
    );
  }
});
test("omitted filter arguments keep CSS defaults distinct from neutral identities", () => {
  assert.deepEqual(
    resolve("filter", [
      "none",
      "blur() hue-rotate() grayscale() invert() sepia() opacity()",
    ]).result,
    [
      "blur(0px) hue-rotate(0deg) grayscale(0) invert(0) sepia(0) opacity(1)",
      "blur(0px) hue-rotate(0deg) grayscale(1) invert(1) sepia(1) opacity(1)",
    ],
  );
});
test("drop shadows fade through a transparent zero-length shadow and URL references stay opaque", () => {
  assert.equal(
    api.getAnimatableNone("filter", "drop-shadow(2px 4px 3px #f00)"),
    "drop-shadow(0px 0px 0px rgba(255, 0, 0, 0))",
  );
  assert.equal(
    api.getAnimatableNone("filter", "url(file10.svg#filter2) blur(5px)"),
    "none",
  );
  const data = resolve("filter", ["none", "url(file10.svg#filter2) blur(5px)"]);
  assert.deepEqual(data.result, ["none", "url(file10.svg#filter2) blur(5px)"]);
});
test("neutral transforms preserve scale and matrix identities", () => {
  assert.equal(
    api.getAnimatableNone(
      "transform",
      "translateX(20px) scale(2, 3) rotate(30deg)",
    ),
    "translateX(0px) scale(1, 1) rotate(0deg)",
  );
  assert.equal(
    api.getAnimatableNone("transform", "matrix(2, 3, 4, 5, 6, 7)"),
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  assert.equal(
    api.getAnimatableNone("transform", "rotate3d(1, 0, 0, 40deg)"),
    "rotate3d(1, 0, 0, 0deg)",
  );
  assert.throws(
    () => api.getAnimatableNone("transform", "perspective(300px)"),
    /unsupported/,
  );
});
test("none, string zero, numeric zero and wildcard origins use an owned neutral template", () => {
  for (const initial of ["none", "0", 0]) {
    const frames = [initial, "4px 6px #f00"],
      copy = frames.slice(),
      data = resolve("boxShadow", frames);
    assert.deepEqual(data.result, [
      "0px 0px rgba(255, 0, 0, 0)",
      "4px 6px #f00",
    ]);
    assert.deepEqual(frames, copy);
  }
  const value = api.motionValue("none");
  let output;
  const r = new api.DOMKeyframesResolver(
    [null, "blur(10px)"],
    (f) => (output = f),
    "filter",
    value,
  );
  r.scheduleResolve();
  api.flushKeyframeResolvers();
  assert.deepEqual(output, ["blur(0px)", "blur(10px)"]);
  assert.equal(resolve("filter", ["blur(10px)", "none"]).final, "none");
});
test("neutral playback preserves seeking, cancellation, replay and literal final none", async () => {
  for (const [key, end, mid] of [
    ["filter", "brightness(.5) blur(10px)", "brightness(0.75) blur(5px)"],
    ["backdropFilter", "contrast(20%)", "contrast(60%)"],
    ["boxShadow", "10px 20px #f00", "5px 10px rgba(255, 0, 0, 0.5)"],
    ["transform", "scale(2) translateX(20px)", "scale(1.5) translateX(10px)"],
  ]) {
    const value = api.motionValue("none"),
      [a] = api.animateValues(
        () => value,
        { [key]: ["none", end] },
        { duration: 1, ease: "linear", autoplay: false },
      );
    a.time = 0.5;
    assert.equal(value.get(), mid);
    a.cancel();
    a.time = 0.5;
    assert.equal(value.get(), mid);
    a.complete();
    await a.finished;
    a.stop();
    const [back] = api.animateValues(
      () => value,
      { [key]: [end, "none"] },
      { duration: 1, ease: "linear", autoplay: false },
    );
    back.time = 0.5;
    assert.equal(value.get(), mid);
    back.complete();
    await back.finished;
    assert.equal(value.get(), "none");
    back.stop();
  }
});
test("neutral filter failures reject instead of creating invalid or nonfinite CSS", () => {
  for (const value of [
    "blur(-1px)",
    "blur(4%)",
    "blur(2wut)",
    "brightness(-1)",
    "contrast(1px)",
    "hue-rotate(2px)",
    "blur(1e999px)",
    "brightness(calc(1 + 1))",
    "drop-shadow(1px 2px -3px #fff)",
    "drop-shadow(1px 2px red)",
  ])
    assert.throws(
      () => api.getAnimatableNone("filter", value),
      undefined,
      value,
    );
});

test("opaque URL filters switch discretely and all-none timelines remain valid", () => {
  for (const target of ["url(file10.svg#filter2)", "none"]) {
    const value = api.motionValue("none"),
      [a] = api.animateValues(
        () => value,
        { filter: ["none", target] },
        { duration: 1, ease: "linear", autoplay: false },
      );
    a.time = 0;
    assert.equal(value.get(), "none");
    a.time = 0.5;
    assert.equal(value.get(), target);
    a.stop();
  }
});
