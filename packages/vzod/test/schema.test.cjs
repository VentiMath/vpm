"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  z = require(process.env.VZOD_ENTRY || "..");
test('lazy getters resolve once and optimized object reads retain getter/transform semantics',()=>{
  let resolutions=0,reads=0,transforms=0;
  const schema=z.lazy(()=>{resolutions++;return z.object({name:z.string().min(1),count:z.string().transform(v=>{transforms++;return Number(v);})});});
  const input={get name(){reads++;return 'Ada';},count:'3'};
  assert.deepEqual(schema.parse(input),{name:'Ada',count:3});
  assert.deepEqual(schema.parse(input),{name:'Ada',count:3});
  assert.equal(resolutions,1);assert.equal(reads,2);assert.equal(transforms,2);
});
test('tagged union fast path retains all branch issues when the selected branch aborts',()=>{
  const schema=z.union([z.object({type:z.literal('text'),text:z.string()}),z.object({type:z.literal('count'),count:z.number()})]);
  const r=schema.safeParse({type:'count',count:'wrong'});
  assert.equal(r.success,false);assert.equal(r.error.issues[0].code,'invalid_union');
  assert.deepEqual(r.error.issues[0].errors.map(branch=>branch.map(i=>i.path)),[[['type'],['text']],[['count']]]);
});
test("recursive documents reject cycles without rejecting shared subtrees", () => {
  const tree = z.lazy(() =>
    z.object({ text: z.string(), children: z.array(tree).optional() }),
  );
  const shared = { text: "child" },
    input = { text: "root", children: [shared, shared] },
    out = tree.parse(input);
  assert.deepEqual(out, input);
  assert.notEqual(out, input);
  assert.notEqual(out.children[0], shared);
  assert.notEqual(out.children[0], out.children[1]);
  input.children.push(input);
  const r = tree.safeParse(input);
  assert.equal(r.success, false);
  assert.match(r.error.issues[0].message, /Cyclic/);
});
test("prototype-looking record keys are own data, inherited fields are not accepted", () => {
  const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":2}'),
    parsed = z.record(z.unknown()).parse(input);
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.hasOwn(parsed, "__proto__"), true);
  assert.deepEqual(parsed.__proto__, { polluted: true });
  assert.equal({}.polluted, undefined);
  assert.equal(
    z
      .object({ name: z.string() })
      .safeParse(Object.create({ name: "Inherited" })).success,
    false,
  );
});
test("schema construction and output do not mutate frozen input or defaults", () => {
  const shape = { name: z.string() },
    schema = z.object(shape),
    a = z.array(z.string()).default(["a"]);
  shape.name = z.number();
  const original = Object.freeze({ name: "Ada", extra: "strip" });
  assert.deepEqual(schema.parse(original), { name: "Ada" });
  const x = a.parse(undefined);
  x.push("changed");
  assert.deepEqual(a.parse(undefined), ["a"]);
});
test("refinements run after continuable errors, but not invalid field types", () => {
  let calls = 0;
  const schema = z.object({ n: z.string().min(2) }).superRefine((v, c) => {
    calls++;
    c.addIssue({ code: "custom", path: ["n"], message: "Cross-field" });
  });
  assert.equal(schema.safeParse({ n: "" }).error.issues.length, 2);
  assert.equal(calls, 1);
  assert.equal(schema.safeParse({ n: 3 }).error.issues.length, 1);
  assert.equal(calls, 1);
});
test("async parsing retains paths and sync parsing rejects asynchronous callbacks", async () => {
  const schema = z.object({
    rows: z.array(
      z.object({
        text: z.string().refine(async (s) => s === "yes", "Use yes"),
      }),
    ),
  });
  assert.throws(() => schema.parse({ rows: [{ text: "no" }] }), /parseAsync/);
  const r = await schema.safeParseAsync({ rows: [{ text: "no" }] });
  assert.deepEqual(r.error.issues[0].path, ["rows", 0, "text"]);
  assert.deepEqual(await schema.parseAsync({ rows: [{ text: "yes" }] }), {
    rows: [{ text: "yes" }],
  });
});
test("user callback exceptions propagate unchanged; transforms wait for validation", async () => {
  const error = new Error("callback");
  const broken = z.string().refine(() => {
    throw error;
  });
  assert.throws(
    () => broken.safeParse("a"),
    (e) => e === error,
  );
  await assert.rejects(broken.safeParseAsync("a"), (e) => e === error);
  let calls = 0;
  const s = z
    .string()
    .min(2)
    .transform((v) => {
      calls++;
      return v.length;
    });
  assert.equal(s.safeParse("").success, false);
  assert.equal(calls, 0);
  assert.equal(s.parse("ab"), 2);
});
test("global/sticky regex state is isolated from the caller and between parses", () => {
  const re = /^[a-z]+$/g;
  re.lastIndex = 2;
  const schema = z.string().regex(re);
  for (let i = 0; i < 4; i++) assert.equal(schema.parse("abc"), "abc");
  assert.equal(re.lastIndex, 2);
});
test("errors support safe flattening/formatting and schema/per-parse messages", () => {
  const schema = z.object({
    name: z
      .string({
        error: (i) => (i.input === undefined ? "Required" : undefined),
      })
      .min(2, "Too short"),
  });
  const r = schema.safeParse({});
  assert.equal(r.error.issues[0].message, "Required");
  assert.deepEqual(r.error.flatten(), {
    formErrors: [],
    fieldErrors: { name: ["Required"] },
  });
  assert.deepEqual(r.error.format(), {
    _errors: [],
    name: { _errors: ["Required"] },
  });
  assert.ok(r.error instanceof Error);
  assert.ok(r.error instanceof z.ZodError);
  assert.equal(JSON.parse(r.error.message)[0].message, "Required");
  assert.equal(
    z.string().safeParse(3, { error: () => "Per parse" }).error.issues[0]
      .message,
    "Per parse",
  );
  const err = new z.ZodError([
    { code: "custom", path: ["__proto__", "name"], message: "Data" },
  ]);
  assert.equal(err.format().__proto__.name._errors[0], "Data");
  assert.equal({}.name, undefined);
});
test("legacy shorthand and required messages remain usable while defaults use Zod 4 behavior", () => {
  assert.deepEqual(z.record(z.number()).parse({ a: 1 }), { a: 1 });
  assert.equal(
    z.enum(["a", "b"], { required_error: "Choose" }).safeParse(undefined).error
      .issues[0].message,
    "Choose",
  );
  assert.deepEqual(
    z.object({ items: z.array(z.string()).default([]).optional() }).parse({}),
    { items: [] },
  );
  assert.equal(z.string().max(1).parse("😀"), "😀");
});
test("deep untrusted input terminates with a validation error", () => {
  const schema = z.lazy(() => z.object({ child: schema.optional() }));
  let value = {};
  for (let i = 0; i < 300; i++) value = { child: value };
  assert.equal(schema.safeParse(value).success, false);
});
