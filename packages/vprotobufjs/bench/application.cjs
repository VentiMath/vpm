"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const {
  consumer,
  schema,
  input,
  from,
} = require("../../../scripts/protobuf-conformance/consumers.cjs");
const root = path.resolve(__dirname, ".."),
  upstream = path.dirname(from.resolve("protobufjs"));
const smallHex = "082a10011a046974656d";
const loaderHex =
  "0881808080808080101209c3a9e6bca2f09f98801a0300ff802205010002a01f2a0c0a036b6579120576616c7565320b08e0a694d70610959aef3a";
const docHex =
  "0a2c70726f6a656374732f702f6461746162617365732f2864656661756c74292f646f63756d656e74732f612f6212120a05636f756e74120910818080808080801012110a057469746c6512088a010568656c6c6f";
const docObject = {
  name: "projects/p/databases/(default)/documents/a/b",
  fields: {
    count: { integerValue: "9007199254740993" },
    title: { stringValue: "hello" },
  },
};
const cases = [];
for (const op of ["encode", "decode"])
  cases.push({
    name: "small reflected message / " + op,
    make: (file) => {
      const p = require(file),
        T = p
          .parse(
            'syntax="proto3";message T{int32 count=1;bool active=2;string name=3;}',
          )
          .root.lookupType("T"),
        value = T.fromObject({ count: 42, active: true, name: "item" }),
        wire = Buffer.from(smallHex, "hex");
      return op === "encode"
        ? () => T.encode(value).finish()
        : () => T.decode(wire);
    },
    validate: (x) =>
      op === "encode"
        ? assert.equal(Buffer.from(x).toString("hex"), smallHex)
        : assert.deepEqual(JSON.parse(JSON.stringify(x)), {
            count: 42,
            active: true,
            name: "item",
          }),
  });
cases.push({
  name: "packed uint32 reader",
  make: (file) => {
    const p = require(file),
      bytes = Uint8Array.from([5, 1, 2, 3, 128, 1]);
    return () => p.Reader.create(bytes).uint32s();
  },
  validate: (x) => assert.deepEqual(x, [1, 2, 3, 128]),
});
for (const op of ["serialize", "deserialize"])
  cases.push({
    name: "real proto-loader / " + op,
    make: (file) => {
      const c = consumer(file === upstream ? "upstream" : "vpm"),
        method = c
          .protoLoader()
          .fromJSON(schema, { longs: String, bytes: Buffer })[
          "fixture.Catalog"
        ].Get,
        wire = Buffer.from(loaderHex, "hex");
      return op === "serialize"
        ? () => method.requestSerialize(input)
        : () => method.requestDeserialize(wire);
    },
    validate: (x) =>
      op === "serialize"
        ? assert.equal(Buffer.from(x).toString("hex"), loaderHex)
        : assert.deepEqual(x, input),
  });
for (const op of ["encode", "decode"])
  cases.push({
    name: "generated Firestore Document / " + op,
    make: (file) => {
      const c = consumer(file === upstream ? "upstream" : "vpm"),
        api = c.load(
          path.join(
            path.dirname(from.resolve("@google-cloud/firestore")),
            "../protos/firestore_v1_proto_api.js",
          ),
        ),
        T = api.google.firestore.v1.Document,
        value = T.fromObject(docObject),
        wire = Buffer.from(docHex, "hex");
      return op === "encode"
        ? () => T.encode(value).finish()
        : () => T.decode(wire);
    },
    validate: (x) =>
      op === "encode"
        ? assert.equal(Buffer.from(x).toString("hex"), docHex)
        : (assert.equal(x.name, docObject.name),
          assert.equal(
            x.fields.count.integerValue.toString(),
            "9007199254740993",
          ),
          assert.equal(x.fields.title.stringValue, "hello")),
  });
const harness = require("../../../scripts/bench-process.cjs");
const options = {
  root,
  upstream,
  vpm: root,
  files: [
    "package.json",
    "index.js",
    "minimal.js",
    "light.js",
    "runtime",
    "ext/descriptor.js",
    "../vlong/index.js",
    "bench/application.cjs",
    "../../scripts/protobuf-conformance/consumers.cjs",
    "../../scripts/protobuf-conformance/package-lock.json",
    "../../scripts/protobuf-conformance/node_modules/protobufjs/src",
    path.relative(root, from.resolve("@grpc/proto-loader")),
    path.relative(
      root,
      path.join(
        path.dirname(from.resolve("@google-cloud/firestore")),
        "../protos/firestore_v1_proto_api.js",
      ),
    ),
  ],
  validationOnly: process.env.QUICK === "1",
};
(async () => {
  if (process.env.VPM_BENCH_WORKER) {
    const i = Number(process.env.VPM_CASE);
    await harness.run({ ...options, cases: [cases[i]] });
    return;
  }
  const dir =
    process.env.RESULT_DIR || path.join(__dirname, "application-results");
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < cases.length; i++) {
    process.env.VPM_CASE = String(i);
    process.env.OUTPUT = path.join(
      dir,
      `${process.versions.bun ? "bun" : "node"}-${i}.json`,
    );
    await harness.run({ ...options, cases: [cases[i]] });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
