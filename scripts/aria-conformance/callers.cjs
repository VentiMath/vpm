"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "varia-caller-"));
(async () => {
  try {
    fs.symlinkSync(
      path.join(__dirname, "node_modules"),
      path.join(temp, "node_modules"),
      "dir",
    );
    for (const original of [true, false]) {
      const dom = new (require("jsdom").JSDOM)(
        '<!doctype html><body><main id="app"></main><div id="status" aria-live="polite"></div></body>',
        { pretendToBeVisual: true, url: "http://localhost" },
      );
      for (const key of [
        "window",
        "document",
        "HTMLElement",
        "Element",
        "Node",
        "NodeFilter",
        "MutationObserver",
        "CustomEvent",
        "Event",
        "FocusEvent",
        "KeyboardEvent",
        "HTMLInputElement",
        "getComputedStyle",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ])
        globalThis[key] =
          key === "window"
            ? dom.window
            : key === "document"
              ? dom.window.document
              : typeof dom.window[key] === "function" &&
                  [
                    "getComputedStyle",
                    "requestAnimationFrame",
                    "cancelAnimationFrame",
                  ].includes(key)
                ? dom.window[key].bind(dom.window)
                : dom.window[key];
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      const target = original
        ? require.resolve("aria-hidden")
        : path.resolve(__dirname, "../../packages/varia-hidden/index.cjs");
      const wrapper = path.join(temp, original ? "original.cjs" : "vpm.cjs");
      fs.writeFileSync(
        wrapper,
        `const api=require(${JSON.stringify(target)});module.exports={...api,hideOthers(...args){globalThis.ariaCalls++;return api.hideOthers(...args)}};`,
      );
      const out = path.join(
        temp,
        original ? "menu-original.cjs" : "menu-vpm.cjs",
      );
      require("esbuild").buildSync({
        entryPoints: [require.resolve("@radix-ui/react-menu")],
        outfile: out,
        bundle: true,
        platform: "node",
        alias: { "aria-hidden": wrapper },
        external: ["react", "react-dom", "react-dom/client"],
      });
      const Menu = require(out),
        React = require("react"),
        { createRoot } = require("react-dom/client"),
        host = document.getElementById("app"),
        root = createRoot(host);
      globalThis.ariaCalls = 0;
      await React.act(async () => {
        root.render(
          React.createElement(
            Menu.Root,
            { open: true },
            React.createElement(
              Menu.Portal,
              null,
              React.createElement(
                Menu.Content,
                { "aria-label": "Actions" },
                React.createElement(Menu.Item, null, "First"),
              ),
            ),
          ),
        );
        await new Promise((r) => setTimeout(r, 20));
      });
      assert.equal(globalThis.ariaCalls, 1);
      assert.equal(host.getAttribute("aria-hidden"), "true");
      assert.equal(
        document.getElementById("status").getAttribute("aria-hidden"),
        null,
      );
      assert(document.querySelector('[role="menu"]'));
      assert(
        !document.querySelector('[role="menu"]').hasAttribute("aria-hidden"),
      );
      await React.act(async () => root.unmount());
      assert.equal(host.getAttribute("aria-hidden"), null);
      assert(!document.querySelector("[data-aria-hidden]"));
      dom.window.close();
      console.log(
        (original ? "Original" : "VPM") +
          ": actual Radix 2.1.16 modal menu calls hideOthers, preserves live regions and releases isolation.",
      );
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
