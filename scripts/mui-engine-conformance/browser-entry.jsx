import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Scene } from "./scene.jsx";
window.variant = VPM_VARIANT;
const frame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
window.runChecks = async () => {
  const host = document.body.appendChild(document.createElement("div")),
    root = createRoot(host),
    results = [];
  for (const direction of ["ltr", "rtl"])
    for (const nested of [false, true])
      for (const compact of [false, true])
        for (const color of ["#123456", "#654321"]) {
          const view = () => (
            <React.StrictMode>
              <Scene
                color={color}
                nested={nested}
                compact={compact}
                direction={direction}
              >
                <input defaultValue="selected text" />
              </Scene>
            </React.StrictMode>
          );
          flushSync(() => root.render(view()));
          await frame();
          const box = host.querySelector("section"),
            button = host.querySelector("button"),
            global = host.querySelector(".engine-global"),
            input = host.querySelector("input");
          input.focus();
          input.setSelectionRange(2, 5);
          flushSync(() => root.render(view()));
          await frame();
          if (
            document.activeElement !== input ||
            input.selectionStart !== 2 ||
            host.querySelector("button") !== button
          )
            throw Error("Styled rerender replaced focused child");
          const styles = [...document.querySelectorAll("style[data-emotion]")];
          if (
            !styles.length ||
            styles.some((s) => !/^mui(ltr|rtl)/.test(s.dataset.emotion))
          )
            throw Error("Application cache replaced");
          const rules = styles.flatMap((s) =>
            [...s.sheet.cssRules].map((r) => r.cssText),
          );
          if (!rules.length || rules.some((s) => !s.startsWith("@layer mui")))
            throw Error("Application CSS layer policy lost");
          const a = getComputedStyle(box),
            b = getComputedStyle(button),
            g = getComputedStyle(global);
          if (
            b[direction === "rtl" ? "marginRight" : "marginLeft"] !== "7px" ||
            b.padding !== (compact ? "4px" : "12px") ||
            a.padding !== "16px" ||
            g.margin !== "3px" ||
            b.backgroundColor !== "rgb(254, 220, 186)"
          )
            throw Error("Caller styling did not apply");
          results.push([
            a.color,
            a.padding,
            b.color,
            b.padding,
            b.borderWidth,
            b.borderRadius,
            b.letterSpacing,
            g.color,
            g.margin,
          ]);
        }
  root.unmount();
  host.remove();
  await frame();
  if (document.querySelector('style[data-emotion$="-global"]'))
    throw Error("Global sheet leaked after unmount");
  return results;
};
