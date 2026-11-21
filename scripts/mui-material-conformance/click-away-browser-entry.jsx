import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import ClickAwayListener from "@click-away";

const frame = document.body.appendChild(document.createElement("iframe"));
let root, doc;
window.mount = (framed = false) => {
  if (root) flushSync(() => root.unmount());
  doc = framed ? frame.contentDocument : document;
  const host = doc.body.appendChild(doc.createElement("main"));
  root = createRoot(host);
};
window.mount();
const log = [];
const childRef = (node) => {
  log.push("ref");
  return () => log.push("cleanup");
};
window.draw = (opts = {}, label = "close") =>
  flushSync(() =>
    root.render(
      <ClickAwayListener
        {...opts}
        onClickAway={(e) => {
          log.push(label + ":" + e.type);
          window.appHandler?.(e);
        }}
      >
        <section id="inside" ref={childRef} onClick={() => log.push("child")}>
          <button id="toggle">Search</button>
          {createPortal(
            <button id="suggestion">Select result</button>,
            doc.body,
          )}
        </section>
      </ClickAwayListener>,
    ),
  );
window.fire = (id, type = "click", props = {}) => {
  const target =
    id === "outer"
      ? document.body
      : id === "outside"
        ? doc.body
        : doc.getElementById(id);
  target.dispatchEvent(
    new doc.defaultView.MouseEvent(type, {
      bubbles: true,
      composed: true,
      ...props,
    }),
  );
};
window.end = () => flushSync(() => root.render(null));
window.take = () => log.splice(0);
