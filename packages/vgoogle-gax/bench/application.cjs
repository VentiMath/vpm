"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const original = path.resolve(
    __dirname,
    "../../../scripts/gax-conformance/node_modules/google-gax",
  ),
  root = path.resolve(__dirname, ".."),
  roots = new WeakMap(),
  directory = (lib) => roots.get(lib),
  cases = [];
const add = (name, make, validate, async = false) =>
  cases.push({
    name,
    make: (selected) => {
      const lib = require(selected);
      roots.set(lib, selected);
      return make(lib);
    },
    validate,
    async,
  });
add(
  "settings merge / retry and headers",
  (lib) => {
    const settings = new lib.CallSettings({
      timeout: 1000,
      retry: {
        retryCodes: [14],
        backoffSettings: {
          initialRetryDelayMillis: 100,
          totalTimeoutMillis: 1000,
        },
      },
      otherArgs: { headers: { base: "one" } },
    });
    return () =>
      settings.merge({ timeout: 200, otherArgs: { headers: { key: "two" } } });
  },
  (value) => assert.equal(value.timeout, 200),
);
add(
  "resource path / repeated render",
  (lib) => {
    const path = new lib.PathTemplate(
      "projects/{project}/databases/{database}/documents/{name=**}",
    );
    return () =>
      path.render({
        project: "fixture",
        database: "default",
        name: "items/one",
      });
  },
  (value) =>
    assert.equal(
      value,
      "projects/fixture/databases/default/documents/items/one",
    ),
);
add(
  "Firestore schema / cached gRPC descriptors",
  (lib) => {
    const schema = JSON.parse(
        fs.readFileSync(
          require("../../../scripts/gax-conformance/consumers.cjs")
            .firestoreSchema,
        ),
      ),
      client = new lib.GrpcClient({ auth: {} });
    lib.GrpcClient.clearProtoCache();
    client.loadProtoJSON(schema);
    return () => client.loadProtoJSON(schema);
  },
  (value) => assert(value.google.firestore.v1.Firestore),
);
const resources = [];
for (const streaming of [false, true])
  add(
    streaming
      ? "Firestore SDK / batch read stream"
      : "Firestore SDK / unary document",
    async (lib) => {
      const grpc = require("../../../scripts/gax-conformance/node_modules/@grpc/grpc-js"),
        loader = require("../../../scripts/gax-conformance/node_modules/@grpc/proto-loader");
      const {
          consumer,
          firestoreSchema,
        } = require("../../../scripts/gax-conformance/consumers.cjs"),
        {
          bind,
          collect,
        } = require("../../../scripts/grpc-conformance/consumers.cjs");
      const documentName =
          "projects/fixture/databases/(default)/documents/items/one",
        document = {
          name: documentName,
          fields: {
            text: { stringValue: "hello é漢" },
            count: { integerValue: "9007199254740993" },
          },
        };
      const server = new grpc.Server({ "grpc.enable_channelz": 0 });
      server.addService(
        loader.fromJSON(JSON.parse(fs.readFileSync(firestoreSchema)), {
          longs: String,
        })["google.firestore.v1.Firestore"],
        {
          getDocument: (call, done) => done(null, document),
          batchGetDocuments: (call) => {
            call.write({ found: document });
            call.end();
          },
        },
      );
      const port = await bind(server, grpc.ServerCredentials.createInsecure()),
        { FirestoreClient } = consumer(directory(lib)).generated();
      const sdk = new FirestoreClient(
        {
          servicePath: "127.0.0.1",
          port,
          sslCreds: lib.grpc.credentials.createInsecure(),
          projectId: "fixture",
          auth: {
            getUniverseDomain: async () => "googleapis.com",
            getProjectId: async () => "fixture",
          },
        },
        lib,
      );
      resources.push({ server, sdk });
      const call = streaming
        ? () =>
            collect(
              sdk.batchGetDocuments(
                {
                  database: "projects/fixture/databases/(default)",
                  documents: [documentName],
                },
                { timeout: 5000, retry: null },
              ),
            )
        : () =>
            sdk.getDocument(
              { name: documentName },
              { timeout: 5000, retry: null },
            );
      await call();
      return call;
    },
    (x) =>
      assert.equal(
        (streaming ? x[0].found : x[0]).fields.count.integerValue,
        "9007199254740993",
      ),
    true,
  );
const files = [
  "app-runtime",
  "build/src/jsonProtoCache.js",
  "package.json",
  "PROVENANCE.json",
  "bench/application.cjs",
  "../../scripts/gax-conformance/consumers.cjs",
  "../../scripts/gax-conformance/package-lock.json",
  "../../scripts/protobuf-conformance/package-lock.json",
  "../../scripts/gax-conformance/node_modules/google-gax/build",
];
const seen = new Set();
function dependencies(dir) {
  for (const name of Object.keys(
    require(path.join(dir, "package.json")).dependencies || {},
  )) {
    if (seen.has(name)) continue;
    seen.add(name);
    assert(name.startsWith("v"));
    const target = path.resolve(root, "..", name);
    for (const file of fs
      .readdirSync(target, { recursive: true })
      .filter(
        (f) =>
          !f.startsWith("test/") &&
          !f.startsWith("bench/") &&
          /\.(js|cjs|json)$/.test(f),
      ))
      files.push(path.relative(root, path.join(target, file)));
    dependencies(target);
  }
}
dependencies(root);
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: original,
    vpm: root,
    cases,
    files,
    validationOnly: process.argv.includes("--validate"),
    cleanup: async () => {
      for (const { server, sdk } of resources) {
        await sdk.close();
        server.forceShutdown();
      }
    },
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
