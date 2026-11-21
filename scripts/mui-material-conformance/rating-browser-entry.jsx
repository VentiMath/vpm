import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { RatingScene, HydrationScene } from "./rating-scene.jsx";
const host = document.getElementById("hydration");
if (host) {
  window.originalInput = host.querySelector("input");
  hydrateRoot(host, <HydrationScene />, {
    onRecoverableError: (e) => {
      throw e;
    },
  });
  window.hydrated = true;
} else {
  const area = document.createElement("div");
  document.body.append(area);
  const root = createRoot(area);
  window.picks = [];
  window.previews = [];
  window.draw = (props) =>
    flushSync(() =>
      root.render(
        <React.StrictMode>
          <RatingScene
            {...props}
            interactive
            onPick={(row, n) => window.picks.push([row, n])}
            onPreview={(row, n) => window.previews.push([row, n])}
          />
        </React.StrictMode>,
      ),
    );
}
