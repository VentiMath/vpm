import { checkSubjects } from "./subjects-browser.mjs";
import { animate as subjectCurrentAnimate } from "../motion-utils-conformance/node_modules/framer-motion/dom";
import { animate as subjectAppAnimate } from "../motion-utils-conformance/node_modules/framer-motion-app/dom";
import {checkCustomEffects} from "./custom-effects-browser.mjs";
import {checkSelectors} from "./selectors-browser.mjs";
import {checkNeutral} from "./neutral-browser.mjs";
import {checkMixers} from "./mixers-browser.mjs";
import {checkGroups} from "./groups-browser.mjs";
import {checkRendererAnimations} from "./renderer-browser.mjs";
import {checkHandoff} from "./handoff-browser.mjs";
import {checkElements} from "./elements-browser.mjs";
import { checkReads } from "./reads-browser.mjs";
import { checkTransitions } from "./browser-transitions.mjs";
import { checkEffects } from "./effects-browser.mjs";
import * as vpm from "../../packages/vmotion-dom/index.mjs";
import current from "../motion-utils-conformance/node_modules/motion-dom/dist/cjs/index.js";
import app from "../motion-utils-conformance/node_modules/motion-dom-app/dist/cjs/index.js";
window.runMotionDom = async () => {
  const rows = [];
  const gridHost=document.createElement("div");document.body.append(gridHost);
  const gridNodes=Array.from({length:9},()=>{const n=document.createElement("div");gridHost.append(n);return n;});
  const gridDelay=vpm.stagger(.1,{grid:[3,3],from:"center"});
  const gridControls=vpm.animate(gridNodes,{opacity:[0,1]},{duration:1,ease:"linear",delay:gridDelay,autoplay:false});
  gridControls.time=.5;
  await new Promise(requestAnimationFrame);
  for(let i=0;i<gridNodes.length;i++){
    const expected=.5-current.stagger(.1,{grid:[3,3],from:"center"})(i,9);
    if(Math.abs(parseFloat(gridNodes[i].style.opacity)-expected)>1e-5)throw Error("Grid delays must reach selector playback");
  }
  gridControls.stop();gridNodes.forEach(n=>vpm.releaseElement(n));gridHost.remove();
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
  for (const [index, api] of [current, app, vpm].entries()) {
    const node = document.createElement("div");
    document.body.append(node);
    let writes = 0;
    const animation = api.animateValue({
      keyframes: [0, 1],
      duration: 120,
      ease: "linear",
      onUpdate: (value) => {
        node.style.opacity = String(value);
        writes++;
      },
    });
    await new Promise(requestAnimationFrame);
    animation.pause();
    const atPause = node.style.opacity;
    // Upstream publishes its pause-time value on the next frame. Compare stable
    // paused frames after that delivery; VPM must stop publishing immediately.
    await new Promise(requestAnimationFrame);
    const paused = node.style.opacity;
    if (api === vpm && paused !== atPause)
      throw Error("VPM changed after pause");
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    if (node.style.opacity !== paused)
      throw Error(
        `paused playback moved: variant ${index}, ${paused} => ${node.style.opacity}`,
      );
    animation.play();
    await animation.finished;
    if (getComputedStyle(node).opacity !== "1" || writes < 2)
      throw Error("numeric playback failed");
    const stopped = api.animateValue({
      keyframes: [1, 0],
      duration: 1000,
      onUpdate: () => writes++,
    });
    await new Promise(requestAnimationFrame);
    stopped.stop();
    const count = writes;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    if (writes !== count) throw Error("stopped animation retained frame work");
    rows[index].playback = {
      opacity: getComputedStyle(node).opacity,
      paused: true,
      stopped: true,
    };
    node.remove();
  }
  for (const api of [current, app, vpm]) {
    const node = document.createElement("div");
    document.body.append(node);
    const samples = [];
    const animation = api.animateValue({
      keyframes: [0, 1],
      type: "spring",
      stiffness: 550,
      damping: 30,
      restSpeed: 10,
      onUpdate: (value) => {
        samples.push(value);
        node.style.transform = `scale(${value})`;
      },
    });
    await animation.finished;
    if (samples.at(-1) !== 1 || !samples.some((x) => x > 0 && x < 1))
      throw Error("calendar spring did not render");
    if (getComputedStyle(node).transform !== "matrix(1, 0, 0, 1, 0, 0)")
      throw Error("spring final transform");
    // The unchanged upstream controller also accepts the VPM spring generator.
    if (api !== vpm)
      await api.animateValue({
        keyframes: [0, 1],
        type: vpm.spring,
        stiffness: 550,
        damping: 30,
        restSpeed: 10,
      }).finished;
    node.remove();
  }
  await checkEffects([current, app, vpm]);
  await checkTransitions([current, app, vpm]);
  await checkReads([current, app, vpm]);
  await checkElements(current,vpm);
  await checkHandoff(current,vpm);
  await checkRendererAnimations(current,vpm);
  await checkGroups(current,vpm);
  await checkMixers(current,app,vpm);
  await checkNeutral(vpm);
  await checkSelectors(vpm);
  await checkCustomEffects(current, vpm);
  await checkSubjects(current, app, vpm, subjectCurrentAnimate, subjectAppAnimate);
  for (const api of [current, app, vpm]) {
    const node = document.createElement("div");
    document.body.append(node);
    const value = api.motionValue(0), detach = api.styleEffect(node, {opacity:value});
    await api.animateSingleValue(value, 1, {duration:.05, ease:"linear"}).finished;
    await new Promise(requestAnimationFrame);
    if(getComputedStyle(node).opacity!=="1")throw Error("single MotionValue animation did not paint");
    let scalar;
    await api.animateSingleValue(0, 10, {duration:.05,onUpdate:x=>scalar=x}).finished;
    if(scalar!==10)throw Error("scalar animation did not complete");
    detach();node.remove();
  }
  return rows;
};
