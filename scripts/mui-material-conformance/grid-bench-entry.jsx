import React from "react";
import { renderToString } from "react-dom/server";
import { YearGrid } from "./grid-scene.jsx";
export function prepare(kind) {
  const tree = (
    <YearGrid
      loading={kind === "placeholders"}
      count={kind === "placeholders" ? 9 : 24}
    />
  );
  return () => renderToString(tree);
}
