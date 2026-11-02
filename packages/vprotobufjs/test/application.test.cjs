"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  pb = require("..");
test("implicit presence preserves negative zero and explicit optional presence", () => {
  const T = pb
    .parse(
      'syntax="proto3";message M{double zero=1;int32 absent=2;optional int32 present=3;}',
    )
    .root.lookupType("M");
  const m = T.decode(
    T.encode(T.fromObject({ zero: -0, absent: 0, present: 0 })).finish(),
  );
  assert(Object.is(m.zero, -0));
  assert(!Object.hasOwn(m, "absent"));
  assert(Object.hasOwn(m, "present"));
});
test("proto3 UTF8 is verified for scalar strings and map keys", () => {
  const T = pb
    .parse(
      'syntax="proto3";message M{string text=1;map<string,int32> labels=2;}',
    )
    .root.lookupType("M");
  for (const bytes of [
    [10, 1, 255],
    [18, 3, 10, 1, 255],
  ])
    assert.throws(() => T.decode(Uint8Array.from(bytes)));
  const old = pb
    .parse('syntax="proto2";message M{optional string text=1;}')
    .root.lookupType("M");
  assert.equal(old.decode(Uint8Array.from([10, 1, 255])).text, "\uFFFD");
});
test("closed enums are filtered in every container and retained as unknown wire data", () => {
  const T = pb
    .parse(
      'syntax="proto2";enum E{ZERO=0;ONE=1;}message M{optional E value=1;repeated E values=2 [packed=true];map<string,E> map=3;}',
    )
    .root.lookupType("M");
  assert.deepEqual(
    T.toObject(T.fromObject({ value: 9, values: [9, 1], map: { key: 9 } })),
    { values: [1] },
  );
  const r = pb.Reader.create(Uint8Array.from([8, 9, 18, 2, 9, 1]));
  r.discardUnknown = false;
  const m = T.decode(r);
  assert.deepEqual(T.toObject(m), { values: [1] });
  assert.equal(m.$unknowns.length, 2);
  const round = T.decode(pb.Reader.create(T.encode(m).finish()));
  assert.deepEqual(T.toObject(round), { values: [1] });
});
test("boolean readers consider every varint bit, and failures retain bounds", () => {
  assert.equal(
    pb.Reader.create(Uint8Array.from([128, 128, 128, 128, 16])).bool(),
    true,
  );
  const T = pb
    .parse("message M{repeated int32 values=1 [packed=true];}")
    .root.lookupType("M");
  const r = pb.Reader.create(Uint8Array.from([10, 1, 128, 8, 1]));
  assert.throws(() => T.decode(r));
  assert.equal(r.len, 5);
});
test("nested messages merge without discarding earlier fields or bypassing recursion limits", () => {
  const T = pb
    .parse('syntax="proto3";message M{M child=1;int32 a=2;int32 b=3;}')
    .root.lookupType("M");
  assert.deepEqual(
    T.toObject(T.decode(Uint8Array.from([10, 2, 16, 1, 10, 2, 24, 2]))),
    { child: { a: 1, b: 2 } },
  );
  const cyclic = {};
  cyclic.child = cyclic;
  assert.throws(() => T.fromObject(cyclic), /max depth/);
});
test("schema and decoded map prototype names remain own data", () => {
  const T = pb.Root.fromJSON({
    nested: {
      M: {
        fields: JSON.parse(
          '{"__proto__":{"id":1,"type":"string"},"map":{"id":2,"keyType":"string","type":"string"}}',
        ),
      },
    },
  }).lookupType("M");
  const input = JSON.parse('{"__proto__":"data","map":{"__proto__":"entry"}}'),
    value = T.toObject(T.decode(T.encode(T.fromObject(input)).finish()));
  assert.deepEqual(value, input);
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.equal(Object.getPrototypeOf(value.map), Object.prototype);
});
test("all public runtime entries and descriptor use the independent implementation", () => {
  for (const entry of ["../light", "../minimal"])
    assert.equal(require(entry).Reader, pb.Reader);
  assert(require("../ext/descriptor").FileDescriptorSet instanceof pb.Type);
  assert(
    !Object.keys(require.cache).some((file) =>
      file.includes("/vprotobufjs/src/"),
    ),
  );
});

test("scalar specialization safely quotes names and invalidates on schema changes", () => {
  const names = ["__proto__", 'quote";throw Error(1);//'];
  const T = new pb.Type("Odd");
  names.forEach((name, i) => T.add(new pb.Field(name, i + 1, "string")));
  const input = Object.fromEntries(names.map((name) => [name, "value"]));
  assert.deepEqual(
    T.toObject(T.decode(T.encode(T.fromObject(input)).finish())),
    input,
  );
  const added = new pb.Field("extra", 3, "int32");
  T.add(added);
  assert.equal(T.decode(T.encode({ extra: 7 }).finish()).extra, 7);
  T.remove(added);
  assert.deepEqual(T.toObject(T.decode(Uint8Array.from([24, 7]))), {});
  assert.throws(() => {
    pb.types.basic["string;throw Error(1)"] = 0;
  }, TypeError);
});
test("scalar specialization has a checked fallback when dynamic functions are unavailable", () => {
  const Original = globalThis.Function;
  const T = pb
    .parse('syntax="proto3";message M{string text=1;int32 count=2;}')
    .root.lookupType("M");
  try {
    globalThis.Function = function () {
      throw new EvalError("CSP");
    };
    const bytes = T.encode({ text: "hello", count: 7 }).finish();
    assert.deepEqual(T.toObject(T.decode(bytes)), { text: "hello", count: 7 });
    assert.throws(() => T.decode(Uint8Array.from([10, 1, 255])));
  } finally {
    globalThis.Function = Original;
  }
});
