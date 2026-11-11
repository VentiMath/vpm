import Ps from "perfect-scrollbar";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
window.scrollbarVariant = __VARIANT__;
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  assert = (x, m) => {
    if (!x) throw Error(m);
  };
function box(opts = {}, doc = document) {
  const el = doc.createElement("div");
  el.style.cssText = "position:relative;width:300px;height:200px;";
  const content = doc.createElement("div");
  content.style.cssText = "width:600px;height:800px;";
  content.textContent = "VentiMath content";
  el.append(content);
  doc.body.append(el);
  const p = new Ps(el, opts);
  return {
    el,
    content,
    p,
    close() {
      p.destroy();
      el.remove();
    },
  };
}
function snapshot(f) {
  const p = f.p;
  return {
    width: p.containerWidth,
    height: p.containerHeight,
    contentWidth: p.contentWidth,
    contentHeight: p.contentHeight,
    x: p.scrollbarXActive,
    y: p.scrollbarYActive,
    left: f.el.scrollLeft,
    top: f.el.scrollTop,
    reach: p.reach,
    thumbX: Math.round(p.scrollbarX.getBoundingClientRect().width),
    thumbY: Math.round(p.scrollbarY.getBoundingClientRect().height),
  };
}
window.runScrollbars = async () => {
  const rows = [];
  let f = box();
  rows.push(snapshot(f));
  f.el.scrollTop = 100;
  f.el.scrollLeft = 60;
  await wait(40);
  rows.push(snapshot(f));
  let ev = new WheelEvent("wheel", {
    deltaY: 50,
    cancelable: true,
    bubbles: true,
  });
  f.el.dispatchEvent(ev);
  await wait(30);
  rows.push([f.el.scrollTop, ev.defaultPrevented]);
  assert(f.el.scrollTop === 150, "wheel scroll");

  f.el.scrollTop = 600;
  await wait(30);
  ev = new WheelEvent("wheel", { deltaY: 50, cancelable: true, bubbles: true });
  f.el.dispatchEvent(ev);
  rows.push(ev.defaultPrevented);
  assert(!ev.defaultPrevented, "boundary propagation");
  const input = document.createElement("input");
  f.content.append(input);
  input.focus({ preventScroll: true });
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Home",
      keyCode: 36,
      bubbles: true,
      cancelable: true,
    }),
  );
  assert(f.el.scrollTop === 600, "input keys preserved");
  f.close();
  for (const opts of [
    { suppressScrollX: true },
    { suppressScrollY: true },
    { minScrollbarLength: 80 },
    { maxScrollbarLength: 25 },
    { scrollXMarginOffset: 400, scrollYMarginOffset: 700 },
  ]) {
    f = box(opts);
    rows.push(snapshot(f));
    f.close();
  }
  f = box({ wheelPropagation: false });
  f.el.scrollTop = 600;
  f.p.update();
  ev = new WheelEvent("wheel", { deltaY: 10, cancelable: true });
  f.el.dispatchEvent(ev);
  assert(ev.defaultPrevented, "propagation disabled");
  f.close();
  rows.push("contained");
  f = box();
  f.el.scrollTop = 100;
  f.p.update();
  const rect = f.p.scrollbarYRail.getBoundingClientRect();
  f.p.scrollbarYRail.dispatchEvent(
    new MouseEvent("mousedown", {
      clientX: rect.x + 4,
      clientY: rect.bottom - 5,
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );
  await wait(30);
  rows.push(f.el.scrollTop);
  assert(f.el.scrollTop === 300, "rail page");
  f.close();
  // Public lifecycle pattern used by FuseScrollbars, including StrictMode cleanup.
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let instances = [];
  function Caller() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const p = new Ps(ref.current, {
        wheelPropagation: true,
        suppressScrollX: true,
      });
      instances.push(p);
      return () => p.destroy();
    }, []);
    return React.createElement(
      "div",
      { ref, style: { position: "relative", width: 300, height: 200 } },
      React.createElement(
        "div",
        { style: { height: 800, width: 400 } },
        "Caller",
      ),
    );
  }
  flushSync(() =>
    root.render(
      React.createElement(React.StrictMode, null, React.createElement(Caller)),
    ),
  );
  assert(
    host.querySelectorAll(".ps__rail-y").length === 1,
    "strict mode one rail",
  );
  flushSync(() => root.unmount());
  assert(
    instances.every((p) => !p.isAlive),
    "caller teardown",
  );
  host.remove();
  rows.push("caller cleanup");
  return rows;
};
let drag;
window.prepareDrag = () => {
  drag = box();
  const r = drag.p.scrollbarY.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
window.finishDrag = () => {
  const top = drag.el.scrollTop;
  assert(top > 0, "thumb drag moved content");
  drag.close();
  return top;
};
window.checkOwnership = async () => {
  const direction = box();
  const oldDirection = document.documentElement.getAttribute("dir");
  document.documentElement.dir = "rtl";
  await wait(100);
  assert(direction.p.isRtl, "ancestor direction refresh");
  direction.close();
  if (oldDirection === null) document.documentElement.removeAttribute("dir");
  else document.documentElement.setAttribute("dir", oldDirection);

  let f = box();
  f.content.style.height = "1200px";
  await wait(100);
  assert(f.p.contentHeight === 1200, "automatic content resize");
  f.el.scrollTop = 200;
  await wait(30);
  const elRect = f.el.getBoundingClientRect(),
    rail = f.p.scrollbarYRail.getBoundingClientRect();
  assert(Math.abs(elRect.top - rail.top) < 1, "rail remains in viewport");
  const thumb = f.p.scrollbarY;
  assert(
    thumb.getAttribute("role") === "scrollbar" &&
      thumb.getAttribute("aria-valuenow") === "200",
    "scrollbar accessibility",
  );
  f.close();
  f = box();
  f.el.style.direction = "rtl";
  f.p.update();
  f.el.scrollLeft = -150;
  await wait(40);
  assert(f.p.isRtl && f.el.scrollLeft === -150, "RTL native position");
  const tr = f.p.scrollbarX.getBoundingClientRect(),
    er = f.el.getBoundingClientRect();
  assert(
    tr.left >= er.left - 1 && tr.right <= er.right + 1,
    "RTL thumb bounds",
  );
  f.close();
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const doc = iframe.contentDocument;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vpm/scrollbar.css";
  doc.head.append(link);
  await new Promise((r) => (link.onload = r));
  f = box({}, doc);
  let count = 0;
  f.el.addEventListener("ps-scroll-y", () => count++);
  f.el.dispatchEvent(
    new iframe.contentWindow.WheelEvent("wheel", {
      deltaY: 30,
      cancelable: true,
    }),
  );
  await wait(30);
  assert(f.el.scrollTop === 30 && count === 1, "owner realm scroll");
  f.close();
  iframe.remove();
  f = box();
  const el = f.el;
  f.p.destroy();
  el.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, cancelable: true }));
  assert(el.scrollTop === 0, "destroy removes handlers");
  f.close();
  return true;
};

let keyboard;
window.prepareKeyboard = () => {
  keyboard = box();
  keyboard.p.scrollbarY.focus({ preventScroll: true });
};
window.finishKeyboard = () => {
  const top = keyboard.el.scrollTop;
  keyboard.close();
  return top;
};
