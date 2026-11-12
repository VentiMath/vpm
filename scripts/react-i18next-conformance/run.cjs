"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const React = require("react"),
  { renderToString } = require("react-dom/server");
const own = require(require("./prepare.cjs"));
const engines = [
  require("i18next"),
  require("i18next-app"),
  require("../../packages/vi18next"),
];
let checks = 0;
const resources = {
  en: {
    main: {
      TITLE: "Contest archive",
      nested: { TITLE: "Nested title" },
      COUNT_other: "{{count}} problems",
    },
    extra: { ONLY: "Other namespace" },
  },
  es: {
    main: {
      TITLE: "Archivo",
      nested: { TITLE: "Anidado" },
      COUNT_other: "{{count}} problemas",
    },
    extra: { ONLY: "Otro" },
  },
};
function output(api, x, namespace, options, providerNS) {
  function View() {
    const result = api.useTranslation(namespace, options),
      [t, i, ready] = result;
    assert.equal(t, result.t);
    assert.equal(i, result.i18n);
    assert.equal(ready, result.ready);
    return React.createElement(
      "p",
      { "data-ready": ready },
      t("TITLE"),
      ":",
      t("COUNT", { count: 3 }),
      ":",
      t("ONLY"),
    );
  }
  return renderToString(
    React.createElement(
      api.I18nextProvider,
      { i18n: x, defaultNS: providerNS },
      React.createElement(View),
    ),
  );
}
(async () => {
  for (const engine of engines) {
    for (const upstream of [
      require("react-i18next"),
      require("react-i18next-app"),
    ]) {
      const x = engine.createInstance();
      await x.init({
        lng: "en",
        fallbackLng: "en",
        defaultNS: "main",
        resources,
        interpolation: { escapeValue: false },
      });
      for (const lng of ["en", "es", "es-MX"]) {
        await x.changeLanguage(lng);
        for (const ns of [
          undefined,
          "main",
          ["main", "extra"],
          ["extra", "main"],
        ])
          for (const prefix of [undefined, "nested"])
            for (const mode of ["default", "fallback"])
              for (const language of [undefined, "en", "es"]) {
                const options = {
                  keyPrefix: prefix,
                  nsMode: mode,
                  lng: language,
                  useSuspense: false,
                };
                assert.equal(
                  output(own, x, ns, options),
                  output(upstream, x, ns, options),
                );
                checks++;
              }
        assert.equal(
          output(own, x, undefined, {}, "extra"),
          output(upstream, x, undefined, {}, "extra"),
        );
        checks++;
      }
    }
  }
  console.log(
    checks +
      " SSR comparisons against current/app React adapters with current/app/VPM engines pass",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
