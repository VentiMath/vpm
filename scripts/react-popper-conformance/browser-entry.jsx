import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import { Manager, Reference, Popper } from "react-popper";
window.formVariant = VPM_VARIANT;
const wait = () => new Promise((r) => setTimeout(r, 40));
window.runForms = async (strict = true) => {
  const results = [];
  document.body.style.margin = "0";
  for (const direction of ["ltr", "rtl"])
    for (const edge of [false, true])
      for (const placement of [
        "top",
        "bottom",
        "left",
        "right",
        "top-start",
        "top-end",
        "bottom-start",
        "bottom-end",
        "left-start",
        "left-end",
        "right-start",
        "right-end",
      ]) {
        document.documentElement.dir = direction;
        const host = document.body.appendChild(document.createElement("main"));
        host.style.cssText = "position:relative;min-height:400px";
        const root = createRoot(host);
        let rerender;
        function App() {
          const [tick, set] = React.useState(0);
          rerender = () => set((x) => x + 1);
          return (
            <Manager>
              <Reference>
                {({ ref }) => (
                  <button
                    ref={ref}
                    style={{
                      position: "fixed",
                      left: edge ? 8 : 120,
                      top: edge ? 8 : 150,
                      width: 70,
                      height: 30,
                    }}
                  >
                    Contest
                  </button>
                )}
              </Reference>
              {createPortal(
                <Popper placement={placement} strategy="fixed">
                  {({ ref, style, placement: p }) => (
                    <div
                      ref={ref}
                      data-popper=""
                      data-placement={p}
                      style={{
                        ...style,
                        width: 100,
                        height: 60,
                        background: "white",
                      }}
                    >
                      <input defaultValue="draft" />
                      <span>{tick}</span>
                    </div>
                  )}
                </Popper>,
                document.body,
              )}
            </Manager>
          );
        }
        flushSync(() =>
          root.render(
            strict ? (
              <React.StrictMode>
                <App />
              </React.StrictMode>
            ) : (
              <App />
            ),
          ),
        );
        await wait();
        await wait();
        const box = document.querySelector("[data-popper]"),
          input = box.querySelector("input"),
          r = box.getBoundingClientRect();
        results.push([
          direction,
          edge,
          placement,
          box.dataset.placement,
          Math.round(r.x),
          Math.round(r.y),
          Math.round(r.width),
          Math.round(r.height),
        ]);
        input.focus();
        input.setSelectionRange(1, 3);
        flushSync(rerender);
        await wait();
        if (
          document.querySelector("[data-popper]") !== box ||
          document.activeElement !== input ||
          input.selectionStart !== 1
        )
          throw Error("Parent update replaced or unfocused popper");
        root.unmount();
        await wait();
        if (document.querySelector("[data-popper]"))
          throw Error("Portal retained after unmount");
        host.remove();
      }
  document.documentElement.dir = "ltr";
  for (const mode of [
    "scrolled",
    "scaled",
    "arrow",
    "bottom-edge",
    "right-edge",
  ]) {
    const host = document.body.appendChild(document.createElement("main"));
    host.style.cssText =
      "position:relative;margin:40px;width:260px;height:180px;overflow:auto;" +
      (mode === "scaled"
        ? "transform:scale(.8);transform-origin:top left;"
        : "");
    const root = createRoot(host);
    let update;
    const modifiers =
      mode === "arrow"
        ? [
            { name: "offset", options: { offset: [7, 12] } },
            { name: "arrow", options: { padding: 4 } },
          ]
        : [];
    function Scene() {
      return (
        <Manager>
          <div style={{ height: 400, width: 450 }}>
            <Reference>
              {({ ref }) => (
                <button
                  ref={ref}
                  style={{
                    position: "absolute",
                    left: mode === "right-edge" ? 240 : 80,
                    top: mode === "bottom-edge" ? 155 : 100,
                    width: 70,
                    height: 30,
                  }}
                >
                  Contest
                </button>
              )}
            </Reference>
            <Popper placement="bottom-start" modifiers={modifiers}>
              {({ ref, style, placement, arrowProps, update: refresh }) => {
                update = refresh;
                return (
                  <div
                    data-extra=""
                    ref={ref}
                    data-placement={placement}
                    style={{ ...style, width: 100, height: 60 }}
                  >
                    <i
                      data-arrow=""
                      ref={arrowProps.ref}
                      style={{ ...arrowProps.style, width: 8, height: 8 }}
                    />
                    Menu
                  </div>
                );
              }}
            </Popper>
          </div>
        </Manager>
      );
    }
    flushSync(() => root.render(<Scene />));
    await wait();
    await wait();
    if (mode === "scrolled") {
      host.scrollTop = 60;
      host.scrollLeft = 40;
      host.dispatchEvent(new Event("scroll"));
      await wait();
    }
    await update();
    await wait();
    const box = host.querySelector("[data-extra]"),
      r = box.getBoundingClientRect(),
      a = host.querySelector("[data-arrow]").getBoundingClientRect();
    results.push([
      mode,
      box.dataset.placement,
      ...[
        r.x,
        r.y,
        r.width,
        r.height,
        a.x,
        a.y,
        host.getBoundingClientRect().bottom,
      ].map((x) => Math.round(x)),
    ]);
    root.unmount();
    host.remove();
  }
  // Actual app pattern: Reference persists while the portalled Popper child is closed.
  const host = document.body.appendChild(document.createElement("main")),
    root = createRoot(host);
  let toggle;
  function Toggle() {
    const [open, set] = React.useState(false);
    toggle = set;
    return (
      <Manager>
        <Reference>{({ ref }) => <button ref={ref}>Menu</button>}</Reference>
        {createPortal(
          <Popper placement="bottom-start">
            {({ ref, style }) =>
              open && (
                <div
                  data-toggle=""
                  ref={ref}
                  style={{ ...style, width: 100, height: 60 }}
                >
                  Menu content
                </div>
              )
            }
          </Popper>,
          document.body,
        )}
      </Manager>
    );
  }
  flushSync(() => root.render(<Toggle />));
  for (let n = 0; n < 3; n++) {
    flushSync(() => toggle(true));
    await wait();
    if (!document.querySelector("[data-toggle]"))
      throw Error("Reopened menu missing");
    flushSync(() => toggle(false));
    await wait();
    if (document.querySelector("[data-toggle]"))
      throw Error("Closed menu retained");
  }
  root.unmount();
  host.remove();
  results.push("open close reopen");
  // The explicit virtual-reference contract works without Manager context.
  {
    const host = document.body.appendChild(document.createElement("div")),
      root = createRoot(host);
    const referenceElement = {
      getBoundingClientRect: () => ({
        x: 100,
        y: 150,
        left: 100,
        top: 150,
        right: 140,
        bottom: 170,
        width: 40,
        height: 20,
      }),
      contextElement: document.body,
    };
    flushSync(() =>
      root.render(
        <Popper
          referenceElement={referenceElement}
          placement="right"
          strategy="fixed"
        >
          {({ ref, style }) => (
            <div
              data-virtual=""
              ref={ref}
              style={{ ...style, width: 50, height: 30 }}
            >
              Virtual
            </div>
          )}
        </Popper>,
      ),
    );
    await wait();
    await wait();
    const rect = host.querySelector("[data-virtual]").getBoundingClientRect();
    results.push(["virtual", Math.round(rect.x), Math.round(rect.y)]);
    root.unmount();
    host.remove();
  }
  if (VPM_VARIANT.startsWith("vpm")) {
    const Original = window.ResizeObserver;
    let live = 0;
    window.ResizeObserver = class extends Original {
      constructor(fn) {
        super(fn);
        this.connected = false;
      }
      observe(...args) {
        if (!this.connected) {
          this.connected = true;
          live++;
        }
        return super.observe(...args);
      }
      disconnect() {
        if (this.connected) {
          this.connected = false;
          live--;
        }
        super.disconnect();
      }
    };
    const h = document.body.appendChild(document.createElement("div")),
      r = createRoot(h);
    let change,
      firstCalls = 0,
      cleaned = 0;
    const innerRef = (node) => {
      if (node)
        return () => {
          cleaned++;
        };
    };
    function Lifecycle() {
      const [p, set] = React.useState("bottom");
      change = set;
      return (
        <Manager>
          <Reference innerRef={innerRef}>
            {({ ref }) => (
              <button
                ref={ref}
                style={{
                  position: "fixed",
                  left: 100,
                  top: 150,
                  width: 40,
                  height: 20,
                }}
              >
                Anchor
              </button>
            )}
          </Reference>
          <Popper
            placement={p}
            strategy="fixed"
            onFirstUpdate={() => firstCalls++}
          >
            {({ ref, style, placement }) => (
              <div
                data-life=""
                ref={ref}
                style={{ ...style, width: 50, height: 30 }}
                data-placement={placement}
              >
                Menu
              </div>
            )}
          </Popper>
        </Manager>
      );
    }
    try {
      flushSync(() =>
        r.render(
          <React.StrictMode>
            <Lifecycle />
          </React.StrictMode>,
        ),
      );
      flushSync(() => change("left"));
      flushSync(() => change("right"));
      await wait();
      await wait();
      if (h.querySelector("[data-life]").dataset.placement !== "right")
        throw Error("Stale positioning result won");
      if (firstCalls !== 1) throw Error("First-update callback repeated");
      r.unmount();
      await wait();
      if (live !== 0 || cleaned < 1)
        throw Error("Observer or React ref cleanup leaked");
    } finally {
      window.ResizeObserver = Original;
      h.remove();
    }
  }
  return results;
};

window.strictProbe = async () => {
  const host = document.body.appendChild(document.createElement("div")),
    root = createRoot(host);
  function Probe() {
    return (
      <Manager>
        <Reference>
          {({ ref }) => (
            <button
              ref={ref}
              style={{
                position: "fixed",
                left: 100,
                top: 150,
                width: 40,
                height: 20,
              }}
            >
              Anchor
            </button>
          )}
        </Reference>
        <Popper placement="bottom-start" strategy="fixed">
          {({ ref, style }) => (
            <div
              data-probe=""
              ref={ref}
              style={{ ...style, width: 50, height: 30 }}
            >
              Menu
            </div>
          )}
        </Popper>
      </Manager>
    );
  }
  flushSync(() =>
    root.render(
      <React.StrictMode>
        <Probe />
      </React.StrictMode>,
    ),
  );
  await wait();
  await wait();
  await wait();
  const rect = host.querySelector("[data-probe]").getBoundingClientRect(),
    result = [Math.round(rect.x), Math.round(rect.y)];
  root.unmount();
  host.remove();
  return result;
};
