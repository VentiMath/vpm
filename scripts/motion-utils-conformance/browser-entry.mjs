import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { motion, motionValue } from "framer-motion";
const frame = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
const near = (actual, expected) => {
  if (Math.abs(Number(actual) - expected) > 0.0001)
    throw Error(`Style ${actual} != ${expected}`);
};
export async function run() {
  const host = document.createElement("section");
  document.body.append(host);
  const root = createRoot(host);
  // The contest grids use a duration-.3 opacity transition. Finish it in the
  // browser before asserting; separately exercise live value subscriptions.
  flushSync(() =>
    root.render(
      React.createElement(
        motion.div,
        {
          id: "grid",
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3, ease: "easeOut" },
        },
        "AMC exams",
      ),
    ),
  );
  for (let i = 0; i < 90 && Number(host.firstChild?.style.opacity) < 1; i++)
    await frame();
  near(getComputedStyle(host.firstChild).opacity, 1);
  const x = motionValue(0),
    opacity = motionValue(0.25);
  flushSync(() =>
    root.render(
      React.createElement(
        motion.div,
        { key: "values", initial: false, style: { x, opacity } },
        "Putnam papers",
      ),
    ),
  );
  await frame();
  x.set(24);
  opacity.set(0.75);
  await frame();
  const element = host.firstChild;
  near(getComputedStyle(element).opacity, 0.75);
  if (!element.style.transform.includes("24px"))
    throw Error("Motion transform did not update");
  x.set(48);
  opacity.set(0.5);
  await frame();
  near(getComputedStyle(element).opacity, 0.5);
  if (element !== host.firstChild || !element.style.transform.includes("48px"))
    throw Error("Motion subscriptions lost their node or update");
  flushSync(() => root.unmount());
  x.set(96);
  opacity.set(1);
  await frame();
  if (host.childNodes.length) throw Error("Unmount left children");
  x.destroy();
  opacity.destroy();
  host.remove();
  return { fade: true, transform: true, updates: true, unmounted: true };
}
