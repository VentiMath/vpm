"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/i18next-conformance");
function engine(file) {
  const x = require(file).createInstance();
  x.init({
    lng: "en",
    fallbackLng: "en",
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        contests: {
          TITLE: "Contest archive",
          COUNT_one: "{{count}} problem",
          COUNT_other: "{{count}} problems",
          WELCOME: "Hello {{name}}: {{count}} results",
          FALLBACK: "English fallback",
        },
      },
      es: { contests: { TITLE: "Archivo de concursos" } },
    },
    defaultNS: "contests",
  });
  assert.equal(x.isInitialized, true);
  return x;
}
const cases = [
  {
    name: "contest label",
    make(file) {
      const x = engine(file);
      return () => x.t("TITLE");
    },
    validate(v) {
      assert.equal(v, "Contest archive");
    },
  },
  {
    name: "count and name interpolation",
    make(file) {
      const x = engine(file);
      return () => x.t("WELCOME", { name: "Ada", count: 12 });
    },
    validate(v) {
      assert.equal(v, "Hello Ada: 12 results");
    },
  },
  {
    name: "plural problem count",
    make(file) {
      const x = engine(file);
      return () => x.t("COUNT", { count: 12 });
    },
    validate(v) {
      assert.equal(v, "12 problems");
    },
  },
  {
    name: "regional locale fallback",
    make(file) {
      const x = engine(file);
      x.changeLanguage("es-MX");
      return () => x.t("FALLBACK");
    },
    validate(v) {
      assert.equal(v, "English fallback");
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(path.join(fixture, "node_modules/i18next")),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "language.cjs",
      "resources.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/i18next-conformance/package-lock.json",
      "../../scripts/i18next-conformance/node_modules/i18next",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
