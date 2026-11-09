import * as vpm from "../../packages/vmotion-dom/index.mjs";
import current from "../motion-utils-conformance/node_modules/motion-dom/dist/cjs/index.js";
import app from "../motion-utils-conformance/node_modules/motion-dom-app/dist/cjs/index.js";
window.runMotionDom = async () => {
  const rows = [];
  for (const [variant, api] of [
    ["current", current],
    ["app", app],
    ["vpm", vpm],
  ]) {
    const node = document.createElement("div");
    document.body.append(node);
    const opacity = api.interpolate([0, 0.5, 1], [0, 0.3, 1]),
      translate = api.interpolate([0, 1], [0, 48]);
    const samples = [];
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      node.style.opacity = String(opacity(t));
      node.style.transform = `translateX(${translate(t)}px)`;
      await new Promise(requestAnimationFrame);
      samples.push([
        getComputedStyle(node).opacity,
        getComputedStyle(node).transform,
      ]);
    }
    const delays = [0, 1, 2, 3, 4].map((i) =>
      api.stagger(0.05, { from: "center" })(i, 5),
    );
    node.remove();
    rows.push({ variant, samples, delays });
  }
  return rows;
};
