"use strict";
const assert = require("node:assert/strict"),
  { JSDOM } = require("jsdom");
const paths = [
  ["original", require.resolve("aria-hidden")],
  ["VPM", require.resolve("../../packages/varia-hidden")],
];
let total = 0;
for (const [label, file] of paths) {
  const fixed = label === "VPM";
  let count = 0;
  function scenario(name, run) {
    delete require.cache[file];
    const api = require(file),
      dom = new JSDOM(
        '<!doctype html><body><main><button id="outside">Outside</button></main><section id="branch"><aside id="sibling"></aside><div id="dialog"><button>Inside</button></div></section><div id="live" aria-live="polite"></div><script></script></body>',
      );
    const d = dom.window.document;
    globalThis.document = d;
    globalThis.HTMLElement = dom.window.HTMLElement;
    const q = (id) => d.getElementById(id);
    try {
      run(api, d, q, dom.window);
      count++;
    } catch (e) {
      e.message = label + " " + name + ": " + e.message;
      throw e;
    } finally {
      dom.window.close();
    }
  }
  scenario("sibling boundaries and live/script preservation", (api, d, q) => {
    const undo = api.hideOthers(q("dialog"));
    assert.equal(d.querySelector("main").getAttribute("aria-hidden"), "true");
    assert.equal(q("sibling").getAttribute("aria-hidden"), "true");
    for (const el of [
      q("branch"),
      q("dialog"),
      q("live"),
      d.querySelector("script"),
    ])
      assert(!el.hasAttribute("aria-hidden"));
    undo();
    assert(!d.querySelector("[data-aria-hidden]"));
    assert(!d.querySelector("[aria-hidden]"));
  });
  scenario("multiple targets and custom parent", (api, d, q) => {
    const undo = api.hideOthers([q("dialog"), q("sibling")], q("branch"));
    assert(!d.querySelector("[aria-hidden]"));
    undo();
    const end = api.inertOthers(q("dialog"), q("branch"));
    assert.equal(q("sibling").getAttribute("inert"), "true");
    assert(!d.querySelector("main").hasAttribute("inert"));
    end();
  });
  scenario("inert covers live region", (api, d, q) => {
    const undo = api.inertOthers(q("dialog"));
    assert.equal(q("live").getAttribute("inert"), "true");
    undo();
    assert(!q("live").hasAttribute("inert"));
  });
  scenario("nested independent locks", (api, d, q) => {
    const a = api.hideOthers(q("branch")),
      b = api.hideOthers(q("dialog"));
    a();
    assert.equal(d.querySelector("main").getAttribute("aria-hidden"), "true");
    b();
    assert(!d.querySelector("[aria-hidden]"));
  });
  scenario("preexisting hidden value", (api, d, q) => {
    q("sibling").setAttribute("aria-hidden", "true");
    const undo = api.hideOthers(q("dialog"));
    undo();
    assert.equal(q("sibling").getAttribute("aria-hidden"), "true");
  });
  scenario("restore explicit false and existing marker", (api, d, q) => {
    q("sibling").setAttribute("aria-hidden", "false");
    q("sibling").setAttribute("data-aria-hidden", "owned");
    const undo = api.hideOthers(q("dialog"));
    undo();
    assert.equal(
      q("sibling").getAttribute("aria-hidden"),
      fixed ? "false" : null,
    );
    assert.equal(
      q("sibling").getAttribute("data-aria-hidden"),
      fixed ? "owned" : null,
    );
  });
  scenario("idempotent cleanup", (api, d, q) => {
    const a = api.hideOthers(q("dialog")),
      b = api.hideOthers(q("dialog"));
    a();
    a();
    assert.equal(
      q("sibling").getAttribute("aria-hidden"),
      fixed ? "true" : null,
    );
    b();
  });
  scenario("mixed aria/inert ownership", (api, d, q) => {
    const a = api.hideOthers(q("dialog")),
      b = api.inertOthers(q("dialog"));
    a();
    assert.equal(
      q("sibling").getAttribute("aria-hidden"),
      fixed ? null : "true",
    );
    assert.equal(q("sibling").getAttribute("inert"), "true");
    b();
    assert(!q("sibling").hasAttribute("inert"));
  });
  scenario("external mutation", (api, d, q) => {
    const undo = api.hideOthers(q("dialog"));
    q("sibling").setAttribute("aria-hidden", "false");
    undo();
    assert.equal(
      q("sibling").getAttribute("aria-hidden"),
      fixed ? "false" : null,
    );
  });
  scenario("prototype-named marker", (api, d, q) => {
    if (!fixed) {
      const old = console.error;
      let errors = 0;
      console.error = () => errors++;
      try {
        api.hideOthers(q("dialog"), d.body, "__proto__")();
      } finally {
        console.error = old;
      }
      assert(errors > 0);
      assert(!q("sibling").hasAttribute("aria-hidden"));
      return;
    }
    const undo = api.hideOthers(q("dialog"), d.body, "__proto__");
    assert.equal(q("sibling").getAttribute("__proto__"), "true");
    undo();
    assert(!q("sibling").hasAttribute("__proto__"));
  });
  scenario("detached invalid target", (api, d, q) => {
    const old = console.error;
    console.error = () => {};
    let undo;
    try {
      undo = api.hideOthers(d.createElement("div"));
    } finally {
      console.error = old;
    }
    assert.equal(
      d.querySelector("main").getAttribute("aria-hidden"),
      fixed ? null : "true",
    );
    undo();
  });
  scenario("shadow host target", (api, d, q) => {
    const host = d.createElement("div");
    d.body.append(host);
    const shadow = host.attachShadow({ mode: "open" }),
      target = d.createElement("div");
    shadow.append(target);
    const undo = api.hideOthers(target);
    assert(!host.hasAttribute("aria-hidden"));
    assert.equal(d.querySelector("main").getAttribute("aria-hidden"), "true");
    undo();
  });
  scenario("empty and self targets", (api, d, q) => {
    const undo = api.hideOthers(d.body);
    assert(!d.querySelector("[aria-hidden]"));
    undo();
    if (fixed) {
      api.hideOthers([])();
      assert(!d.querySelector("[aria-hidden]"));
    }
  });
  scenario("supports and suppress mode", (api, d, q, w) => {
    assert.equal(api.supportsInert(), false);
    Object.defineProperty(w.HTMLElement.prototype, "inert", {
      configurable: true,
      get() {
        return this.hasAttribute("inert");
      },
    });
    assert.equal(api.supportsInert(), true);
    const undo = api.suppressOthers(q("dialog"));
    assert.equal(q("sibling").getAttribute("inert"), "true");
    assert.equal(q("sibling").getAttribute("data-suppressed"), "true");
    undo();
  });
  if (fixed) {
    scenario("nested shadow ancestors", (api, d, q) => {
      const host = d.createElement("div");
      d.body.append(host);
      const inner = d.createElement("div");
      host.attachShadow({ mode: "open" }).append(inner);
      const t = d.createElement("div");
      inner.attachShadow({ mode: "open" }).append(t);
      const undo = api.hideOthers(t);
      assert(!host.hasAttribute("aria-hidden"));
      assert(d.querySelector("main").hasAttribute("aria-hidden"));
      undo();
    });
    scenario("invalid marker does not partially mutate", (api, d, q) => {
      assert.throws(() =>
        api.hideOthers(q("dialog"), d.body, "invalid marker"),
      );
      assert(!d.querySelector("[aria-hidden]"));
    });
    scenario("foreign realm inert detection", (api, d, q) => {
      const other = new JSDOM("<body><div></div><aside></aside>");
      Object.defineProperty(other.window.HTMLElement.prototype, "inert", {
        get() {
          return this.hasAttribute("inert");
        },
      });
      const undo = api.suppressOthers(
        other.window.document.querySelector("div"),
      );
      assert(
        other.window.document.querySelector("aside").hasAttribute("inert"),
      );
      undo();
      other.window.close();
    });
    scenario("marker overlap across modes", (api, d, q) => {
      q("sibling").setAttribute("data-marker", "before");
      const a = api.hideOthers(q("dialog"), d.body, "data-marker"),
        b = api.inertOthers(q("dialog"), d.body, "data-marker");
      a();
      assert.equal(q("sibling").getAttribute("data-marker"), "true");
      b();
      assert.equal(q("sibling").getAttribute("data-marker"), "before");
    });
  }
  total += count;
  console.log(label + ": " + count + " DOM isolation scenarios pass.");
}
delete globalThis.document;
delete globalThis.HTMLElement;
const api = require("../../packages/varia-hidden");
assert.equal(api.supportsInert(), false);
api.hideOthers([])();
api.inertOthers([])();
api.suppressOthers([])();
console.log(total + " total scenarios; server import and empty targets safe.");
