import React from "react";
import { renderToString } from "react-dom/server";
import { Scene, navigation, frameSheets, page } from "./globals-scene.jsx";
export function render(styles, suppliedTheme) {
  return renderToString(
    <Scene styles={styles} suppliedTheme={suppliedTheme} />,
  );
}
export function prepare(kind) {
  const styles = { navigation, page, frameSheets }[kind];
  return () => render(styles);
}
