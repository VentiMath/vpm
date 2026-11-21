import React from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { TabsScene, HydrationScene } from "./tabs-scene.jsx";
const existing = document.getElementById("hydration");
if (existing) {
  window.savedHydrated = existing.querySelector("#hydrated");
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
  window.renderTabs = (props = {}) =>
    flushSync(() => root.render(
      <React.StrictMode>
        <TabsScene {...props} />
      </React.StrictMode>,
    ));
  window.unmountTabs = () => root.unmount();
  window.renderTabs();
}
