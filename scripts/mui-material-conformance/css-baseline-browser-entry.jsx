import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import rtl from "vstylis-plugin-rtl";
import { Scene, makeTheme } from "./css-baseline-scene.jsx";
const root = createRoot(
  document.body.appendChild(document.createElement("main")),
);
const caches = {};
function wrap(layer) {
  return (node) => {
    if (node.root) return;
    const child = { ...node, parent: node, root: node };
    Object.assign(node, {
      children: [child],
      length: 6,
      parent: null,
      props: [layer],
      return: "",
      type: "@layer",
      value: "@layer " + layer,
    });
  };
}
window.draw = (mode, dir = "ltr") => {
  document.documentElement.dir = dir;
  const cache = (caches[dir] ??= createCache({
    key: "mui" + dir,
    stylisPlugins: [
      ...(dir === "rtl" ? [rtl] : []),
      (window.appLayer ?? wrap)("mui"),
    ],
    prepend: false,
  }));
  flushSync(() =>
    root.render(
      mode === "clear" ? null : (
        <CacheProvider value={cache}>
          <Scene theme={makeTheme(mode, null, true)} />
        </CacheProvider>
      ),
    ),
  );
};
window.snapshot = () => {
  const body = getComputedStyle(document.body),
    html = getComputedStyle(document.documentElement),
    bold = document.querySelector(".accent");
  return [
    html.boxSizing,
    html.colorScheme,
    body.color,
    body.backgroundColor,
    body.fontSize,
    body.paddingLeft,
    body.paddingRight,
    bold && getComputedStyle(bold).fontWeight,
    [...document.querySelectorAll("style[data-emotion]")].flatMap((s) =>
      [...s.sheet.cssRules].map((r) => r.cssText.startsWith("@layer mui")),
    ),
  ];
};
