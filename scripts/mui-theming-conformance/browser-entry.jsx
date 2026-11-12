import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Scene } from "./scene.jsx";
import { ThemeProvider, useTheme } from "@mui/private-theming";
window.variant = VPM_VARIANT;
const frame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
window.runChecks = async () => {
  const host = document.body.appendChild(document.createElement("div")),
    root = createRoot(host),
    results = [];
  let update,
    reads = 0;
  const Consumer = React.memo(function () {
    reads++;
    const theme = useTheme();
    return <span data-consumer>{theme.value}</span>;
  });
  function Stable() {
    const [tick, setTick] = React.useState(0);
    update = setTick;
    const theme = React.useMemo(() => ({ value: "stable" }), []);
    return (
      <ThemeProvider theme={theme}>
        <Consumer />
        <i>{tick}</i>
      </ThemeProvider>
    );
  }
  flushSync(() =>
    root.render(
      <React.StrictMode>
        <Stable />
      </React.StrictMode>,
    ),
  );
  await frame();
  const start = reads,
    span = host.querySelector("[data-consumer]");
  flushSync(() => update(1));
  await frame();
  if (reads !== start || host.querySelector("[data-consumer]") !== span)
    throw Error("Stable parent render propagated a new theme");
  for (const nested of [false, true])
    for (const color of ["#123456", "#654321"]) {
      flushSync(() =>
        root.render(
          <React.StrictMode>
            <Scene color={color} nested={nested}>
              <input defaultValue="selected text" />
            </Scene>
          </React.StrictMode>,
        ),
      );
      await frame();
      const output = host.querySelector("output"),
        box = host.querySelector("section"),
        input = host.querySelector("input");
      input.focus();
      input.setSelectionRange(2, 5);
      const before = input;
      flushSync(() =>
        root.render(
          <React.StrictMode>
            <Scene color={color} nested={nested}>
              <input defaultValue="selected text" />
            </Scene>
          </React.StrictMode>,
        ),
      );
      await frame();
      if (
        document.activeElement !== before ||
        before.selectionStart !== 2 ||
        host.querySelector("input") !== before
      )
        throw Error("Theme rerender replaced focused child");
      results.push([
        output.textContent,
        output.dataset.private,
        output.dataset.nested,
        getComputedStyle(box).color,
        getComputedStyle(box).padding,
      ]);
    }
  root.unmount();
  host.remove();
  if (host.childNodes.length) throw Error("Unmount retained children");
  return results;
};
