"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/react-i18next-conformance",
);
const React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server");
const api = require(require(fixture + "/prepare.cjs")),
  engine = require("../../vi18next");
const render = (hook, instance, defaultNS) => {
  function View() {
    return React.createElement("p", null, hook());
  }
  const view = React.createElement(View);
  return renderToString(
    instance
      ? React.createElement(
          api.I18nextProvider,
          { i18n: instance, defaultNS },
          view,
        )
      : view,
  );
};
const make = async (title = "Contest") => {
  const x = engine.createInstance();
  await x.init({
    lng: "en",
    defaultNS: "main",
    resources: { en: { main: { TITLE: title, nested: { TITLE: "Nested" } } } },
  });
  return x;
};
test("initialization plugin sets the engine without a provider", async () => {
  const x = await make();
  x.use(api.initReactI18next);
  api.initReactI18next.init(x);
  assert.equal(api.getI18n(), x);
  assert.equal(
    render(() => api.useTranslation().t("TITLE")),
    "<p>Contest</p>",
  );
  api.setI18n(undefined);
});
test("provider and explicit engine take precedence and isolate SSR requests", async () => {
  const a = await make("A"),
    b = await make("B"),
    c = await make("C");
  api.setI18n(a);
  assert.equal(
    render(() => api.useTranslation().t("TITLE"), b),
    "<p>B</p>",
  );
  assert.equal(
    render(() => api.useTranslation(undefined, { i18n: c }).t("TITLE"), b),
    "<p>C</p>",
  );
  assert.equal(
    render(() => api.useTranslation().t("TITLE"), a),
    "<p>A</p>",
  );
  api.setI18n(undefined);
});
test("missing-engine fallback preserves tuple identities and defaults", () => {
  api.setI18n(undefined);
  assert.equal(
    render(() => {
      const r = api.useTranslation();
      assert.equal(r[0], r.t);
      assert.equal(r[1], r.i18n);
      assert.equal(r.ready, false);
      return r.t(["first", "last"], { defaultValue: "Fallback" });
    }),
    "<p>Fallback</p>",
  );
});
test("SSR exposes plain text and React escapes translation markup", async () => {
  const x = await make("<img src=x onerror=alert(1)>");
  assert.equal(
    render(() => api.useTranslation().t("TITLE"), x),
    "<p>&lt;img src=x onerror=alert(1)&gt;</p>",
  );
});
test("prefix changes resolve only within the requested key path", async () => {
  const x = await make();
  assert.equal(
    render(
      () => api.useTranslation("main", { keyPrefix: "nested" }).t("TITLE"),
      x,
    ),
    "<p>Nested</p>",
  );
  assert.throws(
    () =>
      render(() => api.useTranslation("main", { keyPrefix: 42 }).t("TITLE"), x),
    /string key prefixes/,
  );
});
test("server renders never install instance or store listeners", async () => {
  const x = await make();
  x.on = () => {
    throw Error("SSR installed listener");
  };
  x.store.on = x.on;
  assert.equal(
    render(
      () =>
        api
          .useTranslation(undefined, { bindI18nStore: "added removed" })
          .t("TITLE"),
      x,
    ),
    "<p>Contest</p>",
  );
});
