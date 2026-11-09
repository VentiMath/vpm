import { interpolate, stagger, mixNumber } from "vmotion-dom";
const opacity: number = interpolate([0, 1], [0, 1])(0.5);
const point: { x: number } = interpolate([0, 1], [{ x: 0 }, { x: 2 }], {
  mixer: (a, b) => (p) => ({ x: mixNumber(a.x, b.x, p) }),
})(0.5);
stagger(0.05, { from: "center", ease: "easeIn" })(0, 4);
// @ts-expect-error string mixing needs an explicit mixer at this stage
interpolate([0, 1], ["red", "blue"]);
// @ts-expect-error numeric results remain numbers
const bad: string = opacity;
// @ts-expect-error grid staggering is not built yet
stagger(0.1, { grid: [2, 2] });
// @ts-expect-error renderer has not been implemented
import { animate } from "vmotion-dom";
void point;
void bad;
void animate;

import {
  motionValue,
  frame,
  cancelFrame,
  createRenderBatcher,
  processFrame,
  MotionValue,
} from "vmotion-dom";
const position = motionValue(0);
position.on("change", (x) => x.toFixed());
position.setWithVelocity(0, 10, 16);
position.attach(
  (x, set) => set(x + 1),
  () => {},
);
const completion: Promise<void> = position.start((done) => {
  done();
  return { stop() {} };
});
const callback = frame.render((data) => data.timestamp.toFixed());
cancelFrame(callback);
createRenderBatcher((callback) => callback(), false);
processFrame(100);
// @ts-expect-error numeric values reject strings
position.set("bad");
// @ts-expect-error unsupported subscription event
position.on("bogus", () => {});
// @ts-expect-error a frame callback receives FrameData, not a number
frame.update((data: number) => {});
const optional = new MotionValue<number | undefined>(undefined);
const maybe: number | undefined = optional.getCurrent();
void completion;
void maybe;

import { animateValue, keyframes, JSAnimation } from "vmotion-dom";
const generator = keyframes({ keyframes: [0, 1], ease: [0.2, 0.1, 0.7, 1] });
const generated: number = generator.next(20).value;
const playback: JSAnimation = animateValue({
  keyframes: [0, 1],
  duration: 300,
  autoplay: false,
  repeatType: "reverse",
});
playback.time = 0.15;
playback.speed = -1;
position.start((done) =>
  animateValue({
    keyframes: [0, 1],
    onUpdate: (x) => position.set(x),
    onComplete: done,
  }),
);
// @ts-expect-error spring playback is not built yet
animateValue({ keyframes: [0, 1], type: "spring" });
// @ts-expect-error string interpolation is not built yet
keyframes({ keyframes: ["red", "blue"] });
void generated;
