"use strict";
// Observe original unhandled load failures in isolated processes, outside the
// test runner. The VPM control must report the error without an unhandled event.
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
async function child(variant, mode) {
  const { JSDOM } = require("jsdom"),
    dom = new JSDOM('<!doctype html><body><div id="root"></div>');
  for (const name of ["window", "document", "navigator", "HTMLElement", "Node"])
    Object.defineProperty(globalThis, name, {
      value: dom.window[name],
      configurable: true,
    });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require("react"),
    { createRoot } = require("react-dom/client");
  const own = variant === "vpm";
  const api = require(own ? "../../packages/vuse-sidecar" : "use-sidecar");
  require(
    own ? "../../packages/vuse-sidecar/env.cjs" : "use-sidecar/dist/es5/env.js",
  ).env.isNode = false;
  const unhandled = [],
    reported = [];
  process.on("unhandledRejection", (error) => unhandled.push(error));
  api.setConfig({ onError: (error) => reported.push(error) });
  const failure = Error("synchronous import failure");
  const importer =
    mode === "throw"
      ? () => {
          throw failure;
        }
      : () => Promise.resolve(null);
  const medium = mode === "medium" ? api.createSidecarMedium() : undefined;
  let seen, caught;
  const root = createRoot(document.getElementById("root"));
  function App() {
    const [, error] = api.useSidecar(importer, medium);
    seen = error;
    return null;
  }
  try {
    try {
      await React.act(async () => {
        root.render(React.createElement(App));
        await new Promise((r) => setTimeout(r, 20));
      });
    } catch (error) {
      caught = error;
    }
    await React.act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    if (own) {
      assert.equal(caught, undefined);
      assert.equal(unhandled.length, 0);
      assert.ok(seen instanceof Error);
      assert.deepEqual(reported, [seen]);
      if (mode === "throw") assert.equal(seen, failure);
    } else if (mode === "throw") assert.equal(caught, failure);
    else {
      assert.equal(unhandled.length, 1);
      if (mode === "exports") {
        assert.ok(unhandled[0] instanceof TypeError);
        assert.equal(seen, null);
      } else assert.equal(unhandled[0], seen);
    }
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
}
if (process.argv[2] === "--child")
  child(process.argv[3], process.argv[4]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
else {
  for (const variant of ["upstream", "vpm"])
    for (const mode of ["throw", "exports", "medium"]) {
      const r = spawnSync(
        process.execPath,
        [__filename, "--child", variant, mode],
        { encoding: "utf8", timeout: 10000 },
      );
      assert.equal(
        r.status,
        0,
        variant + "/" + mode + "\n" + r.stdout + "\n" + r.stderr,
      );
    }
  console.log(
    "Three isolated original failure controls: synchronous throw, missing exports and missing medium; VPM handles each without unhandled rejection.",
  );
}
