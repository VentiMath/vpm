import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { renderToString } from "react-dom/server.browser";
import * as api from "@tanstack/react-virtual";
const h = React.createElement,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  check = (yes, message) => {
    if (!yes) throw Error(message);
  };
export default function setup(variant) {
  (window.adapterCases ??= {})[variant] = async () => {
    const shared = [],
      host = document.createElement("div");
    document.body.append(host);
    const viewport = document.createElement("div");
    viewport.style.cssText =
      "width:200px;height:100px;overflow:auto;scrollbar-width:none";
    host.append(viewport);
    const mount = document.createElement("div");
    viewport.append(mount);
    let instance,
      emit,
      subscriptions = 0,
      tag = "a",
      useFlushSync = true,
      suspend = false;
    const callbacks = [],
      messages = [],
      original = console.error;
    console.error = (...args) => {
      messages.push(args.map(String).join(" "));
    };
    const observeRect = (_, cb) => {
      cb({ width: 200, height: 100 });
      return () => {};
    };
    const observeOffset = (_, cb) => {
      emit = cb;
      subscriptions++;
      return () => subscriptions--;
    };
    const pause = new Promise(() => {});
    function App({ version = tag, blocked = suspend, flush = useFlushSync }) {
      const v = api.useVirtualizer({
        count: 100,
        estimateSize: () => 20,
        getScrollElement: () => viewport,
        initialRect: { width: 200, height: 100 },
        observeElementRect: observeRect,
        observeElementOffset: observeOffset,
        useFlushSync: flush,
        onChange: () => callbacks.push(version),
      });
      instance = v;
      if (blocked) throw pause;
      return h(
        "section",
        {
          ref: v.containerRef,
          style: { position: "relative", height: v.getTotalSize() },
        },
        v
          .getVirtualItems()
          .map((item) =>
            h(
              "button",
              {
                key: item.key,
                "data-index": item.index,
                style: {
                  position: "absolute",
                  top: item.start,
                  height: item.size,
                },
              },
              item.index,
            ),
          ),
      );
    }
    const view = (props = {}) =>
      h(
        React.StrictMode,
        null,
        h(React.Suspense, { fallback: h("p", null, "waiting") }, h(App, props)),
      );
    const root = createRoot(mount);
    let quietAfterDispose, committedHandler;
    try {
      flushSync(() => root.render(view()));
      await wait(30);
      const first = instance;
      check(subscriptions === 1, "one subscription after StrictMode mount");
      shared.push("strict-mounted");
      const node = mount.querySelector("button");
      node.focus();
      flushSync(() => root.render(view({ version: "b" })));
      await wait(20);
      check(instance === first, "stable instance");
      check(
        mount.querySelector("button") === node &&
          document.activeElement === node,
        "stable focused DOM",
      );
      shared.push("stable-parent-render");
      emit(200, true);
      check(
        mount.querySelector("button").dataset.index === "9",
        "sync scroll render before return",
      );
      shared.push("sync-render");
      flushSync(() => root.render(view({ version: "b", flush: false })));
      emit(400, true);
      check(
        mount.querySelector("button").dataset.index === "9",
        "batched update not forced",
      );
      await wait(30);
      check(
        mount.querySelector("button").dataset.index === "19",
        "batched update rendered",
      );
      shared.push("batched-render");
      React.startTransition(() =>
        root.render(
          view({ version: "uncommitted", blocked: true, flush: false }),
        ),
      );
      await wait(35);
      const before = callbacks.length;
      instance.options.onChange(instance, false);
      await wait(20);
      committedHandler =
        callbacks.slice(before).length > 0 &&
        callbacks.slice(before).every((x) => x === "b");
      flushSync(() => root.render(view({ version: "c" })));
      await wait(20);
      const notify = instance.options.onChange;
      root.unmount();
      check(subscriptions === 0, "unsubscribe on unmount");
      const count = callbacks.length;
      notify(instance, false);
      quietAfterDispose = callbacks.length === count;
      shared.push("disposed");
    } finally {
      console.error = original;
      host.remove();
    }
    const hydration = document.createElement("div");
    document.body.append(hydration);
    function Hydrate() {
      const v = api.useVirtualizer({
        count: 20,
        estimateSize: () => 20,
        getScrollElement: () => null,
        initialRect: { width: 100, height: 60 },
      });
      return h(
        "div",
        null,
        v.getVirtualItems().map((x) => h("span", { key: x.key }, x.index)),
      );
    }
    hydration.innerHTML = renderToString(h(Hydrate));
    const originalNode = hydration.firstChild,
      recoverable = [];
    const hydrated = hydrateRoot(hydration, h(Hydrate), {
      onRecoverableError: (e) => recoverable.push(e.message),
    });
    await wait(30);
    check(
      hydration.firstChild === originalNode,
      "hydration preserves root DOM",
    );
    check(recoverable.length === 0, "hydration has no mismatches");
    hydrated.unmount();
    hydration.remove();
    shared.push("hydrated");
    // An offset observer is allowed to report synchronously during setup. The
    // adapter schedules that notification without calling flushSync in an effect.
    const setupHost = document.createElement("div");
    document.body.append(setupHost);
    const setupErrors = [];
    console.error = (...args) => setupErrors.push(args.map(String).join(" "));
    const synchronousOffset = (_, cb) => {
      cb(0, true);
      return () => {};
    };
    function Setup() {
      api.useVirtualizer({
        count: 10,
        getScrollElement: () => setupHost,
        estimateSize: () => 20,
        initialRect: { width: 100, height: 60 },
        observeElementRect: observeRect,
        observeElementOffset: synchronousOffset,
      });
      return h("div");
    }
    const setupRoot = createRoot(setupHost);
    try {
      flushSync(() => setupRoot.render(h(Setup)));
      await wait(30);
      setupRoot.unmount();
    } finally {
      console.error = original;
      setupHost.remove();
    }
    const setupFlushWarnings = setupErrors.filter((x) =>
      x.includes("flushSync"),
    ).length;
    check(
      messages.every((x) => x.includes("flushSync")),
      "unexpected React error: " + messages.join("\n"),
    );
    return { shared, committedHandler, quietAfterDispose, setupFlushWarnings };
  };
}
