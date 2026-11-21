import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ThemeProvider } from "@emotion/react";
import Grow from "@grow";
import Paper from "@grow-paper";
import { scene } from "./grow-scene.jsx";

const hydration = document.getElementById("hydration");
const host =
  hydration || document.body.appendChild(document.createElement("main"));
const initialChild = hydration?.firstElementChild;
function InitialMenu() {
  React.useEffect(() => {
    window.hydrated = initialChild === host.firstElementChild;
  }, []);
  return scene({in:false});
}
const root = hydration ? hydrateRoot(host, <InitialMenu />) : createRoot(host);
window.host = host;
window.events = [];
const hooks = {};
for (const phase of [
  "Enter",
  "Entering",
  "Entered",
  "Exit",
  "Exiting",
  "Exited",
])
  hooks["on" + phase] = (el, appearing) => {
    window.events.push({
      phase,
      appearing: appearing ?? null,
      id: el.id,
      opacity: el.style.opacity,
      transform: el.style.transform,
      durations: el.style.transitionDuration,
      delays: el.style.transitionDelay,
    });
  };
const callbackRef = (el) => {
  window.lastRef = el;
  return () => {
    window.lastRef = null;
  };
};
const transitions = {
  easing: { easeInOut: "ease" },
  duration: { standard: 300 },
  getAutoHeightDuration: () => 30,
  create: (prop, { duration = 300, easing = "ease", delay = 0 } = {}) =>
    prop +
    " " +
    (typeof duration === "number" ? Math.round(duration) + "ms" : duration) +
    " " +
    easing +
    " " +
    (typeof delay === "number" ? Math.round(delay) + "ms" : delay),
};
window.draw = (open, options = {}, theme = null) => {
  const child = (
    <Grow
      in={open}
      {...hooks}
      ref={callbackRef}
      id="menu"
      style={{ transformOrigin: "0 0 0" }}
      {...options}
    >
      <section style={{ height: 64 }}>
        <button>Archive</button>
      </section>
    </Grow>
  );
  flushSync(() =>
    root.render(
      theme ? (
        <ThemeProvider theme={{ transitions, ...theme }}>{child}</ThemeProvider>
      ) : (
        child
      ),
    ),
  );
};
window.drawApp = (opened, dense = false) => {
  window.toggles = [];
  const element = window.renderOriginal({
    React,
    Grow,
    Paper,
    clsx: (...parts) => parts.filter(Boolean).join(" "),
    FuseNavItem: ({ item, nestedLevel }) => (
      <li data-depth={nestedLevel}>
        <button>{item.title}</button>
      </li>
    ),
    opened,
    dense,
    nestedLevel: 2,
    item: { children: [{ id: "contests", type: "item", title: "Contests" }] },
    handleToggle: (open) => window.toggles.push(open),
  });
  flushSync(() => root.render(element));
};
window.finish = () => flushSync(() => root.render(null));
const settle = (node, done) => done();
window.cycle = () => {
  window.events.length = 0;
  window.draw(true, { timeout: 0, addEndListener: settle });
  window.draw(false, { timeout: 0, addEndListener: settle });
  return window.events.map((e) => e.phase).join(",");
};
