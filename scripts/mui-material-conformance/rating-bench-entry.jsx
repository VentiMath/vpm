import React from "react";
import { renderToString } from "react-dom/server";
import { RatingScene } from "./rating-scene.jsx";
export function prepare(kind) {
  const tree = (
    <RatingScene
      rows={kind === "schedule" ? 5 : 3}
      value={kind === "schedule" ? 0 : 3}
    />
  );
  return () => renderToString(tree);
}
