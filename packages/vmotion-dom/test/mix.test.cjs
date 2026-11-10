"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
test("hexadecimal, RGB and HSL colors own their components and normalize CSS percentages", () => {
  assert.deepEqual(api.parseHex("#1234"), {
    red: 17,
    green: 34,
    blue: 51,
    alpha: 68 / 255,
  });
  assert.deepEqual(api.color.parse("RGB(100% 0% 50% / 25%)"), {
    red: 255,
    green: 0,
    blue: 127.5,
    alpha: 0.25,
  });
  assert.equal(
    api.mixColor("hsl(.5turn 100% 50%)", "#00ffff")(0.5),
    "rgba(0, 255, 255, 1)",
  );
  assert.equal(
    api.color.transform(api.color.parse("rgba(300,-20,10,2)")),
    "rgba(255, 0, 10, 1)",
  );
  const c = { red: 255, green: 0, blue: 0, alpha: 1 },
    d = api.color.parse(c);
  c.red = 0;
  assert.equal(d.red, 255);
});
test("color mixing uses Motion gamma-two channels and linear alpha", () => {
  const mix = api.mixColor("#ff000080", "rgba(0,0,255,.25)");
  assert.equal(mix(0.5), "rgba(180, 0, 180, 0.37598)");
  assert.equal(api.mixColor("#000", "#fff")(0.25), "rgba(128, 128, 128, 1)");
  assert.equal(
    api.mixColor("transparent", "#fff")(0.5),
    "rgba(180, 180, 180, 0.5)",
  );
  assert.throws(() => mix(NaN), /finite/);
  assert.equal(
    api.mixColor("rgb(1e200 -1e200 0 / 200%)", "#fff")(0.5),
    "rgba(255, 180, 180, 1)",
  );
});
test("malformed color input and nonfinite components reject", () => {
  for (const s of [
    "#12",
    "#12345",
    "rgb(1,2)",
    "rgb(1 2 3 .5)",
    "rgb(1%,2,3)",
    "rgb(1,2,3 / .5)",
    "rgba(1,2,3,NaN)",
    "hsl(20 30 40)",
    "rgb(1e999 0 0)",
  ]) {
    assert.equal(api.color.test(s), false, s);
    assert.throws(() => api.color.parse(s));
  }
  assert.throws(() =>
    api.mixColor({ red: Infinity, green: 0, blue: 0 }, "#fff"),
  );
});
test("complex values isolate nested variables, strings, URLs and identifier digits", () => {
  const value =
    'translate3d(1e2px, -20px, 0px) var(--x, calc(5px + 10%)) url(image123.png) "v2"';
  const info = api.analyseComplexValue(value);
  assert.deepEqual(info.types, ["number", "number", "number", "var"]);
  assert.equal(info.values[0], 100);
  assert.equal(api.mixComplex("1E2px", "2E2px")(0.5), "150px");
  assert.equal(
    api.mixComplex("1e2px -.5px", "2e2px 1.5px")(0.5),
    "150px 0.5px",
  );
  assert.equal(info.values[3], "var(--x, calc(5px + 10%))");
  const f = api.createTransformer(value);
  assert.equal(
    f([20, -10, 0, "var(--y)"]),
    'translate3d(20px, -10px, 0px) var(--y) url(image123.png) "v2"',
  );
  assert.equal(
    api.mixComplex("url(image10.png)", "url(image20.png)")(0.5),
    "url(image20.png)",
  );
  assert.throws(() => api.analyseComplexValue("translateX(10px"), /unclosed/);
  assert.throws(() => api.analyseComplexValue("var(--foo"), /unclosed/);
});
test("shadows, variables, extrapolation, immediate and invisible endpoints mix", () => {
  const f = api.mixComplex("0px 2px 4px #000", "10px 20px 30px #fff");
  assert.equal(f(0.5), "5px 11px 17px rgba(180, 180, 180, 1)");
  assert.equal(
    api.mixComplex("var(--a) 10px", "var(--b) 20px")(0.5),
    "var(--b) 15px",
  );
  assert.equal(api.mixComplex("10px", "20px 30px")(0.5), "20px 30px");
  assert.equal(api.mixComplex("10px", "20px")(1.5), "25px");
  assert.equal(api.mixVisibility("block", "none")(0.5), "block");
  assert.equal(api.mixVisibility("block", "none")(1), "none");
  assert.equal(
    api.complex.getAnimatableNone("2px 3px #f00"),
    "0px 0px rgba(255, 0, 0, 0)",
  );
});
test("containers snapshot inputs, preserve target-only fields and reuse output", () => {
  const a = [1, { red: 255, green: 0, blue: 0, alpha: 1 }],
    b = [3, "#00f"],
    f = api.mixArray(a, b);
  a[0] = 100;
  a[1].red = 0;
  b[0] = 500;
  const first = f(0.5);
  assert.deepEqual(first, [2, "rgba(180, 0, 180, 1)"]);
  assert.equal(first, f(1));
  const g = api.mixObject({ x: 0, old: "keep" }, { x: 10, new: "target" });
  assert.deepEqual(g(0.5), { x: 5, old: "keep", new: "target" });
  assert.throws(
    () => api.mixObject(JSON.parse('{"__proto__":0}'), { x: 1 }),
    /unsafe/,
  );
  assert.throws(() => api.mixArray([0], [1, 2]), /length/);
  const recursive = {};
  recursive.x = recursive;
  assert.throws(() => api.mixObject(recursive, recursive), /scalar/);
});

test("automatic interpolation owns color/complex endpoints and per-segment easing", () => {
  const frames = ["#000", "#fff"],
    ease = [(p) => p * p],
    f = api.interpolate([0, 1], frames, { ease });
  frames[1] = "#f00";
  ease[0] = () => 0;
  assert.equal(f(0.5), "rgba(128, 128, 128, 1)");
  assert.equal(
    api.interpolate(
      [0, 0.5, 1],
      ["translateX(0px)", "translateX(20px)", "translateX(30px)"],
    )(0.75),
    "translateX(25px)",
  );
});
test("renderer-owned colors and shadows use numeric playback without mutating endpoints", () => {
  for (const [name, frames, expected] of [
    ["backgroundColor", ["#000", "#fff"], "rgba(180, 180, 180, 1)"],
    [
      "boxShadow",
      ["0px 2px #000", "10px 20px #fff"],
      "5px 11px rgba(180, 180, 180, 1)",
    ],
  ]) {
    const value = api.motionValue(frames[0]),
      original = frames.slice(),
      [a] = api.animateValues(
        () => value,
        { [name]: frames },
        { duration: 1, ease: "linear", autoplay: false },
      );
    a.time = 0.5;
    assert.equal(value.get(), expected);
    assert.deepEqual(frames, original);
    a.stop();
  }
});

test("complex playback keeps multiframe, spring, cancellation and end-write contracts", async () => {
  const value = api.motionValue("#000");
  const [timeline] = api.animateValues(
    () => value,
    { backgroundColor: ["#000", "#f00", "#fff"] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  timeline.time = 0.75;
  assert.equal(value.get(), "rgba(255, 180, 180, 1)");
  timeline.cancel();
  assert.equal(value.get(), "rgba(0, 0, 0, 1)");
  timeline.stop();
  const [spring] = api.animateValues(
    () => value,
    { backgroundColor: ["#000", "#fff"] },
    { type: "spring", stiffness: 550, damping: 30, autoplay: false },
  );
  spring.time = 0.1;
  assert.match(value.get(), /^rgba\(/);
  spring.complete();
  await spring.finished;
  assert.equal(value.get(), "rgba(255, 255, 255, 1)");
  spring.stop();
});
