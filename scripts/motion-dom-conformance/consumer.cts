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
animateValue({
  keyframes: [0, 1],
  type: "spring",
  stiffness: 550,
  damping: 30,
});
// @ts-expect-error string interpolation is not built yet
keyframes({ keyframes: ["red", "blue"] });
void generated;

import { spring, calcGeneratorDuration } from "vmotion-dom";
const physics = spring({ keyframes: [0, 1], stiffness: 550, damping: 30 });
physics.retarget([0.5, 2], physics.velocity(50));
const settlingTime: number = calcGeneratorDuration(physics);
animateValue({ keyframes: [0, 1], type: spring, visualDuration: 0.3 });
// @ts-expect-error inertia is not built yet
animateValue({ keyframes: [0, 1], type: "inertia" });
void settlingTime;

import {
  styleEffect,
  attrEffect,
  svgEffect,
  propEffect,
  resolveElements,
  releaseElement,
} from "vmotion-dom";
const targets: Element[] = resolveElements(null);
const detach = styleEffect(targets, { opacity: position });
attrEffect(targets, { dataProgress: position });
svgEffect(targets, { pathLength: position });
propEffect({ progress: 0 }, { progress: position });
const effectValue = styleEffect.get(targets, "opacity");
if (targets[0]) {
  styleEffect.flush(targets[0]);
  releaseElement(targets[0]);
}
detach();
// @ts-expect-error effects bind MotionValues, not plain values
styleEffect(targets, { opacity: 1 });
void effectValue;

import {
  animateMotionValue,
  getDefaultTransition,
  getValueTransition,
  isTransitionDefined,
} from "vmotion-dom";
position.start(
  animateMotionValue("scale", position, [null, 1], { delay: 0.3 }),
);
position.start(
  animateMotionValue("opacity", position, 1, {
    opacity: { duration: 0.3, ease: "linear" },
  }),
);
getDefaultTransition("scale", { keyframes: [0, 1] });
getValueTransition({ duration: 0.2, default: { duration: 0.3 } }, "x");
isTransitionDefined({ repeat: 1 });
// @ts-expect-error strings are outside the numeric adapter
animateMotionValue("x", position, "10px");
// @ts-expect-error a DOM node alone is not an animation owner
animateMotionValue("x", position, 1, {}, document.body);
// @ts-expect-error inertia is not built yet
animateMotionValue("x", position, 1, { type: "inertia" });

import {
  readStyleValue,
  readSVGValue,
  DOMKeyframesResolver,
  flushKeyframeResolvers,
} from "vmotion-dom";
readStyleValue(document.body, "opacity");
readSVGValue(
  document.createElementNS("http://www.w3.org/2000/svg", "svg"),
  "strokeWidth",
);
const resolver = new DOMKeyframesResolver<number | string>(
  [null, "50%"],
  (frames, final, forced) => {
    void frames;
    void final;
    void forced;
  },
  "width",
  undefined,
  { current: document.body },
);
resolver.scheduleResolve();
resolver.cancel();
resolver.resume();
flushKeyframeResolvers();
// @ts-expect-error invalid keyframe object
new DOMKeyframesResolver([{}], () => {});

import { animateSingleValue } from "vmotion-dom";
animateSingleValue(position, [null, 1], { duration: 0.3 });
animateSingleValue(0, 10, { onUpdate: (x) => x.toFixed(2) });
// @ts-expect-error string mixing is not implemented
animateSingleValue("red", "blue");

import { animateElement, animateValues } from "vmotion-dom";
const elementControls = animateElement(
  document.body,
  { opacity: 1, x: [null, "20px"] },
  { duration: 0.3 },
);
elementControls[0]!.pause();
elementControls[0]!.time = 0.1;
void elementControls[0]!.finished;
animateValues(() => position, { x: 10 }, { x: { type: "spring" } });
// @ts-expect-error selectors belong to the future high-level animate wrapper
animateElement(".selector", { opacity: 1 });
// @ts-expect-error object and color mixing is not implemented
animateElement(document.body, { value: { nested: 1 } });

import { handOffElementState, type ElementRenderer } from "vmotion-dom";
declare const renderer: ElementRenderer;
handOffElementState(document.body, renderer);
animateElement(document.body, { opacity: [0, 1] }, { duration: 0.3 }, renderer);
// @ts-expect-error renderer must support ownership and value transfer
handOffElementState(document.body, { current: document.body });

import { KeyframeResolver, type AnimationElement } from "vmotion-dom";
class CustomResolver extends KeyframeResolver<number | string> {
  readKeyframes() {
    this.unresolvedKeyframes = this.unresolvedKeyframes.map((x) =>
      x === "token" ? 20 : x,
    );
    super.readKeyframes();
  }
}
const customOwner: AnimationElement = {
  current: document.body,
  getProps: () => ({}),
  KeyframeResolver: CustomResolver,
};
const stringValue = motionValue<number | string>(0);
stringValue.start(
  animateMotionValue("x", stringValue, "token", { duration: 0.3 }, customOwner),
);
animateMotionValue("x", position, [0, 1], { duration: 0.3 }, undefined, true);
import { GroupAnimation } from "vmotion-dom";
const grouped = new GroupAnimation([]);
const groupedDone: Promise<unknown[]> = grouped.finished;
