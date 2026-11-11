"use strict";
const { css } = require("vgoober");
const definitions = {
  container: {
    boxSizing: "border-box",
    display: "flex",
    position: "fixed",
    maxHeight: "100%",
    zIndex: 1400,
    height: "auto",
    width: "auto",
    maxWidth: "calc(100% - 40px)",
    pointerEvents: "none",
    transition:
      "top 300ms ease 0ms,right 300ms ease 0ms,bottom 300ms ease 0ms,left 300ms ease 0ms,max-width 300ms ease 0ms",
    "@media (max-width:599.95px)": {
      width: "100%",
      maxWidth: "calc(100% - 32px)",
    },
  },
  top: { top: "14px", flexDirection: "column" },
  bottom: { bottom: "14px", flexDirection: "column-reverse" },
  left: {
    left: "20px",
    "@media (min-width:600px)": { alignItems: "flex-start" },
    "@media (max-width:599.95px)": { left: "16px" },
  },
  right: {
    right: "20px",
    "@media (min-width:600px)": { alignItems: "flex-end" },
    "@media (max-width:599.95px)": { right: "16px" },
  },
  center: {
    left: "50%",
    transform: "translateX(-50%)",
    "@media (min-width:600px)": { alignItems: "center" },
  },
  wrapper: {
    padding: "6px 0",
    pointerEvents: "all",
    transition: "padding 300ms ease 0ms",
  },
  dense: { padding: "2px 0" },
  frame: {
    display: "flex",
    flexWrap: "wrap",
    flexGrow: 1,
    "@media (min-width:600px)": { flexGrow: "initial", minWidth: "288px" },
  },
  content: {
    display: "flex",
    flexWrap: "wrap",
    flexGrow: 1,
    backgroundColor: "#313131",
    fontSize: "0.875rem",
    lineHeight: 1.43,
    letterSpacing: "0.01071em",
    color: "#fff",
    alignItems: "center",
    padding: "6px 16px",
    borderRadius: "4px",
    boxShadow:
      "0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)",
    "@media (min-width:600px)": { flexGrow: "initial", minWidth: "288px" },
  },
  message: { display: "flex", alignItems: "center", padding: "8px 0" },
  action: {
    display: "flex",
    alignItems: "center",
    marginLeft: "auto",
    paddingLeft: "16px",
    marginRight: "-8px",
  },
};
// Styles are immutable and owned by one sheet per document. Rebuild after sheet
// removal/extraction, without serializing all definitions on every React render.
const cache = new WeakMap(),
  server = { data: "" };
function classes(doc) {
  const target = doc ? doc.head : server,
    previous = cache.get(target);
  if (
    previous &&
    (doc
      ? previous.sheet?.parentNode === target &&
        previous.sheet.textContent.length === previous.length
      : target.data.length === previous.length)
  )
    return previous.names;
  const render = css.bind({ target }),
    names = Object.fromEntries(
      Object.entries(definitions).map(([key, value]) => [key, render(value)]),
    );
  const sheet = doc?.getElementById("_vgoober");
  cache.set(target, {
    names,
    sheet,
    length: doc ? sheet.textContent.length : target.data.length,
  });
  return names;
}
module.exports = { classes };
