"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../.."),
  from = createRequire(
    path.join(root, "scripts/sidecar-conformance/package.json"),
  );
const { JSDOM } = from("jsdom"),
  React = from("react"),
  { createRoot } = from("react-dom/client"),
  { renderToString } = from("react-dom/server");
const { act, createElement: h } = React;
assert.equal(from("react-style-singleton/package.json").version, "2.2.3");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vstyle-tests-"));
fs.symlinkSync(
  path.dirname(from.resolve("react/package.json")) + "/..",
  path.join(temp, "node_modules"),
  "dir",
);
let checks = 0;
try {
  for (const original of [true, false]) {
    const subject = original
      ? from.resolve("react-style-singleton")
      : path.join(root, "packages/vreact-style-singleton/index.cjs");
    const nonce = original
      ? from.resolve("get-nonce")
      : path.join(root, "packages/vget-nonce/index.cjs");
    const file = path.join(temp, original ? "original.cjs" : "vpm.cjs");
    from("esbuild").buildSync({
      stdin: {
        contents: `exports.api=require(${JSON.stringify(subject)});exports.nonce=require(${JSON.stringify(nonce)});`,
        resolveDir: root,
      },
      outfile: file,
      bundle: true,
      platform: "node",
      external: ["react"],
      alias: { "vget-nonce": nonce },
    });
    const { api, nonce: config } = require(file);
    const Style = api.styleSingleton();
    assert.equal(renderToString(h(Style, { styles: "body{}" })), "");
    checks++;
    const serverSheet = api.stylesheetSingleton();
    if (original)
      assert.throws(() => serverSheet.add("body{}"), ReferenceError);
    else serverSheet.add("body{}");
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
    );
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const styles = () => [...document.head.querySelectorAll("style")];
    try {
      serverSheet.add("body{}");
      assert.equal(styles().length, 1);
      serverSheet.remove();
      checks++;
      const sheet = api.stylesheetSingleton();
      config.setNonce("configured");
      sheet.add("body {color: red}");
      sheet.add("ignored");
      assert.equal(styles().length, 1);
      assert.equal(styles()[0].nonce, "configured");
      assert.equal(styles()[0].textContent, "body {color: red}");
      sheet.remove();
      assert.equal(styles().length, 1);
      sheet.remove();
      assert.equal(styles().length, 0);
      checks++;
      config.setNonce(undefined);
      globalThis.__webpack_nonce__ = "bundler";
      sheet.add("body{}");
      assert.equal(styles()[0].nonce, "bundler");
      styles()[0].remove();
      sheet.remove();
      delete globalThis.__webpack_nonce__;
      checks++;
      const broken = api.stylesheetSingleton();
      broken.remove();
      broken.add("body{}");
      assert.equal(styles().length, original ? 0 : 1);
      broken.remove();
      checks++;
      const first = api.stylesheetSingleton(),
        second = api.stylesheetSingleton();
      first.add("a{}");
      second.add("b{}");
      assert.equal(styles().length, 2);
      first.remove();
      assert.equal(styles()[0].textContent, "b{}");
      second.remove();
      checks++;
      const host = document.createElement("main");
      document.body.append(host);
      const view = createRoot(host);
      act(() =>
        view.render(
          h(
            React.StrictMode,
            null,
            h(Style, { styles: "a{}" }),
            h(Style, { styles: "b{}" }),
          ),
        ),
      );
      assert.equal(styles().length, 1);
      assert.equal(styles()[0].textContent, "a{}");
      act(() =>
        view.render(h(React.StrictMode, null, h(Style, { styles: "c{}" }))),
      );
      assert.equal(styles()[0].textContent, "a{}");
      act(() => view.unmount());
      assert.equal(styles().length, 0);
      host.remove();
      checks++;
      const useStyle = api.styleHookSingleton();
      function Hook({ css, dynamic }) {
        useStyle(css, dynamic);
        return null;
      }
      const mount = document.createElement("main");
      document.body.append(mount);
      const dynamicView = createRoot(mount);
      act(() => dynamicView.render(h(Hook, { css: "a{}", dynamic: true })));
      act(() => dynamicView.render(h(Hook, { css: "b{}", dynamic: true })));
      assert.equal(styles()[0].textContent, original ? "a{}" : "b{}");
      checks++;
      act(() => dynamicView.render(h(Hook, { css: "", dynamic: true })));
      assert.equal(styles()[0].textContent, "");
      act(() => dynamicView.render(h(Hook, { css: "c{}", dynamic: true })));
      assert.equal(styles()[0].textContent, "c{}");
      checks++;
      act(() => dynamicView.render(h(Hook, { css: "d{}", dynamic: false })));
      act(() => dynamicView.render(h(Hook, { css: "e{}", dynamic: false })));
      assert.equal(styles()[0].textContent, "d{}");
      act(() => dynamicView.unmount());
      assert.equal(styles().length, 0);
      mount.remove();
      checks++;
      // The original scroll lock is bundled unchanged; only its stylesheet dependency is replaced.
      const caller = path.join(
        temp,
        original ? "caller-original.cjs" : "caller-vpm.cjs",
      );
      from("esbuild").buildSync({
        entryPoints: [from.resolve("react-remove-scroll")],
        outfile: caller,
        bundle: true,
        platform: "node",
        external: ["react", "react-dom"],
        alias: { "react-style-singleton": subject, "vget-nonce": nonce },
      });
      const { RemoveScroll } = require(caller),
        node = document.createElement("main");
      document.body.append(node);
      const locks = createRoot(node);
      act(() =>
        locks.render(
          h(
            React.Fragment,
            null,
            h(RemoveScroll, null, "a"),
            h(RemoveScroll, null, "b"),
          ),
        ),
      );
      assert.equal(document.body.getAttribute("data-scroll-locked"), "2");
      assert.equal(styles().length, 1);
      assert.match(styles()[0].textContent, /overflow: hidden/);
      act(() => locks.render(h(RemoveScroll, null, "a")));
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      assert.equal(styles().length, 1);
      act(() => locks.unmount());
      assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
      assert.equal(styles().length, 0);
      node.remove();
      checks++;
    } finally {
      config.setNonce(undefined);
      dom.window.close();
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.__webpack_nonce__;
    }
    console.log(
      `${original ? "Original" : "VPM"}: 11 stylesheet, React 19, SSR and real scroll-lock scenarios pass.`,
    );
  }
  assert.equal(checks, 22);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
