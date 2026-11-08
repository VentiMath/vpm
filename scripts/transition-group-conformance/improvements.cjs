"use strict";
const assert = require("node:assert/strict"),
  { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>");
global.window = dom.window;
global.document = dom.window.document;
const React = require("react"),
  { createRoot } = require("react-dom/client"),
  { flushSync } = require("react-dom"),
  api = require("./load.cjs")();
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host),
  ref = React.createRef(),
  timers = new Set();
const set = global.setTimeout,
  clear = global.clearTimeout;
global.setTimeout = (fn, delay, ...args) => {
  const id = set(() => {
    timers.delete(id);
    fn(...args);
  }, delay);
  timers.add(id);
  return id;
};
global.clearTimeout = (id) => {
  timers.delete(id);
  return clear(id);
};
try {
  let completed = 0,
    done;
  const draw = (value) =>
    flushSync(() =>
      root.render(
        React.createElement(
          api.CSSTransition,
          {
            in: value,
            appear: true,
            nodeRef: ref,
            timeout: 60000,
            addEndListener: (cb) => {
              done = cb;
            },
            classNames: "fade",
            onEntered: () => completed++,
          },
          React.createElement("span", { ref, className: "keep" }),
        ),
      ),
    );
  draw(true);
  assert.equal(timers.size, 1);
  draw(false);
  assert.equal(timers.size, 1, "reversal clears the prior fallback timer");
  draw(true);
  assert.equal(timers.size, 1);
  flushSync(done);
  assert.equal(timers.size, 0, "listener completion clears fallback timer");
  assert.equal(completed, 1);
  draw(false);
  const node = ref.current;
  assert.equal(timers.size, 1);
  flushSync(() => root.unmount());
  assert.equal(timers.size, 0, "unmount clears fallback timer");
  assert.equal(
    node.className,
    "keep",
    "unmount removes only tracked CSS classes",
  );
  done();
  assert.equal(completed, 1);
  console.log(
    "Owned timers are cleared on reversal, listener completion and unmount; retained DOM loses only managed CSS classes.",
  );
} finally {
  for (const id of timers) clear(id);
  global.setTimeout = set;
  global.clearTimeout = clear;
  host.remove();
  dom.window.close();
}
