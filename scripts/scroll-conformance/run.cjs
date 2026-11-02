"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../.."),
  from = createRequire(
    path.join(root, "scripts/sidecar-conformance/package.json"),
  );
const React = from("react"),
  { act, createElement: h } = React,
  { createRoot } = from("react-dom/client"),
  { createPortal } = from("react-dom"),
  { renderToString } = from("react-dom/server"),
  { JSDOM } = from("jsdom");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vscroll-tests-"));
fs.symlinkSync(
  path.dirname(from.resolve("react/package.json")) + "/..",
  path.join(temp, "node_modules"),
  "dir",
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function metrics(node, { top = 50, left = 0, rtl = false, axis = "y" } = {}) {
  node.style.overflowY = axis === "y" ? "auto" : "hidden";
  node.style.overflowX = axis === "x" ? "auto" : "hidden";
  node.style.direction = rtl ? "rtl" : "ltr";
  for (const [k, v] of Object.entries({
    scrollTop: top,
    scrollLeft: left,
    scrollHeight: 200,
    clientHeight: 100,
    scrollWidth: 200,
    clientWidth: 100,
  }))
    Object.defineProperty(node, k, {
      value: v,
      writable: true,
      configurable: true,
    });
  return node;
}
function dispatchWheel(node, y = 10, x = 0, ctrlKey = false) {
  const e = new window.WheelEvent("wheel", {
    deltaY: y,
    deltaX: x,
    ctrlKey,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  node.dispatchEvent(e);
  return e.defaultPrevented;
}
function dispatchTouch(node, type, x, y, count = 1) {
  const e = new window.Event(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
    point = { clientX: x, clientY: y };
  Object.defineProperties(e, {
    changedTouches: { value: [point] },
    touches: { value: Array(count).fill(point) },
  });
  node.dispatchEvent(e);
  return e.defaultPrevented;
}
async function wheel(...args) {
  await new Promise((r) => setTimeout(r, 2));
  return dispatchWheel(...args);
}
async function touch(...args) {
  await new Promise((r) => setTimeout(r, 2));
  return dispatchTouch(...args);
}
async function main() {
  for (const original of [true, false]) {
    const alias = Object.fromEntries(
      [
        "vreact-remove-scroll",
        "vreact-remove-scroll-bar",
        "vreact-style-singleton",
        "vget-nonce",
        "vuse-callback-ref",
        "vuse-sidecar",
      ].map((n) => [n, path.join(root, "packages", n)]),
    );
    alias["vreact-remove-scroll-bar/constants"] = path.join(
      root,
      "packages/vreact-remove-scroll-bar/constants.cjs",
    );
    const subject = original
      ? from.resolve("react-remove-scroll")
      : path.join(root, "packages/vreact-remove-scroll/index.cjs");
    const ui = original
      ? from.resolve("react-remove-scroll/UI")
      : path.join(root, "packages/vreact-remove-scroll/ui.cjs");
    const car = original
      ? from.resolve("react-remove-scroll/sidecar")
      : path.join(root, "packages/vreact-remove-scroll/sidecar.cjs");
    const sidecar = original
      ? from.resolve("use-sidecar")
      : path.join(root, "packages/vuse-sidecar/index.cjs");
    const env = original
      ? path.join(path.dirname(from.resolve("use-sidecar")), "env.js")
      : path.join(root, "packages/vuse-sidecar/env.cjs");
    const bundle = path.join(temp, original ? "original.cjs" : "vpm.cjs");
    from("esbuild").buildSync({
      stdin: {
        contents: `exports.env=require(${JSON.stringify(env)}).env;exports.api=require(${JSON.stringify(subject)});exports.UI=require(${JSON.stringify(ui)});exports.Sidecar=require(${JSON.stringify(car)});exports.loader=require(${JSON.stringify(sidecar)}).sidecar;`,
        resolveDir: root,
      },
      bundle: true,
      outfile: bundle,
      platform: "node",
      external: ["react", "react-dom"],
      alias,
    });
    const { api, UI, Sidecar, loader, env: environment } = require(bundle),
      C = api.RemoveScroll;
    const ssr = JSDOM.fragment(
      renderToString(h(C, { className: "lock", id: "ssr" }, "body")),
    ).firstChild;
    assert.equal(ssr.id, "ssr");
    assert.equal(ssr.className, "lock");
    assert.equal(ssr.textContent, "body");
    assert.deepEqual(C.classNames, {
      fullWidth: "width-before-scroll-bar",
      zeroRight: "right-scroll-bar-position",
    });
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body><aside id="outside"></aside></body></html>',
    );
    for (const name of ["window", "document", "Element", "Node", "ShadowRoot"])
      globalThis[name] =
        name === "window"
          ? dom.window
          : name === "document"
            ? dom.window.document
            : dom.window[name];
    environment.isNode = false;
    const host = document.createElement("main");
    document.body.append(host);
    const view = createRoot(host),
      outside = document.getElementById("outside");
    let cases = 0;
    const listeners = { wheel: 0, touchmove: 0, touchstart: 0 };
    const add = document.addEventListener.bind(document),
      remove = document.removeEventListener.bind(document);
    document.addEventListener = (name, fn, opts) => {
      if (name in listeners) listeners[name]++;
      add(name, fn, opts);
    };
    document.removeEventListener = (name, fn, opts) => {
      if (name in listeners) listeners[name]--;
      remove(name, fn, opts);
    };
    const render = (
      props = {},
      children = h("section", { id: "inside" }, "content"),
    ) => act(() => view.render(h(C, props, children)));
    try {
      render({ enabled: false });
      assert.equal(await wheel(outside), false);
      assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
      cases++;
      render();
      const inside = metrics(document.getElementById("inside"));
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      assert.equal(await wheel(outside), true);
      assert.equal(await wheel(inside), false);
      inside.scrollTop = 100;
      assert.equal(await wheel(inside), true);
      inside.scrollTop = 0;
      assert.equal(await wheel(inside, -10), true);
      assert.equal(await wheel(inside), false);
      cases++;
      render({ noIsolation: true });
      assert.equal(await wheel(outside), false);
      inside.scrollTop = 100;
      assert.equal(await wheel(inside), true);
      cases++;
      render();
      metrics(inside, { axis: "x", left: 50 });
      assert.equal(await wheel(inside, 0, 10), false);
      inside.scrollLeft = 100;
      assert.equal(await wheel(inside, 0, 10), true);
      inside.scrollLeft = 0;
      assert.equal(await wheel(inside, 0, -10), true);
      cases++;
      metrics(inside, { axis: "x", left: -50, rtl: true });
      host.firstChild.style.direction = "rtl";
      assert.equal(await wheel(inside, 0, -10), false);
      inside.scrollLeft = -100;
      assert.equal(await wheel(inside, 0, -10), true);
      inside.scrollLeft = 0;
      assert.equal(await wheel(inside, 0, 10), true);
      host.firstChild.style.direction = "ltr";
      cases++;
      render(
        {},
        h("section", { id: "parent" }, h("div", { id: "nested" }, "nested")),
      );
      const p = metrics(document.getElementById("parent")),
        n = metrics(document.getElementById("nested"), { top: 100 });
      assert.equal(await wheel(n), false);
      p.scrollTop = 100;
      assert.equal(await wheel(n), true);
      cases++;
      metrics(outside);
      const shard = React.createRef();
      shard.current = outside;
      render({ shards: [shard] });
      assert.equal(await wheel(outside), false);
      outside.scrollTop = 100;
      assert.equal(await wheel(outside), true);
      cases++;
      const portal = document.createElement("aside");
      document.body.append(portal);
      render({}, createPortal(h("div", { id: "portal" }, "portal"), portal));
      const portalNode = metrics(document.getElementById("portal"));
      assert.equal(await wheel(portalNode), false);
      portalNode.scrollTop = 100;
      assert.equal(await wheel(portalNode), true);
      portal.remove();
      cases++;
      render(
        {},
        h(
          "div",
          { id: "outer" },
          h(C, null, h("div", { id: "inner" }, "inner")),
        ),
      );
      const outer = metrics(document.getElementById("outer")),
        inner = metrics(document.getElementById("inner"));
      assert.deepEqual(listeners, {
        wheel: original ? 2 : 1,
        touchmove: original ? 2 : 1,
        touchstart: original ? 2 : 1,
      });
      assert.equal(document.body.getAttribute("data-scroll-locked"), "2");
      assert.equal(await wheel(outer), true);
      assert.equal(await wheel(inner), false);
      render();
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      cases++;
      const t = metrics(document.getElementById("inside"));
      await new Promise((r) => setTimeout(r, 3));
      assert.equal(dispatchWheel(t), false);
      t.scrollTop = 100;
      assert.equal(dispatchWheel(t), !original);
      t.scrollTop = 50;
      cases++;
      await touch(t, "touchstart", 0, 100);
      assert.equal(await touch(t, "touchmove", 0, 90), false);
      t.scrollTop = 100;
      assert.equal(await touch(t, "touchmove", 0, 80), true);
      assert.equal(await touch(t, "touchmove", 0, 95), original);
      cases++;
      assert.equal(await wheel(t, 10, 0, true), true);
      render({ allowPinchZoom: true });
      assert.equal(await wheel(t, 10, 0, true), false);
      assert.equal(await touch(t, "touchmove", 0, 60, 2), false);
      render();
      assert.equal(await touch(t, "touchmove", 0, 60, 2), true);
      cases++;
      render({}, h("input", { id: "range", type: "range" }));
      const range = document.getElementById("range");
      await touch(range, "touchstart", 100, 0);
      assert.equal(await touch(range, "touchmove", 90, 0), false);
      cases++;
      render({ inert: true, shards: [outside] });
      assert.match(document.body.className, /block-interactivity/);
      assert.match(outside.className, /allow-interactivity/);
      render({ inert: false });
      assert.equal(document.body.className, "");
      assert.equal(outside.className, "");
      cases++;
      let user = 0,
        child = 0;
      const childRef = React.createRef(),
        parentRef = React.createRef();
      render(
        { forwardProps: true, ref: parentRef, onWheelCapture: () => user++ },
        h(
          "article",
          { id: "forwarded", ref: childRef, onWheelCapture: () => child++ },
          "ref",
        ),
      );
      const forwarded = metrics(document.getElementById("forwarded"));
      assert.equal(parentRef.current, forwarded);
      assert.equal(childRef.current, original ? null : forwarded);
      await wheel(forwarded);
      assert.equal(user, original ? 0 : 1);
      assert.equal(child, original ? 0 : 1);
      render({ enabled: false });
      assert.equal(parentRef.current, null);
      cases++;
      act(() =>
        view.render(
          h(
            React.StrictMode,
            null,
            h(C, null, h("div", { id: "strict" }, "strict")),
          ),
        ),
      );
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      assert.equal(await wheel(outside), true);
      cases++;
      render({}, h("div", { id: "shadow-host" }));
      const shadow = document
          .getElementById("shadow-host")
          .attachShadow({ mode: "open" }),
        shadowChild = document.createElement("div");
      shadow.append(shadowChild);
      metrics(shadowChild);
      assert.equal(await wheel(shadowChild), original);
      shadowChild.scrollTop = 100;
      assert.equal(await wheel(shadowChild), true);
      cases++;
      const Lazy = loader(() => Promise.resolve(Sidecar));
      await act(async () => {
        view.render(
          h(
            UI.RemoveScroll,
            { sideCar: Lazy },
            h("div", { id: "lazy" }, "lazy"),
          ),
        );
        await new Promise((r) => setTimeout(r, 20));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
      assert.equal(await wheel(outside), true);
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      cases++;
      act(() => view.unmount());
      assert.equal(await wheel(outside), false);
      assert.equal(document.head.querySelectorAll("style").length, 0);
      assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
      assert.deepEqual(listeners, { wheel: 0, touchmove: 0, touchstart: 0 });
      console.log(
        `${original ? "Original" : "VPM"}: ${cases} SSR/DOM/event/portal/ref/sidecar scenarios pass.`,
      );
    } finally {
      dom.window.close();
      for (const name of [
        "window",
        "document",
        "Element",
        "Node",
        "ShadowRoot",
      ])
        delete globalThis[name];
    }
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temp, { recursive: true, force: true }));
