import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { Scene, page, frameSheets, navigation } from "./globals-scene.jsx";

const frame = document.body.appendChild(document.createElement("iframe"));
const doc = frame.contentDocument;
doc.body.innerHTML = '<div class="sample">Example</div>';
const host = document.body.appendChild(document.createElement("main"));
host.innerHTML =
  '<div class="nav dense"><div class="item sample">Navigation</div></div>';
const root = createRoot(
  document.body.appendChild(document.createElement("div")),
);
const cache = createCache({ key: "preview", container: doc.head });
window.draw = (mode) =>
  flushSync(() =>
    root.render(
      mode === "clear" ? null : (
        <>
          <Scene styles={navigation} />
          <Scene
            styles={page}
            suppliedTheme={{
              palette: {
                primary: {
                  main: mode === "dark" ? "rgb(98, 76, 54)" : "rgb(12, 34, 56)",
                },
              },
            }}
          />
          <CacheProvider value={cache}>
            <Scene styles={frameSheets} />
          </CacheProvider>
        </>
      ),
    ),
  );
window.snapshot = () => {
  const sample = host.querySelector(".sample");
  return [
    getComputedStyle(sample).minHeight,
    getComputedStyle(sample).color,
    frame.contentWindow.getComputedStyle(doc.querySelector(".sample")).fontSize,
    getComputedStyle(document.documentElement).getPropertyValue(
      "--preview-size",
    ),
    doc.head.querySelectorAll("style[data-emotion^=preview]").length > 0,
  ];
};
