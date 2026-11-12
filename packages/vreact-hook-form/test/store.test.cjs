"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { createFormControl, get, set } = require(
  process.env.VFORM_STORE || "../store.cjs",
);
const defer = () => {
  let resolve;
  return { promise: new Promise((r) => (resolve = r)), resolve };
};
test("nested defaults, returned values and edits have independent ownership", () => {
  const defaults = {
    person: { name: "A" },
    list: [{ n: 1 }],
    date: new Date(0),
  };
  const f = createFormControl({ defaultValues: defaults });
  f.register("person.name");
  f.setValue("person.name", "B", { shouldDirty: true, shouldTouch: true });
  assert.equal(defaults.person.name, "A");
  f.getValues().list[0].n = 9;
  assert.equal(f.getValues("list.0.n"), 1);
  assert.equal(f.formState.dirtyFields.person.name, true);
  f.setValue("person.name", "A", { shouldDirty: true });
  assert.equal(f.formState.isDirty, false);
});
test("unsafe paths and value keys reject without prototype mutation", () => {
  const f = createFormControl();
  for (const name of [
    "__proto__.x",
    "constructor.prototype.x",
    "a.__proto__.b",
    "a[999999999]",
  ])
    assert.throws(() => f.setValue(name, 1), /unsafe/);
  assert.throws(
    () =>
      createFormControl({ defaultValues: JSON.parse('{"__proto__":{"x":1}}') }),
    /unsafe/,
  );
  assert.equal({}.x, undefined);
  assert.equal(get({}, "toString"), undefined);
});
test("built-in validation and async submission preserve state and rejection", async () => {
  const f = createFormControl({ defaultValues: { name: "" } });
  f.register("name", {
    required: "required",
    minLength: { value: 2, message: "short" },
  });
  let called = 0;
  await f.handleSubmit(() => called++)();
  assert.equal(called, 0);
  assert.equal(f.formState.errors.name.message, "required");
  f.setValue("name", "ok");
  const d = defer();
  const submit = f.handleSubmit(async () => {
    called++;
    await d.promise;
    throw Error("save");
  })();
  await new Promise(setImmediate);
  assert.equal(f.formState.isSubmitting, true);
  d.resolve();
  await assert.rejects(submit, /save/);
  assert.equal(f.formState.isSubmitting, false);
  assert.equal(f.formState.isSubmitSuccessful, false);
  assert.equal(f.formState.submitCount, 2);
});
test("latest validation owns errors and reset invalidates pending results", async () => {
  const waits = [];
  const f = createFormControl({
    defaultValues: { name: "old" },
    resolver: async (v) => {
      const d = defer();
      waits.push({ v, d });
      await d.promise;
      return {
        values: v,
        errors:
          v.name === "old" ? { name: { type: "invalid", message: "old" } } : {},
      };
    },
  });
  f.register("name");
  const old = f.trigger("name");
  f.setValue("name", "new");
  const newer = f.trigger("name");
  waits[1].d.resolve();
  await newer;
  waits[0].d.resolve();
  await new Promise(setImmediate);
  waits[2].d.resolve();
  await old;
  assert.deepEqual(f.formState.errors, {});
  const pending = f.trigger();
  f.reset({ name: "reset" });
  waits.at(-1).d.resolve();
  assert.equal(await pending, false);
  assert.deepEqual(f.getValues(), { name: "reset" });
  assert.equal(f.formState.isValidating, false);
});
test("trigger selects WARML step errors while resolver checks the full form", async () => {
  const f = createFormControl({
    defaultValues: { name: "", consent: false },
    resolver: (v) => ({
      values: v,
      errors: {
        ...(!v.name ? { name: { type: "required" } } : {}),
        ...(!v.consent ? { consent: { type: "required" } } : {}),
      },
    }),
  });
  f.register("name");
  f.register("consent");
  assert.equal(await f.trigger(["name"]), false);
  assert.deepEqual(Object.keys(f.formState.errors), ["name"]);
  f.setValue("name", "John");
  assert.equal(await f.trigger(["name"]), true);
  assert.deepEqual(f.formState.errors, {});
  assert.equal(f.formState.isValid, false);
});
test("reset keeps requested dirty values and clears other state", () => {
  const f = createFormControl({ defaultValues: { name: "a", other: 1 } });
  f.register("name");
  f.register("other");
  f.setValue("name", "b", { shouldDirty: true });
  f.reset({ name: "c", other: 2 }, { keepDirtyValues: true });
  assert.deepEqual(f.getValues(), { name: "b", other: 2 });
  assert.equal(f.formState.dirtyFields.name, true);
  f.reset();
  assert.deepEqual(f.getValues(), { name: "c", other: 2 });
  assert.equal(f.formState.isDirty, false);
});
test("subscriber removal is safe during dispatch and watch has stable owned snapshots", () => {
  const f = createFormControl({ defaultValues: { x: 0 } }),
    seen = [];
  let off;
  f.subscribe({ callback: () => off() });
  off = f.subscribe({ callback: () => seen.push("stale") });
  const a = f.watch();
  assert.equal(f.watch(), a);
  f.setValue("x", 1);
  assert.deepEqual(seen, []);
  assert.notEqual(f.watch(), a);
  assert.equal(a.x, 0);
});
test("disabled fields omit submission values and first invalid native input receives focus", async () => {
  let focused = 0;
  const f = createFormControl({ defaultValues: { name: "", secret: "old" } });
  f.register("name", { required: true }).ref({
    value: "",
    focus() {
      focused++;
    },
  });
  f.register("secret", { disabled: true });
  await f.handleSubmit(() => assert.fail())();
  assert.equal(focused, 1);
  f.setValue("name", "ok");
  await f.handleSubmit((v) => assert.equal(v.secret, undefined))();
});
test("native registration handlers retain identity and same-value reset is quiet", () => {
  const f = createFormControl({ defaultValues: { name: "A" } });
  assert.equal(f.register("name").ref, f.register("name").ref);
  let changes = 0;
  f.subscribe({ callback: () => changes++ });
  f.reset({ name: "A" });
  assert.equal(changes, 0);
});
test("unregister on native unmount is deferred across callback-ref handoff", async () => {
  const f = createFormControl({
    defaultValues: { name: "A" },
    shouldUnregister: true,
  });
  const a = f.register("name");
  a.ref({ value: "A" });
  a.ref(null);
  a.ref({ value: "A" });
  await Promise.resolve();
  assert.equal(f.getValues("name"), "A");
  a.ref(null);
  await Promise.resolve();
  assert.equal(f.getValues("name"), undefined);
});

test("removing array items and object keys remains dirty; host objects use identity", () => {
  const f = createFormControl({
    defaultValues: { tasks: ["one"], event: { title: "A", color: "red" } },
  });
  f.setValue("tasks", [], { shouldDirty: true });
  assert.equal(f.formState.isDirty, true);
  assert.ok(f.formState.dirtyFields.tasks);
  f.setValue("event", { title: "A" }, { shouldDirty: true });
  assert.equal(f.formState.dirtyFields.event.color, true);
  class Host {}
  const first = new Host();
  const h = createFormControl({ defaultValues: { host: first } });
  h.setValue("host", new Host(), { shouldDirty: true });
  assert.equal(h.formState.dirtyFields.host, true);
});
