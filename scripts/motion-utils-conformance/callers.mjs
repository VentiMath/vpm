import { motionValue, animateValue, interpolate, stagger } from "motion-dom";
import { easeInOut } from "motion-utils";
export function run() {
  const updates = [],
    value = motionValue(0),
    off = value.on("change", (x) => updates.push(x));
  value.set(1);
  value.set(1);
  value.set(2);
  off();
  value.set(3);
  const traces = [];
  for (const ease of [
    "linear",
    "easeIn",
    "easeOut",
    "easeInOut",
    "backOut",
    [0.35, 0.17, 0.3, 0.86],
  ]) {
    const animation = animateValue({
      keyframes: [0, 1],
      duration: 300,
      ease,
      autoplay: false,
    });
    traces.push(
      [0, 30, 75, 150, 225, 270, 300].map((t) => animation.sample(t).value),
    );
    animation.stop();
  }
  const mapper = interpolate([0, 0.5, 1], [0, 0.3, 1], { ease: easeInOut });
  const offsets = stagger(0.05, { from: "center" });
  value.destroy();
  return {
    updates,
    traces,
    mapped: [0, 0.25, 0.5, 0.75, 1].map(mapper),
    stagger: [0, 1, 2, 3, 4].map((i) => offsets(i, 5)),
  };
}
export function regression() {
  const value = motionValue(0),
    seen = [];
  let off;
  off = value.on("change", () => {
    seen.push("first");
    off();
  });
  value.on("change", () => seen.push("second"));
  value.set(1);
  value.destroy();
  return seen;
}
