"use strict";
const React = require("react"),
  { createRoot } = require("react-dom/client"),
  { flushSync } = require("react-dom"),
  { useSwipeable } = require("fixture-api");
module.exports = (variant) => {
  const host = document.createElement("section");
  host.style.cssText =
    "position:absolute;top:20px;left:" +
    (variant === "upstream" ? 20 : 380) +
    "px";
  document.body.append(host);
  const root = createRoot(host);
  let config = {},
    logs = [],
    open = true;
  function View() {
    const options = { ...config };
    delete options.callbackKeys;
    delete options.app;
    delete options.direction;
    const record = (name) => (data) => {
      const { event, ...rest } = data;
      logs.push({ name, ...rest, type: event.type });
    };
    for (const name of config.callbackKeys || [
      "onSwipeStart",
      "onSwiping",
      "onSwiped",
      "onSwipedLeft",
      "onSwipedRight",
      "onSwipedUp",
      "onSwipedDown",
      "onTap",
      "onTouchStartOrOnMouseDown",
      "onTouchEndOrOnMouseUp",
    ])
      options[name] = record(name);
    if (config.app) {
      options.onSwipedLeft = () => {
        if (open && config.direction === "rtl") {
          open = false;
          logs.push({ close: config.app });
        }
      };
      options.onSwipedRight = () => {
        if (open && config.direction === "ltr") {
          open = false;
          logs.push({ close: config.app });
        }
      };
    }
    const handlers = useSwipeable(options);
    return React.createElement(
      "div",
      {
        ...handlers,
        id: "surface-" + variant,
        style: {
          width: 300,
          height: 200,
          overflow: "auto",
          touchAction: "auto",
          border: "1px solid",
        },
      },
      React.createElement(
        "div",
        { style: { height: 1800, width: 280 } },
        "Swipe and scroll fixture",
      ),
    );
  }
  const render = () => flushSync(() => root.render(React.createElement(View)));
  const node = () => host.firstChild;
  window.swipeControls ??= {};
  window.swipeControls[variant] = {
    set(next) {
      config = next;
      logs = [];
      open = true;
      render();
      node().scrollTop = 0;
    },
    logs: () => logs,
    open: () => open,
    rect: () => {
      const r = node().getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    scroll: () => node().scrollTop,
    gesture(points, { mouse = false, cancel = false, count = 1 } = {}) {
      const doc = node().ownerDocument;
      for (let i = 0; i < points.length; i++) {
        const [x, y, time] = points[i],
          last = i === points.length - 1,
          type = mouse
            ? i === 0
              ? "mousedown"
              : last
                ? "mouseup"
                : "mousemove"
            : i === 0
              ? "touchstart"
              : last
                ? cancel
                  ? "touchcancel"
                  : "touchend"
                : "touchmove";
        const e = new (mouse ? MouseEvent : Event)(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        });
        Object.defineProperty(e, "timeStamp", { value: time });
        if (!mouse) {
          Object.defineProperty(e, "touches", {
            value: last
              ? []
              : Array.from({ length: count }, (_, j) => ({
                  clientX: x,
                  clientY: y,
                  identifier: j + 1,
                })),
          });
          Object.defineProperty(e, "changedTouches", {
            value: [{ clientX: x, clientY: y, identifier: 1 }],
          });
        }
        (mouse && i ? doc : node()).dispatchEvent(e);
      }
      return { logs, open };
    },
    unmount() {
      flushSync(() => root.unmount());
      host.remove();
    },
  };
  render();
};
