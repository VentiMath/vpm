"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  pb = require("..");
test("cached namespace lists follow additions, removals, reparenting and namespace replacement", () => {
  const root = new pb.Root(),
    left = new pb.Namespace("left"),
    right = new pb.Namespace("right");
  root.add(left).add(right);
  const first = new pb.Type("First").add(new pb.Field("n", 1, "int32"));
  left.add(first);
  assert.equal(left.First, first);
  const before = left.nestedArray;
  const second = new pb.Type("Second");
  left.add(second);
  assert.deepEqual(left.nestedArray, [first, second]);
  assert.deepEqual(before, [first]);
  assert.throws(() => left.add(new pb.Type("Second")), /duplicate/);
  right.add(first);
  assert.deepEqual(left.nestedArray, [second]);
  assert.deepEqual(right.nestedArray, [first]);
  assert.equal(root.lookupType("First"), first);
  right.remove(first);
  assert.deepEqual(right.nestedArray, []);
  assert.throws(() => root.lookupType("First"));
  const replacement = new pb.Type("left");
  root.add(replacement).resolveAll();
  assert.equal(root.get("left"), replacement);
  assert.equal(replacement.get("Second"), second);
  assert.deepEqual(left.nestedArray, []);
  assert.deepEqual(root.nestedArray, [right, replacement]);
  assert.deepEqual(Object.keys(root.toJSON().nested.left.nested), ["Second"]);
  second.add(new pb.Field("value", 1, "int32"));
  const encoded = second.encode({ value: 7 }).finish();
  replacement.setOption("test", true);
  assert.deepEqual(second.encode({ value: 7 }).finish(), encoded);
  replacement.add(new pb.Type("Third"));
  assert.deepEqual(
    replacement.nestedArray.map((x) => x.name),
    ["Second", "Third"],
  );
});
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

test("specialized Unicode strings match native UTF-8 through prefix boundaries and lone surrogates", () => {
  const strings = [
    "",
    "ascii",
    "\u007f",
    "\u0080",
    "\u07ff",
    "\u0800",
    "\uffff",
    "😀",
    "\ud800",
    "\udc00",
    "a\ud800b",
    "\ud800\ud800\udc00",
    "é".repeat(63),
    "é".repeat(64),
    "漢".repeat(127),
    "😀".repeat(65),
  ];
  for (let i = 0; i < 200; i++)
    strings.push(
      String.fromCodePoint((i * 7919) % 0x110000) +
        "a" +
        String.fromCodePoint((i * 1543) % 0x110000),
    );
  for (const text of strings) {
    const expected = Buffer.from(text, "utf8"),
      w = pb.Writer.create().string(text),
      r = pb.Reader.create(w.finish());
    assert.deepEqual(Buffer.from(r.bytes()), expected);
    const decoded = pb.Reader.create(w.finish()).stringVerify();
    assert.equal(decoded, expected.toString("utf8"));
  }
});
test("specialized mixed codecs and CSP fallback preserve defaults, exact integers and safe keys", () => {
  const schema =
    'syntax="proto3";message M{M child=1;map<string,string> names=2;repeated sint32 values=3;bytes data=4;int64 id=5;oneof selected{string text=6;int32 number=7;}}';
  const value = JSON.parse(
    '{"child":{"id":"9007199254740993"},"names":{"__proto__":"entry"},"values":[-1,0,2000],"data":"AP+A","id":"-9223372036854775808","text":"😀"}',
  );
  const T = pb.parse(schema).root.lookupType("M"),
    bytes = T.encode(T.fromObject(value)).finish(),
    options = { longs: String, bytes: String, defaults: true, oneofs: true };
  const expected = T.toObject(T.decode(bytes), options),
    F = globalThis.Function;
  const U = pb.parse(schema).root.lookupType("M");
  try {
    globalThis.Function = function () {
      throw new EvalError("CSP");
    };
    assert.deepEqual(
      Buffer.from(U.encode(U.fromObject(value)).finish()),
      Buffer.from(bytes),
    );
    assert.deepEqual(U.toObject(U.decode(bytes), options), expected);
  } finally {
    globalThis.Function = F;
  }
  for (const model of [T, U]) {
    const r = pb.Reader.create(Uint8Array.from([18, 3, 10, 1, 255]));
    assert.throws(() => model.decode(r));
    assert.equal(r.len, 5);
    assert.throws(
      () => model.ctor({ text: "no new" }),
      /requires new|class constructor|Class constructor/,
    );
  }
});
test("uint32 packed fast path restores bounds when the destination throws", () => {
  const reader = pb.Reader.create(Uint8Array.from([2, 1, 2, 8, 7]));
  const target = [];
  target.push = () => {
    throw Error("destination");
  };
  assert.throws(() => reader.uint32s(target), /destination/);
  assert.equal(reader.len, 5);
  assert.equal(reader.pos, 2);
});
test("writer results remain owned across later writes, nested delimiters and buffer growth", () => {
  const w = pb.Writer.create().uint32(8).uint32(7),
    first = w.finish();
  w.fork().string("漢".repeat(127)).fork().uint32(128).ldelim().ldelim();
  assert.deepEqual([...first], [8, 7]);
  const later = w.finish();
  const snapshot = Buffer.from(later);
  w.string("x".repeat(10000));
  assert.deepEqual(Buffer.from(later), snapshot);
  const T = pb
    .parse("message M{repeated string values=1;int32 count=2;}")
    .root.lookupType("M");
  T.encode({ count: 7 });
  T.add(new pb.Field("extra", 3, "string"));
  assert.equal(T.fromObject({ extra: "new" }).extra, "new");
  assert.equal(
    T.toObject(T.decode(T.encode({ extra: "new" }).finish())).extra,
    "new",
  );
});

