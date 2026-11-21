import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { YearGrid, HydrationScene } from "./grid-scene.jsx";
const host = document.getElementById("hydration");
if (host) {
  window.serverButton = host.querySelector("button");
  hydrateRoot(host, <HydrationScene />, {
    onRecoverableError: (e) => {
      throw e;
    },
  });
  window.hydrationReady = true;
} else {
  const viewport = document.createElement("div");
  document.body.append(viewport);
  const root = createRoot(viewport);
  window.draw = (props) =>
    flushSync(() =>
      root.render(
        <React.StrictMode>
          <YearGrid
            {...props}
            onSelect={(year) => {
              window.selected = year;
            }}
          />
        </React.StrictMode>,
      ),
    );
}
