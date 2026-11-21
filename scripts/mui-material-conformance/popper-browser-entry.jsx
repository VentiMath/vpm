import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Popper from "@popper";
import Paper from "@search-paper";
import Typography from "@search-typography";
const anchor = document.createElement("input");
const host = document.createElement("main");
document.body.append(anchor, host);
anchor.style.cssText =
  "position:absolute;top:60px;left:100px;width:180px;height:30px;box-sizing:border-box";
const root = createRoot(host);
const suggestionsNode = React.createRef();
window.anchor = anchor;
window.draw = (kind = "result", variant = 0, props = {}) => {
  const children = kind === "result" ? <div role="option">USAMTS</div> : null;
  const state = { noSuggestions: kind === "empty" };
  const original = window.originalPanels?.[variant];
  const panel = original ? (
    original({
      React,
      Popper,
      Paper,
      Typography,
      popperNode: { current: anchor },
      suggestionsNode,
      options: { children },
      state,
      noResults: "No results",
      restContainerProps: { role: "listbox" },
      key: "items",
    })
  ) : (
    <Popper
      open={!!children || state.noSuggestions}
      anchorEl={anchor}
      className="z-9999"
      {...props}
    >
      <div role="listbox" style={{ width: anchor.clientWidth, height: 32 }}>
        {children ?? "No results"}
      </div>
    </Popper>
  );
  flushSync(() => root.render(panel));
};
window.bounds = () => {
  const panel = document.querySelector(".MuiPopper-root");
  if (!panel) return null;
  const a = anchor.getBoundingClientRect(),
    p = panel.getBoundingClientRect();
  return {
    side: panel.dataset.popperPlacement,
    dx: p.x + p.width / 2 - a.x - a.width / 2,
    below: p.top - a.bottom,
    above: p.bottom - a.top,
    width: p.width,
  };
};
