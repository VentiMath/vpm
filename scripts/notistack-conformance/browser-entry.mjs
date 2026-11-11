import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as api from "notistack";
window.notistackVariant = __VARIANT__;
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  assert = (x, m) => {
    if (!x) throw Error(m);
  };
const text = (host) =>
  Array.from(host.querySelectorAll("[role=alert]")).map((x) => x.textContent);
function mount(props = {}, strict = false, notifyOnMount = false) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    ref = React.createRef();
  let hook;
  function Child() {
    hook = api.useSnackbar();
    React.useLayoutEffect(() => {
      if (notifyOnMount)
        hook.enqueueSnackbar("mounted", {
          key: "mounted",
          preventDuplicate: true,
        });
    }, []);
    return React.createElement("button", { id: "caller" }, "App");
  }
  const make = () =>
    React.createElement(
      api.SnackbarProvider,
      { ref, transitionDuration: 0, autoHideDuration: null, ...props },
      React.createElement(Child),
    );
  const node = make();
  flushSync(() =>
    root.render(
      strict ? React.createElement(React.StrictMode, null, node) : node,
    ),
  );
  return {
    host,
    root,
    ref,
    rerender(next = {}) {
      Object.assign(props, next);
      flushSync(() => root.render(make()));
    },
    get hook() {
      return hook;
    },
    add: (...args) => {
      let key;
      flushSync(() => {
        key = hook.enqueueSnackbar(...args);
      });
      return key;
    },
    close: (key) => flushSync(() => hook.closeSnackbar(key)),
    dispose() {
      flushSync(() => root.unmount());
      host.remove();
    },
  };
}
window.runNotifications = async () => {
  const rows = [];
  for (const vertical of ["top", "bottom"])
    for (const horizontal of ["left", "center", "right"])
      for (const dense of [false, true]) {
        const layout = mount({ anchorOrigin: { vertical, horizontal }, dense });
        layout.add("layout");
        await wait(30);
        const box = layout.host.querySelector(".notistack-SnackbarContainer"),
          s = getComputedStyle(box),
          alert = layout.host.querySelector("[role=alert]");
        rows.push([
          vertical,
          horizontal,
          dense,
          s.top,
          s.bottom,
          s.left,
          s.right,
          s.alignItems,
          s.flexDirection,
          Math.round(alert.getBoundingClientRect().height),
        ]);
        layout.dispose();
      }

  let p = mount({
    maxSnack: 5,
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    classes: { containerRoot: "ventimath-container" },
  });
  for (const variant of ["default", "success", "error", "warning", "info"])
    p.add("VentiMath " + variant, { key: variant, variant });
  await wait(60);
  assert(p.host.querySelector(".ventimath-container"), "app class override");
  assert(text(p.host).length === 5, "five visible");
  const keys = [
    "position",
    "display",
    "flexDirection",
    "maxWidth",
    "bottom",
    "right",
    "zIndex",
  ];
  const c = p.host.querySelector(".notistack-SnackbarContainer");
  rows.push({
    messages: text(p.host),
    container: Object.fromEntries(keys.map((k) => [k, getComputedStyle(c)[k]])),
    variants: Array.from(p.host.querySelectorAll("[role=alert]")).map((n) => {
      const s = getComputedStyle(n);
      return {
        color: s.color,
        background: s.backgroundColor,
        padding: s.padding,
        font: s.fontSize,
        lineHeight: s.lineHeight,
        minWidth: s.minWidth,
      };
    }),
  });
  p.dispose();
  p = mount({ maxSnack: 2 });
  p.add("A", { key: "a" });
  p.add("B", { key: "b" });
  await wait(30);
  p.add("C", { key: "c" });
  await wait(550);
  rows.push(text(p.host));
  assert(text(p.host).join() === "B,C", "FIFO eviction");
  p.close();
  await wait(550);
  assert(text(p.host).length === 0, "close all");
  p.dispose();
  p = mount({ maxSnack: 3, preventDuplicate: true });
  p.add("same");
  p.add("same");
  p.add("other", { key: "key" });
  p.add("other again", { key: "key" });
  await wait(30);
  rows.push(text(p.host));
  assert(text(p.host).join() === "same,other", "deduplication");
  p.dispose();
  p = mount({ maxSnack: 1 });
  p.add("persist", { persist: true });
  await wait(30);
  p.add("next");
  await wait(550);
  rows.push(text(p.host));
  assert(text(p.host).join() === "next", "persistent eviction");
  p.dispose();
  const callbacks = [];
  p = mount({ onClose: (e, r, k) => callbacks.push(["provider", r, k]) });
  p.add("close", {
    key: "close",
    onClose: (e, r, k) => callbacks.push(["item", r, k]),
  });
  await wait(30);
  p.close("close");
  await wait(550);
  rows.push(callbacks);
  p.dispose();
  p = mount();
  p.add("action", {
    key: "action",
    action: (key) =>
      React.createElement("button", { onClick: () => p.close(key) }, "Dismiss"),
  });
  await wait(30);
  const button = Array.from(p.host.querySelectorAll("button")).find(
    (n) => n.textContent === "Dismiss",
  );
  flushSync(() => button.click());
  await wait(550);
  assert(text(p.host).length === 0, "action closes");
  rows.push("action");
  p.dispose();
  p = mount({ autoHideDuration: 80 });
  p.add("timeout");
  await wait(700);
  assert(text(p.host).length === 0, "auto hide");
  rows.push("timeout");
  p.dispose();
  // Preserve message markup as React text, not HTML.
  p = mount();
  p.add("<img src=x onerror=alert(1)>");
  await wait(30);
  assert(!p.host.querySelector("img"), "literal message");
  rows.push(text(p.host));
  p.dispose();
  p = mount({}, true);
  p.add("strict");
  await wait(30);
  assert(text(p.host)[0] === "strict", "strict mode");
  p.dispose();
  rows.push("strict");
  p = mount();
  p.add("stable", { key: "stable" });
  await wait(30);
  const stable = p.host.querySelector("[role=alert]");
  p.rerender({ dense: true });
  assert(
    stable === p.host.querySelector("[role=alert]"),
    "parent update preserves node",
  );
  p.add("second");
  await wait(30);
  assert(
    text(p.host).join() === "stable,second",
    "updated provider remains usable",
  );
  p.dispose();
  rows.push("parent update");
  return rows;
};
window.checkOwnership = async () => {
  const strictChild = mount({}, true, true);
  await wait(60);
  assert(
    text(strictChild.host).join() === "mounted",
    "StrictMode child mount enqueue",
  );
  strictChild.dispose();
  const typedKeys=mount();typedKeys.add('number',{key:1});typedKeys.add('string',{key:'1'});await wait(30);assert(text(typedKeys.host).join()==='number,string','typed keys retain separate nodes');typedKeys.dispose();
  const custom=mount({Components:{success:React.forwardRef((props,ref)=>React.createElement(api.SnackbarContent,{ref,role:'alert'},'custom '+props.message))}});custom.add('saved',{variant:'success'});await wait(30);assert(text(custom.host).join()==='custom saved','custom content component');custom.dispose();
  let pauses = mount({ autoHideDuration: 160 });
  pauses.add("hover");
  await wait(30);
  const alertNode = pauses.host.querySelector("[data-vnotistack-key]");
  alertNode.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await wait(240);
  assert(text(pauses.host)[0] === "hover", "hover pauses timer");
  window.dispatchEvent(new Event("blur"));
  alertNode.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
  await wait(240);
  assert(text(pauses.host)[0] === "hover", "blur remains paused after hover");
  window.dispatchEvent(new Event("focus"));
  await wait(550);
  assert(text(pauses.host).length === 0, "focus resumes timer");
  pauses.dispose();
  const sheetTest = mount({ transitionDuration: { enter: 50, exit: 40 } });
  sheetTest.add("sheet");
  await wait(100);
  const oldSheet = document.getElementById("_vgoober");
  oldSheet.remove();
  sheetTest.rerender({ dense: true });
  await wait(30);
  assert(
    document.getElementById("_vgoober") !== oldSheet,
    "removed sheet recreated",
  );
  assert(
    getComputedStyle(sheetTest.host.querySelector("[role=alert]"))
      .paddingTop === "6px",
    "recreated style applies",
  );
  sheetTest.close();
  await wait(300);
  assert(text(sheetTest.host).length === 0, "nonzero transitions finish");
  sheetTest.dispose();
  let closes = 0;
  const gone = mount({ autoHideDuration: 80, onClose: () => closes++ });
  gone.add("gone");
  gone.dispose();
  await wait(150);
  assert(closes === 0, "unmounted timer cancelled");
  const first = mount(),
    second = mount();
  flushSync(() => api.enqueueSnackbar("second"));
  await wait(30);
  assert(text(second.host)[0] === "second", "global latest provider");
  second.dispose();
  flushSync(() => api.enqueueSnackbar("first"));
  await wait(30);
  assert(text(first.host)[0] === "first", "global provider restoration");
  first.dispose();
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  iframe.contentWindow.__nonce__ = "notifications";
  const portal = iframe.contentDocument.createElement("div");
  iframe.contentDocument.body.append(portal);
  const p = mount({ domRoot: portal });
  p.add("portal", { variant: "error" });
  await wait(30);
  const alert = portal.querySelector("[role=alert]");
  assert(alert, "iframe portal");
  assert(
    iframe.contentWindow.getComputedStyle(alert).backgroundColor ===
      "rgb(211, 47, 47)",
    "iframe stylesheet",
  );
  p.dispose();
  assert(!portal.querySelector("[role=alert]"), "portal cleanup");
  iframe.remove();
  return true;
};
