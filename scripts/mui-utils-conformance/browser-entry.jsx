import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Scene } from "./scene.jsx";
import useEventCallback from "@mui/utils/useEventCallback";
import useForkRef from "@mui/utils/useForkRef";
import useControlled from "@mui/utils/useControlled";
import useTimeout from "@mui/utils/useTimeout";
window.variant = VPM_VARIANT;
const frame = () =>
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (element, value) =>
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    }),
  );
window.runChecks = async () => {
  const host = document.body.appendChild(document.createElement("div")),
    root = createRoot(host),
    results = [];
  for (const compact of [false, true]) {
    flushSync(() =>
      root.render(
        <React.StrictMode>
          <Scene compact={compact} />
        </React.StrictMode>,
      ),
    );
    await frame();
    const field = host.querySelector("#name");
    field.focus();
    field.setSelectionRange(1, 2);
    flushSync(() =>
      root.render(
        <React.StrictMode>
          <Scene color="#654321" compact={compact} />
        </React.StrictMode>,
      ),
    );
    await frame();
    if (document.activeElement !== field || field.selectionStart !== 1)
      throw Error("Stable form lost input focus");
    const items = [...host.querySelectorAll('[role="menuitem"]')];
    items[0].focus();
    key(items[0], "ArrowDown");
    await frame();
    results.push(document.activeElement.textContent);
    if (document.activeElement !== items[2])
      throw Error("Menu did not skip disabled item");
    key(items[2], "End");
    await frame();
    if (document.activeElement !== items[3])
      throw Error("End did not focus last item");
    key(items[3], "ArrowDown");
    await frame();
    if (document.activeElement !== items[0])
      throw Error("Menu wrapping failed");
    key(items[0], "b");
    await frame();
    if (document.activeElement !== items[2])
      throw Error("Menu typeahead failed");
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    tabs[0].focus();
    key(tabs[0], "ArrowRight");
    await frame();
    if (document.activeElement !== tabs[1])
      throw Error("Tabs arrow navigation failed");
    tabs[1].click();
    await frame();
    if (tabs[1].getAttribute("aria-selected") !== "true")
      throw Error("Tabs selection failed");
    const checkbox = host.querySelector('input[type="checkbox"]'),
      wasChecked = checkbox.checked;
    checkbox.click();
    await frame();
    if (checkbox.checked === wasChecked)
      throw Error("Controlled checkbox failed");
    host.querySelector("#open").click();
    await frame();
    await wait(50);
    const popup = document.querySelector('[role="dialog"]');
    if (!popup) throw Error("Dialog failed to open");
    popup.querySelector("#dialog-field").focus();
    document.querySelector("#close").click();
    await wait(80);
    await frame();
    if (document.querySelector('[role="dialog"]'))
      throw Error("Dialog failed to close");
    results.push([
      field.value,
      tabs[1].getAttribute("aria-selected"),
      getComputedStyle(host.querySelector("#open")).color,
    ]);
  }
  let update,
    callback,
    prior,
    seen = [],
    objectRef = { current: null },
    timerCalls = 0,
    startTimer;
  function Hooks() {
    const [value, set] = React.useState(1);
    update = set;
    callback = useEventCallback(() => value);
    const ref = useForkRef(
      objectRef,
      React.useCallback((node) => {
        seen.push(node ? "attach" : "detach");
        return () => seen.push("cleanup");
      }, []),
    );
    const [controlled, setControlled] = useControlled({
      controlled: 4,
      default: 0,
      name: "Probe",
    });
    const timer = useTimeout();
    React.useEffect(() => {
      startTimer = () => timer.start(50, () => timerCalls++);
      setControlled(9);
    }, []);
    return (
      <output ref={ref}>
        {controlled}:{value}
      </output>
    );
  }
  flushSync(() => root.render(<Hooks />));
  await frame();
  prior = callback;
  if (callback() !== 1 || !objectRef.current)
    throw Error("Hooks initial state failed");
  flushSync(() => update(2));
  await frame();
  if (callback !== prior || callback() !== 2 || host.textContent !== "4:2")
    throw Error("Stable callback or controlled state failed");
  startTimer();
  root.unmount();
  await wait(80);
  if (timerCalls || objectRef.current) throw Error("Unmount leaked timer/ref");
  // React 19 cleanup return support is tested independently for VPM; app 7 control predates it.
  if (VPM_VARIANT.endsWith("-vpm") && !seen.includes("cleanup"))
    throw Error("Ref cleanup was dropped");
  host.remove();
  return results;
};
