import React from "react";
import { renderToString } from "react-dom/server";
import { Trail } from "./breadcrumbs-scene.jsx";
export function prepare(kind) {
  const trails = Array.from({ length: 8 }, (_, i) => <Trail key={i} count={kind === "short" ? 3 : 6} />);
  return () => renderToString(<>{trails}</>);
}
