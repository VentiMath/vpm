import React from "react";
import { renderToString } from "react-dom/server";
import { Panel } from "./tabs-scene.jsx";
export function prepare(kind) {
  const lists = Array.from({ length: 8 }, (_, i) => <Panel key={i} kind={kind} />);
  return () => renderToString(<>{lists}</>);
}
