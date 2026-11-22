import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { scene } from "./list-item-scene.jsx";
const root = createRoot(
  document.body.appendChild(document.createElement("main")),
);
window.draw = (props) => flushSync(() => root.render(scene(props)));