test("short service names resolve inside packages with lexical precedence", () => {
  const root = pb.Root.fromJSON({
    nested: {
      a: {
        nested: {
          T: { fields: {} },
          deep: { nested: { Echo: { methods: {} } } },
        },
      },
      b: { nested: { T: { fields: {} }, Echo: { methods: {} } } },
    },
  });
  assert.equal(root.lookupService("Echo").fullName, ".a.deep.Echo");
  assert.equal(root.lookupService("a.Echo").fullName, ".a.deep.Echo");
  assert.equal(root.lookup("b").lookupService("Echo").fullName, ".b.Echo");
  assert.equal(root.lookup("b").lookupType("T").fullName, ".b.T");
  const path = ["", "a", "deep", "Echo"];
  assert.equal(root.lookup(path).fullName, ".a.deep.Echo");
  assert.deepEqual(path, ["", "a", "deep", "Echo"]);
  const shadow = pb.Root.fromJSON({
    nested: {
      Echo: { fields: {} },
      inner: { nested: { Echo: { methods: {} } } },
    },
  });
  assert.equal(shadow.lookup("Echo", [pb.Service]), null);
});

test("short Unicode preserves its ASCII prefix when the writer grows mid-string", () => {
  for (let offset = 100; offset < 140; offset++)
    for (const text of ["Aé", "\0\ufeff", "abcd😀"]) {
      const w = pb.Writer.create().raw(Buffer.alloc(offset, 7)).string(text),
        r = pb.Reader.create(w.finish());
      r.skip(offset);
      assert.deepEqual(Buffer.from(r.bytes()), Buffer.from(text));
    }
});

test("descriptor qualification is preserved while public lookup accepts short names", () => {
  require("../ext/descriptor");
  const root = pb.Root.fromJSON({
    nested: {
      a: {
        nested: { M: { fields: { stamp: { id: 1, type: ".b.Timestamp" } } } },
      },
      b: { nested: { Timestamp: { fields: {} } } },
    },
  });
  assert.equal(root.lookupType("Timestamp").fullName, ".b.Timestamp");
  assert.equal(
    root.lookupType("a.M").toDescriptor("proto3").field[0].typeName,
    "b.Timestamp",
  );
});

test("compiled byte containers preserve the interpreter omission of undefined entries", () => {
  const schema =
      "message M{repeated bytes chunks=1;map<string,bytes> entries=2;}",
    value = {
      chunks: [undefined, Buffer.from([7])],
      entries: { absent: undefined, present: Buffer.from([8]) },
    };
  const T = pb.parse(schema).root.lookupType("M");
  const actual = T.toObject(T.fromObject(value), { bytes: Array });
  assert.deepEqual(actual, { chunks: [[7]], entries: { present: [8] } });
  const U = pb.parse(schema).root.lookupType("M"),
    F = globalThis.Function;
  try {
    globalThis.Function = function () {
      throw new EvalError("CSP");
    };
    assert.deepEqual(U.toObject(U.fromObject(value), { bytes: Array }), actual);
  } finally {
    globalThis.Function = F;
  }
});

test("specialized implicit int64 presence uses the same word coercion as writing", () => {
  const T = pb
    .parse('syntax="proto3";message M{int64 value=1;}')
    .root.lookupType("M");
  for (const value of [
    { low: 2 ** 32, high: 0 },
    { low: NaN, high: 0 },
    { low: 0, high: 2 ** 32 },
  ])
    assert.equal(T.encode({ value }).finish().length, 0);
});
