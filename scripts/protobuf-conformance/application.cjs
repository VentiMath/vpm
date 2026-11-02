"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const { from, consumer } = require("./consumers.cjs");
const upstream = from("protobufjs"),
  vpm = require("../../packages/vprotobufjs");
const plain = (x) => JSON.parse(JSON.stringify(x));
const outputOptions = {
  longs: String,
  enums: String,
  bytes: String,
  oneofs: true,
};
let count = 0;
function check(source, input, label) {
  const a = source(upstream),
    b = source(vpm),
    ma = a.fromObject(input),
    mb = b.fromObject(input);
  const wa = a.encode(ma).finish(),
    wb = b.encode(mb).finish();
  assert.deepEqual(Buffer.from(wb), Buffer.from(wa), label + " bytes");
  assert.deepEqual(
    plain(b.toObject(b.decode(wa), outputOptions)),
    plain(a.toObject(a.decode(wa), outputOptions)),
    label + " decode/conversion",
  );
  assert.deepEqual(
    plain(b.toObject(b.create(), { ...outputOptions, defaults: true })),
    plain(a.toObject(a.create(), { ...outputOptions, defaults: true })),
    label + " defaults",
  );
  count++;
}
let seed = 12345;
const random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const scalarValues = {
  double: [-Infinity, Infinity, NaN, -0, 1.2],
  float: [-0, 1.25, 1e20],
  int32: [-2147483648, -1, 0, 2147483647],
  uint32: [0, 128, 4294967295],
  sint32: [-2147483648, -1, 0, 2147483647],
  fixed32: [0, 4294967295],
  sfixed32: [-2147483648, 2147483647],
  int64: [
    "-9223372036854775808",
    "-1",
    "0",
    "9007199254740993",
    "9223372036854775807",
  ],
  uint64: ["0", "9007199254740993", "18446744073709551615"],
  sint64: ["-9223372036854775808", "-1", "9007199254740993"],
  fixed64: ["18446744073709551615", "0"],
  sfixed64: ["-9223372036854775808", "9223372036854775807"],
  bool: [true, false],
  string: ["", "ascii", "é漢😀", "\0\uFEFF"],
  bytes: [Buffer.from([]), Buffer.from([0, 128, 255])],
};
for (const [type, values] of Object.entries(scalarValues))
  for (const value of values) {
    for (const repeated of [false, true]) {
      const schema = {
        nested: {
          Sample: {
            fields: {
              value: { type, id: 1, ...(repeated ? { rule: "repeated" } : {}) },
            },
          },
        },
      };
      check(
        (p) => p.Root.fromJSON(schema).lookupType("Sample"),
        { value: repeated ? [value, value] : value },
        type + (repeated ? " packed" : " scalar"),
      );
    }
  }
for (let i = 0; i < 100; i++) {
  const n = Math.floor(random() * 4294967296);
  check(
    (p) =>
      p
        .parse(
          'syntax="proto3";message T{uint32 n=1;sint32 signed=2;string text=3;repeated uint32 list=4;}',
        )
        .root.lookupType("T"),
    { n, signed: n | 0, text: "sample" + i, list: [n, n >>> 4, 0] },
    "seeded-" + i,
  );
}
const json = require(
  path.join(
    path.dirname(from.resolve("@google-cloud/firestore")),
    "../protos/v1.json",
  ),
);
const root = upstream.Root.fromJSON(json).resolveAll();
function sample(T, depth = 0) {
  const o = {},
    seenOneofs = new Set();
  if (depth > 3) return o;
  for (const f of T.fieldsArray) {
    f.resolve();
    if (f.partOf) {
      if (seenOneofs.has(f.partOf)) continue;
      seenOneofs.add(f.partOf);
    }
    let value;
    if (f.resolvedType instanceof upstream.Type)
      value = sample(f.resolvedType, depth + 1);
    else if (f.resolvedType instanceof upstream.Enum)
      value = Object.values(f.resolvedType.values).at(-1);
    else value = scalarValues[f.type]?.at(-1);
    if (value === undefined) continue;
    if (f.map) {
      const key =
        f.keyType === "string" ? "entry" : f.keyType === "bool" ? "true" : "1";
      value = { [key]: value };
    } else if (f.repeated) value = [value];
    o[f.name] = value;
  }
  return o;
}
const aRoot = upstream.Root.fromJSON(json),
  bRoot = vpm.Root.fromJSON(json);
function visit(n) {
  if (n instanceof upstream.Type)
    check(
      (p) => (p === upstream ? aRoot : bRoot).lookupType(n.fullName),
      sample(n),
      n.fullName,
    );
  for (const child of n.nestedArray || []) visit(child);
}
visit(root);
// Generated Firestore code uses the minimal API, independently of reflection.
for (const variant of ["upstream", "vpm"]) {
  const c = consumer(variant),
    file = path.join(
      path.dirname(from.resolve("@google-cloud/firestore")),
      "../protos/firestore_v1_proto_api.js",
    );
  const generated = c.load(file);
  const T = generated.google.firestore.v1.Document;
  const value = {
    name: "projects/p/databases/(default)/documents/x/y",
    fields: {
      precise: { integerValue: "9007199254740993" },
      bytes: { bytesValue: Buffer.from([0, 255]) },
    },
  };
  const b = T.encode(T.fromObject(value)).finish();
  const decoded = T.toObject(T.decode(b), outputOptions);
  if (variant === "upstream")
    globalThis.generatedControl = {
      bytes: Buffer.from(b),
      value: plain(decoded),
    };
  else {
    assert.deepEqual(Buffer.from(b), globalThis.generatedControl.bytes);
    assert.deepEqual(plain(decoded), globalThis.generatedControl.value);
  }
}
assert(
  !Object.keys(require.cache).some((f) =>
    f.includes("/packages/vprotobufjs/src/"),
  ),
  "public application runtime must not import retained src compatibility code",
);
console.log(
  `${count} paired scalar, seeded and Firestore-schema messages; generated Document and no retained runtime imports pass.`,
);
