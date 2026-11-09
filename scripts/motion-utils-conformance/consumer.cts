import {
  SubscriptionManager,
  cubicBezier,
  easingDefinitionToFunction,
  MotionGlobalConfig,
  memo,
  type Easing,
  type Point,
  type TransformPoint,
} from "vmotion-utils";
const listeners = new SubscriptionManager<
  (value: number, label: string) => void
>();
const off = listeners.add((value, label) => label.slice(value));
listeners.notify(1, "x");
off();
const easing: Easing = [0.42, 0, 1, 1];
const value: number = easingDefinitionToFunction(easing)(0.5);
const transform: TransformPoint = (p: Point) => ({ x: p.x + 1, y: p.y });
const cached: () => Point = memo(() => transform({ x: 0, y: 0 }));
MotionGlobalConfig.skipAnimations = true;
cubicBezier(0.1, 0.2, 0.3, 0.4)(0.5);
// @ts-expect-error Subscriber argument type is preserved.
listeners.notify("1", "x");
// @ts-expect-error A Bezier tuple has exactly four controls.
const invalid: Easing = [0, 1];
// @ts-expect-error Rendering components belong to a different package.
import { motion } from "vmotion-utils";
void [value, cached];
