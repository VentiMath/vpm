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
  { createRoot, hydrateRoot } = from("react-dom/client"),
  { renderToString } = from("react-dom/server");
const { act, createElement: h } = React,
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vscrollbar-tests-"));
fs.symlinkSync(
  path.dirname(from.resolve("react/package.json")) + "/..",
  path.join(temp, "node_modules"),
  "dir",
);
assert.equal(from("react-remove-scroll-bar/package.json").version, "2.3.8");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const control = [];
function rules() {
  const result = {};
  for (const sheet of document.styleSheets)
    for (const rule of sheet.cssRules) {
      const declarations = (result[rule.selectorText] ||= {});
      for (let i = 0; i < rule.style.length; i++) {
        const key = rule.style[i];
        declarations[key] = [
          rule.style.getPropertyValue(key),
          rule.style.getPropertyPriority(key),
        ];
      }
    }
  return result;
}
try {
  for (const original of [true, false]) {
    const subject = original
      ? from.resolve("react-remove-scroll-bar")
      : path.join(root, "packages/vreact-remove-scroll-bar/index.cjs");
    const nonce = original
      ? from.resolve("get-nonce")
      : path.join(root, "packages/vget-nonce/index.cjs");
    const alias = {
      "vget-nonce": nonce,
      "vreact-style-singleton": path.join(
        root,
        "packages/vreact-style-singleton/index.cjs",
      ),
    };
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
      alias,
    });
    const { api, nonce: config } = require(file),
      C = api.RemoveScrollBar;
    const zero = api.getGapWidth();
    assert.deepEqual(zero, { left: 0, top: 0, right: 0, gap: 0 });
    if (!original) {
      zero.gap = 123;
      assert.equal(api.getGapWidth().gap, 0);
    }
    assert.equal(renderToString(h(C)), "");
    const dom = new JSDOM(
      "<!doctype html><html><head></head><body></body></html>",
    );
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 980,
      configurable: true,
    });
    const style = "margin:3px 7px 0 4px;padding:5px 9px 0 2px";
    document.body.style.cssText = style;
    const host = document.createElement("main");
    document.body.append(host);
    try {
      assert.deepEqual(api.getGapWidth(), {
        left: 4,
        top: 3,
        right: 7,
        gap: 23,
      });
      assert.deepEqual(api.getGapWidth("padding"), {
        left: 2,
        top: 5,
        right: 9,
        gap: 27,
      });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 1100,
        configurable: true,
      });
      assert.equal(api.getGapWidth().gap, 0);
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 980,
        configurable: true,
      });
      config.setNonce("scrollbar");
      let index = 0;
      for (const gapMode of ["margin", "padding"])
        for (const noRelative of [false, true])
          for (const noImportant of [false, true]) {
            const view = createRoot(host);
            act(() => view.render(h(C, { gapMode, noRelative, noImportant })));
            assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
            assert.equal(
              document.head.querySelector("style").nonce,
              "scrollbar",
            );
            const snapshot = rules();
            if (original) control.push(snapshot);
            else assert.deepEqual(snapshot, control[index]);
            index++;
            act(() => view.unmount());
            assert.equal(document.head.children.length, 0);
            assert.equal(
              document.body.hasAttribute("data-scroll-locked"),
              false,
            );
          }
      const view = createRoot(host);
      act(() => view.render(h(React.StrictMode, null, h(C))));
      const sheet = document.head.querySelector("style"),
        before = sheet.textContent;
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 1000,
        configurable: true,
      });
      act(() =>
        view.render(
          h(React.StrictMode, null, h(C), h(C, { gapMode: "padding" })),
        ),
      );
      assert.equal(document.body.getAttribute("data-scroll-locked"), "2");
      assert.equal(document.head.querySelector("style"), sheet);
      assert.equal(sheet.textContent, before);
      act(() => view.render(h(React.StrictMode, null, h(C))));
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      act(() => view.unmount());
      assert.equal(document.head.children.length, 0);
      document.body.setAttribute("data-scroll-locked", "4");
      const shared = createRoot(host);
      act(() => shared.render(h(C)));
      assert.equal(document.body.getAttribute("data-scroll-locked"), "5");
      act(() => shared.unmount());
      assert.equal(document.body.getAttribute("data-scroll-locked"), "4");
      document.body.removeAttribute("data-scroll-locked");
      document.body.setAttribute("data-scroll-locked", "-3");
      const negative = createRoot(host);
      act(() => negative.render(h(C)));
      assert.equal(
        document.body.getAttribute("data-scroll-locked"),
        original ? "-2" : "1",
      );
      act(() => negative.unmount());
      const replaced = createRoot(host);
      act(() => replaced.render(h(C)));
      const oldBody = document.body,
        newBody = document.createElement("body");
      newBody.setAttribute("data-scroll-locked", "8");
      document.documentElement.replaceChild(newBody, oldBody);
      act(() => replaced.unmount());
      assert.equal(
        oldBody.getAttribute("data-scroll-locked"),
        original ? "1" : null,
      );
      assert.equal(
        newBody.getAttribute("data-scroll-locked"),
        original ? "7" : "8",
      );
      document.documentElement.replaceChild(oldBody, newBody);
      oldBody.removeAttribute("data-scroll-locked");
      let hydrated;
      act(() => {
        hydrated = hydrateRoot(host, h(C));
      });
      assert.equal(document.body.getAttribute("data-scroll-locked"), "1");
      act(() => hydrated.unmount());
      // Bundle the unchanged scroll-lock caller, replacing only its scrollbar dependency.
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
        alias: {
          ...alias,
          "react-remove-scroll-bar": subject,
          "react-remove-scroll-bar/constants": original
            ? from.resolve("react-remove-scroll-bar/constants")
            : path.join(
                root,
                "packages/vreact-remove-scroll-bar/constants.cjs",
              ),
        },
      });
      const { RemoveScroll } = require(caller),
        locks = createRoot(host);
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
      assert.equal(document.head.querySelectorAll("style").length, 1);
      act(() => locks.render(h(RemoveScroll, { enabled: false }, "a")));
      assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
      assert.equal(document.head.children.length, 0);
      act(() => locks.unmount());
      assert.equal(
        document.body.style.cssText,
        style.replace(
          "margin:3px 7px 0 4px;padding:5px 9px 0 2px",
          "margin: 3px 7px 0px 4px; padding: 5px 9px 0px 2px;",
        ),
      );
      console.log(
        `${original ? "Original" : "VPM"}: gap geometry, eight CSS-option combinations, shared locks, StrictMode, hydration, body ownership and unchanged scroll-lock caller pass.`,
      );
    } finally {
      config.setNonce(undefined);
      dom.window.close();
      delete globalThis.window;
      delete globalThis.document;
    }
  }
  // The constants-only entry has no React or stylesheet dependency.
  const result = from("esbuild").buildSync({
    entryPoints: [
      path.join(root, "packages/vreact-remove-scroll-bar/constants.mjs"),
    ],
    bundle: true,
    write: false,
    platform: "browser",
    metafile: true,
  });
  assert.equal(Object.keys(result.metafile.inputs).length, 2);
  console.log(
    "Constants-only browser entry imports no React or stylesheet runtime.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
