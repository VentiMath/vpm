import React from "react";
import { renderToString } from "react-dom/server";
import { Scene, makeTheme } from "./css-baseline-scene.jsx";
export function prepare({ mode, selector, override, scheme, child } = {}) {
  const theme = mode && makeTheme(mode, selector, override);
  return () =>
    renderToString(<Scene theme={theme} scheme={scheme} child={child} />);
}
export const hydrate = () => prepare()();
