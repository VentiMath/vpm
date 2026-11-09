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
    let writes = 0;
    const value = api.motionValue(0);
    const render = () => {
      node.style.opacity = String(value.get());
      writes++;
    };
    const off = value.on("change", () => api.frame.render(render));
    for (let i = 1; i <= 20; i++) value.set(i / 20);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const batched = { writes, opacity: getComputedStyle(node).opacity };
    off();
    api.cancelFrame(render);
    value.destroy();
    node.remove();
    rows.push({ variant, samples, delays, batched });
  }
  for (const control of [current, app]) {
    const value = vpm.motionValue(0),
      node = document.createElement("div");
    document.body.append(node);
    const render = () => {
      node.style.opacity = String(value.get());
    };
    value.on("change", () => vpm.frame.render(render));
    await value.start(
      control.animateMotionValue("opacity", value, 1, {
        duration: 0.05,
        ease: "linear",
      }),
    );
    await new Promise(requestAnimationFrame);
    if (value.get() !== 1 || getComputedStyle(node).opacity !== "1")
      throw Error("unchanged animation caller failed");
    vpm.cancelFrame(render);
    value.destroy();
    node.remove();
  }
  return rows;
};
