"use strict";
// Keep stock Firestore and replace only GAX. Compare decoded requests, SDK
// results and Watch reconnect tokens with the pinned original.
const assert = require("node:assert/strict");
const { consumer } = require("./consumers.cjs");
const { startServer, scenario } = require("../firestore-conformance/wire.cjs");
const original = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");

async function run(directory) {
  const server = await startServer({ grpc: original, loader });
  const sdk = consumer(directory);
  const F = sdk.firestore();
  const db = new F.Firestore({
    projectId: "p",
    host: "127.0.0.1:" + server.port,
    ssl: false,
  });
  try {
    const results = await scenario(db, F);
    assert.ok(
      sdk.stats.gaxImports > 0,
      "Firestore used the selected GAX module",
    );
    return { results, log: server.log };
  } finally {
    await db.terminate();
    server.close();
  }
}

async function main() {
  const upstream = await run(
    require("node:path").join(__dirname, "node_modules/google-gax"),
  );
  const vpm = await run(
    require("node:path").resolve(__dirname, "../../packages/vgoogle-gax"),
  );
  assert.deepEqual(vpm.results, upstream.results, "Firestore results");
  assert.deepEqual(
    vpm.log,
    upstream.log,
    "Decoded requests and routing metadata",
  );
  await watchReconnect(
    require("node:path").join(__dirname, "node_modules/google-gax"),
  );
  await watchReconnect(
    require("node:path").resolve(__dirname, "../../packages/vgoogle-gax"),
  );
  console.log(
    `Independent GAX: ${Object.keys(vpm.results).length} Firestore results and ${vpm.log.length} requests match upstream, including transactions, queries, bulk writes and Watch.`,
  );
}
async function watchReconnect(directory) {
  let attempts = 0,
    resolveResumed,
    rejectResumed,
    unsubscribe;
  const resumed = new Promise((resolve, reject) => {
    resolveResumed = resolve;
    rejectResumed = reject;
  });
  const timer = setTimeout(
    () => rejectResumed(Error("Watch did not resume")),
    10000,
  );
  const server = await startServer({
    grpc: original,
    loader,
    onListen(call, request) {
      if (++attempts === 1)
        setTimeout(
          () =>
            call.emit(
              "error",
              Object.assign(Error("local disconnect"), { code: 14 }),
            ),
          20,
        );
      else {
        try {
          assert.deepEqual(request.addTarget.resumeToken, Buffer.from("r1"));
          resolveResumed();
        } catch (error) {
          rejectResumed(error);
        }
      }
    },
  });
  const F = consumer(directory).firestore();
  const db = new F.Firestore({
    projectId: "p",
    host: "127.0.0.1:" + server.port,
    ssl: false,
  });
  try {
    await db.collection("users").doc("watch").set({ name: "Watch", score: 1 });
    unsubscribe = db.collection("users").onSnapshot((snapshot) => {
      try {
        assert.deepEqual(
          snapshot.docs.map((doc) => doc.id),
          ["watch"],
        );
      } catch (error) {
        rejectResumed(error);
      }
    }, rejectResumed);
    await resumed;
  } finally {
    clearTimeout(timer);
    unsubscribe?.();
    await db.terminate();
    server.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
