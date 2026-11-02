"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  from = createRequire(
    path.resolve(root, "../../scripts/sidecar-conformance/package.json"),
  );
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vscroll-bench-")),
  resources = [];
fs.symlinkSync(
  path.dirname(from.resolve("react/package.json")) + "/..",
  path.join(temp, "node_modules"),
  "dir",
);
function api(file) {
  const alias = Object.fromEntries(
    [
      "vreact-remove-scroll-bar",
      "vreact-style-singleton",
      "vget-nonce",
      "vuse-callback-ref",
      "vuse-sidecar",
    ].map((n) => [n, path.resolve(root, "..", n)]),
  );
  alias["vreact-remove-scroll-bar/constants"] = path.resolve(
    root,
    "../vreact-remove-scroll-bar/constants.cjs",
  );
  const out = path.join(temp, "api-" + resources.length + ".cjs");
  from("esbuild").buildSync({
    stdin: {
      contents: `module.exports=require(${JSON.stringify(file)});`,
      resolveDir: root,
    },
    outfile: out,
    bundle: true,
    platform: "node",
    external: ["react"],
    alias,
  });
  return require(out);
}
const cases = [
  {
    name: "React server render",
    make: (file) => {
      const { RemoveScroll } = api(file),
        React = from("react"),
        { renderToString } = from("react-dom/server");
      return () =>
        renderToString(React.createElement(RemoveScroll, null, "content"));
    },
    validate: (x) => assert.equal(x, "<div>content</div>"),
  },
];
for (const count of [1, 8])
  cases.push({
    name: `outside wheel / ${count} active locks (jsdom)`,
    make: (file) => {
      const dom = new (from("jsdom").JSDOM)(
        "<!doctype html><html><body><main></main></body></html>",
      );
      for (const name of [
        "window",
        "document",
        "Element",
        "Node",
        "ShadowRoot",
      ])
        globalThis[name] =
          name === "window"
            ? dom.window
            : name === "document"
              ? dom.window.document
              : dom.window[name];
      const { RemoveScroll } = api(file),
        React = from("react"),
        { createRoot } = from("react-dom/client"),
        { flushSync } = from("react-dom");
      const view = createRoot(document.querySelector("main"));
      flushSync(() =>
        view.render(
          React.createElement(
            React.Fragment,
            null,
            ...Array.from({ length: count }, (_, key) =>
              React.createElement(
                RemoveScroll,
                { key, removeScrollBar: false },
                "content",
              ),
            ),
          ),
        ),
      );
      resources.push({ dom, view, flushSync });
      return () => {
        const event = new dom.window.WheelEvent("wheel", {
          deltaY: 10,
          bubbles: true,
          cancelable: true,
        });
        dom.window.document.body.dispatchEvent(event);
        return event.defaultPrevented;
      };
    },
    validate: (x) => assert.equal(x, true),
  });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.dirname(from.resolve("react-remove-scroll/package.json")),
    vpm: root,
    cases,
    files: [
      "package.json",
      "index.cjs",
      "ui.cjs",
      "effects.cjs",
      "controller.cjs",
      "sidecar.cjs",
      "medium.cjs",
      "bench/compare.cjs",
      "../vreact-remove-scroll-bar/index.cjs",
      "../vreact-style-singleton/index.cjs",
      "../vuse-callback-ref/index.cjs",
      "../vuse-sidecar/index.cjs",
      "../vuse-sidecar/medium.cjs",
      "../../scripts/sidecar-conformance/package-lock.json",
      "../../scripts/sidecar-conformance/node_modules/react-remove-scroll",
    ],
    cleanup: () => {
      for (const { dom, view, flushSync } of resources) {
        flushSync(() => view.unmount());
        dom.window.close();
      }
      fs.rmSync(temp, { recursive: true, force: true });
    },
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
