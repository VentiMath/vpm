"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { zodResolver } = require(process.env.VRESOLVERS_ZOD || "../zod.cjs");
const { toNestErrors, validateFieldsNatively } = require(
  process.env.VRESOLVERS_ROOT || "../index.cjs",
);
const z = require("../../../scripts/resolvers-conformance/node_modules/zod");
function freeze(x) {
  if (x && typeof x === "object") {
    Object.values(x).forEach(freeze);
    Object.freeze(x);
  }
  return x;
}
const options = { fields: {}, criteriaMode: "all" };
test("frozen union issues can be reused without mutation", async () => {
  const result = freeze(
    z
      .object({
        items: z.array(
          z.union([
            z.object({ name: z.string() }),
            z.object({ count: z.number() }),
          ]),
        ),
      })
      .safeParse({ items: [{}] }),
  );
  const schema = {
    safeParse: () => result,
    safeParseAsync: async () => result,
  };
  const resolver = zodResolver(schema),
    a = await resolver({}, null, options),
    b = await resolver({}, null, options);
  assert.deepEqual(a, b);
  assert.ok(a.errors.items[0].name);
  assert.ok(a.errors.items[0].count);
});
test("validator exceptions are not converted into validation failures", async () => {
  const failure = {
    issues: [{ path: ["name"], code: "custom", message: "not a parse result" }],
  };
  const schema = {
    safeParse() {
      throw failure;
    },
    async safeParseAsync() {
      throw failure;
    },
  };
  for (const mode of ["sync", "async"])
    await assert.rejects(
      zodResolver(schema, undefined, { mode })({}, null, options),
      (e) => e === failure,
    );
});
test("raw mode owns its top-level container and preserves input before transforms", async () => {
  const schema = z.object({ count: z.string().transform(Number) }),
    input = freeze({ count: "7", extra: "retain" });
  const raw = await zodResolver(schema, undefined, { raw: true })(
    input,
    null,
    options,
  );
  assert.deepEqual(raw.values, input);
  assert.notEqual(raw.values, input);
  assert.deepEqual((await zodResolver(schema)(input, null, options)).values, {
    count: 7,
  });
});
test("unsafe paths cannot write through prototypes or create enormous arrays", async () => {
  for (const path of [
    ["__proto__", "polluted"],
    ["constructor", "prototype", "polluted"],
    ["items", 100001, "name"],
  ]) {
    const result = {
      success: false,
      error: { issues: [{ path, code: "custom", message: "no" }] },
    };
    await assert.rejects(
      zodResolver({
        safeParse: () => result,
        safeParseAsync: async () => result,
      })({}, null, options),
      /unsafe/,
    );
  }
  assert.equal({}.polluted, undefined);
});
test("field-array root and child messages coexist in either issue order", () => {
  const entries = [
    ["items", { type: "min", message: "Two required" }],
    ["items.0.name", { type: "required", message: "Name required" }],
  ];
  for (const order of [entries, [...entries].reverse()]) {
    const result = toNestErrors(freeze(Object.fromEntries(order)), {
      fields: {},
      names: ["items.0.name"],
    });
    assert.equal(result.items.root.message, "Two required");
    assert.equal(result.items[0].name.message, "Name required");
  }
});
test("native validity sets and clears errors on all refs; input errors stay untouched", async () => {
  const calls = [],
    make = () => ({
      setCustomValidity: (x) => calls.push(x),
      reportValidity: () => calls.push("report"),
    }),
    a = make(),
    b = make();
  const fields = { "user.name": { ref: a, refs: [a, b] } },
    opts = { fields, shouldUseNativeValidation: true };
  const errors = freeze({
    "user.name": { type: "required", message: "Missing" },
  });
  assert.equal(toNestErrors(errors, opts).user.name.ref, a);
  assert.equal(errors["user.name"].ref, undefined);
  assert.deepEqual(calls, ["Missing", "report", "Missing", "report"]);
  calls.length = 0;
  await zodResolver(z.object({ name: z.string() }))(
    { name: "Ada" },
    null,
    opts,
  );
  assert.deepEqual(calls, ["", "report", "", "report"]);
  validateFieldsNatively({}, { fields: { other: { ref: {} } } });
});
test("repeated custom codes, including prototype names, are own data", async () => {
  const issues = ["first", "second"].map((message) => ({
    path: ["name"],
    code: "__proto__",
    message,
  }));
  const result = { success: false, error: { issues } },
    schema = { safeParse: () => result, safeParseAsync: async () => result };
  const error = (await zodResolver(schema)({}, null, options)).errors.name;
  assert.deepEqual(error.types.__proto__, ["first", "second"]);
  assert.equal(Object.getPrototypeOf(error.types), Object.prototype);
});
test("mode/options fail early; async refinement still rejects in sync mode", async () => {
  assert.throws(() => zodResolver({}), /Zod schema/);
  const schema = z.object({ name: z.string().refine(async () => true) });
  assert.throws(
    () => zodResolver(schema, undefined, { mode: "later" }),
    /mode/,
  );
  assert.throws(() => zodResolver(schema, undefined, { raw: 1 }), /raw/);
  await assert.rejects(
    zodResolver(schema, undefined, { mode: "sync" })(
      { name: "Ada" },
      null,
      options,
    ),
  );
  assert.deepEqual(
    (await zodResolver(schema)({ name: "Ada" }, null, options)).errors,
    {},
  );
});
