"use strict";
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const unwrap = (x) => x.default || x;
const implementations = {
  app: {
    add: unwrap(require("dom-helpers-app/addClass")),
    remove: unwrap(require("dom-helpers-app/removeClass")),
  },
  current: {
    add: unwrap(require("dom-helpers/addClass")),
    remove: unwrap(require("dom-helpers/removeClass")),
  },
  native: {
    add: (el, token) => {
      el.classList.add(token);
    },
    remove: (el, token) => {
      el.classList.remove(token);
    },
  },
};
const results = [];
for (const helpers of Object.values(implementations)) {
  const dom = new JSDOM("<!doctype html><iframe></iframe>"),
    out = [];
  try {
    for (const doc of [
      dom.window.document,
      dom.window.document.querySelector("iframe").contentDocument,
    ])
      for (const tag of ["div", "svg"]) {
        const el =
          tag === "svg"
            ? doc.createElementNS("http://www.w3.org/2000/svg", "svg")
            : doc.createElement(tag);
        el.setAttribute("class", "keep");
        for (const token of [
          "one",
          "a.b",
          "sm:hover",
          "réponse",
          "a+b",
          "[x]",
        ]) {
          assert.equal(helpers.add(el, token), undefined);
          helpers.add(el, token);
          assert.equal(el.classList.length, 2);
          out.push(el.getAttribute("class"));
          assert.equal(helpers.remove(el, token), undefined);
          helpers.remove(el, token);
          assert.equal(el.getAttribute("class"), "keep");
        }
        for (const token of ["", "two words", "a\tb"])
          for (const method of ["add", "remove"]) {
            let result;
            try {
              helpers[method](el, token);
            } catch (e) {
              result = e.name;
            }
            out.push(result);
            assert(result);
          }
      }
  } finally {
    dom.window.close();
  }
  results.push(out);
}
assert.deepEqual(results[1], results[0]);
assert.deepEqual(results[2], results[0]);
console.log(
  "Current/app/native class contracts match for HTML/SVG, two owner documents, repeated operations, punctuation and rejected tokens.",
);
