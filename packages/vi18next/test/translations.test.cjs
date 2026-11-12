"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { createInstance } = require("..");
const make = async (resources, options = {}) => {
  const x = createInstance();
  await x.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: resources } },
    ...options,
  });
  return x;
};
test("resource writes preserve own prototype-looking keys without pollution", async () => {
  const x = await make(
    JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":"value","normal":"ok"}',
    ),
  );
  assert.equal(x.t("constructor"), "value");
  assert.equal(x.t("toString"), "toString");
  assert.equal(x.getResource("en", "translation", "__proto__.polluted"), true);
  x.addResource("__proto__", "constructor", "__proto__.x", "safe");
  assert.equal({}.x, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(
    x.getResource("__proto__", "constructor", "__proto__.x"),
    "safe",
  );
});
test("resource writes isolate input objects and reject cycles before changing the store", async () => {
  const x = await make({}),
    source = { a: { b: "original" } };
  x.addResourceBundle("en", "extra", source);
  source.a.b = "changed";
  assert.equal(x.t("a.b", { ns: "extra" }), "original");
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => x.addResourceBundle("en", "extra", cycle), TypeError);
  assert.equal(x.t("a.b", { ns: "extra" }), "original");
});
test("nesting cannot interpret variables as translation instructions", async () => {
  const x = await make({ hello: "Hello", nested: "$t(hello), {{name}}" });
  assert.equal(
    x.t("nested", {
      name: "$t(secret)",
      interpolation: { escapeValue: false },
    }),
    "Hello, $t(secret)",
  );
  assert.equal(
    x.t("nested", { name: "Ada", returnDetails: true }).res,
    "Hello, Ada",
  );
});
test("cyclic nesting fails with a bounded diagnostic", async () => {
  const x = await make({ a: "$t(b)", b: "$t(a)" });
  assert.throws(
    () => x.t("a"),
    (e) => e instanceof RangeError && e.message.includes("32"),
  );
});
test("exists consistently reports stored keys even when values use display fallbacks", async () => {
  const x = await make({ empty: "", nil: null });
  for (const options of [
    {},
    { ordinal: true, count: 3 },
    { context: "female", count: 1 },
  ]) {
    assert.equal(x.exists("empty", options), true);
    assert.equal(x.exists("nil", options), true);
    assert.equal(x.t("empty", options), "empty");
    assert.equal(x.t("nil", options), "nil");
  }
  assert.equal(x.exists("absent"), false);
});
test("fallback, context, Arabic plurals and fixed translators survive language changes", async () => {
  const x = await make(
    {
      name: "Name",
      count_other: "{{count}} items",
      count_female_one: "one woman",
    },
    {
      resources: {
        en: {
          translation: {
            name: "Name",
            count_other: "{{count}} items",
            count_female_one: "one woman",
          },
        },
        ar: { translation: { count_two: "اثنان", count_few: "قليل" } },
      },
    },
  );
  const fixed = x.getFixedT("en");
  await x.changeLanguage("ar");
  assert.equal(x.t("count", { count: 2 }), "اثنان");
  assert.equal(x.t("count", { count: 3 }), "قليل");
  assert.equal(x.t("name"), "Name");
  assert.equal(fixed("count", { count: 5 }), "5 items");
  assert.equal(x.t("count", { count: 1, context: "female" }), "one woman");
  assert.equal(x.dir(), "rtl");
});
test("instances do not share namespace arrays or translations", async () => {
  const a = await make({ x: "a" }),
    b = await make({ x: "b" });
  a.addResourceBundle("en", "extra", { x: "extra" });
  assert.equal(b.options.ns.includes("extra"), false);
  assert.equal(b.hasResourceBundle("en", "extra"), false);
  assert.equal(b.t("x"), "b");
});
test("event listeners can unsubscribe during delivery and plugins receive the actual instance", async () => {
  const x = createInstance(),
    events = [];
  x.use({
    type: "3rdParty",
    init(i) {
      assert.equal(i, x);
    },
  });
  const cb = (l) => {
    events.push(l);
    x.off("languageChanged", cb);
  };
  x.on("languageChanged", cb);
  await x.init({ lng: "en", resources: {} });
  await x.changeLanguage("es");
  assert.deepEqual(events, ["en"]);
  assert.throws(() => x.use({ type: "backend" }), TypeError);
});
test("interpolation escapes markup by default and never reads inherited data", async () => {
  const x = await make({ text: "{{value}} {{inherited}}" });
  const input = Object.create({ inherited: "hidden" });
  input.value = '<a href="x">';
  assert.equal(
    x.t("text", input),
    "&lt;a href=&quot;x&quot;&gt; {{inherited}}",
  );
});

test("clones inherit current language and either share or fork resource updates", async () => {
  const x = await make(
    { title: "Title" },
    {
      resources: {
        en: { translation: { title: "Title" } },
        es: { translation: { title: "Título" } },
      },
    },
  );
  await x.changeLanguage("es");
  const shared = x.cloneInstance(),
    fork = x.cloneInstance({ forkResourceStore: true });
  assert.equal(shared.language, "es");
  assert.equal(shared.t("title"), "Título");
  shared.addResource("es", "translation", "title", "Changed");
  assert.equal(x.t("title"), "Changed");
  assert.equal(fork.t("title"), "Título");
  let read;
  x.cloneInstance({}, (_, t) => {
    read = t("title");
  });
  assert.equal(read, "Changed");
});
