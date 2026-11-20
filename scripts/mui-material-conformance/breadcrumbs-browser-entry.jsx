import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BreadcrumbsScene, HydrationScene } from "./breadcrumbs-scene.jsx";
const existing = document.getElementById("hydration");
if (existing) {
  window.savedHydrated = existing.querySelector("#hydrated button");
  hydrateRoot(
    existing,
    <React.StrictMode>
      <HydrationScene />
    </React.StrictMode>,
    {
      onRecoverableError: (e) => {
        throw e;
      },
    },
  );
  window.hydrationReady = true;
} else {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  window.renderBreadcrumbs = (props = {}) =>
    root.render(
      <React.StrictMode>
        <BreadcrumbsScene {...props} />
      </React.StrictMode>,
    );
  window.unmountBreadcrumbs = () => root.unmount();
  window.renderBreadcrumbs();
}
