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
