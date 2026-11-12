"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/react-i18next-conformance");
const vpm = require(fixture + "/prepare.cjs");
const React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server");
const { createInstance } = require(fixture + "/node_modules/i18next");
const cases = [1, 25].map((count) => ({
  name:
    count === 1 ? "translated component SSR" : "25 translated components SSR",
  make(file) {
    const api = require(file),
      engine = createInstance();
    engine.init({
      lng: "en",
      defaultNS: "contests",
      resources: { en: { contests: { TITLE: "Contest archive" } } },
    });
    assert.equal(engine.isInitialized, true);
    function View() {
      const { t } = api.useTranslation();
      return React.createElement("p", null, t("TITLE"));
    }
    const tree = React.createElement(
      api.I18nextProvider,
      { i18n: engine },
      Array.from({ length: count }, (_, key) =>
        React.createElement(View, { key }),
      ),
    );
    return () => renderToString(tree);
  },
  validate(value) {
    assert.equal(value, "<p>Contest archive</p>".repeat(count));
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(fixture + "/node_modules/react-i18next"),
    vpm,
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/react-i18next-conformance/prepare.cjs",
      "../../scripts/react-i18next-conformance/package-lock.json",
      "../../scripts/react-i18next-conformance/node_modules/react-i18next",
      "../../scripts/react-i18next-conformance/node_modules/i18next",
      "../../scripts/react-i18next-conformance/node_modules/react",
      "../../scripts/react-i18next-conformance/node_modules/react-dom",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
