import React from "react";
import { renderToString } from "react-dom/server";
import { Scene } from "./scene.jsx";
export const run = (color, compact) =>
  renderToString(<Scene color={color} compact={compact} />);
