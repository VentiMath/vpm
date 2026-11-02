"use strict";
// Original SDKs and original gRPC transport; only protobuf imports are swapped.
const assert = require("node:assert/strict");
const { consumer, from } = require("./consumers.cjs");
const { startServer, scenario } = require("../firestore-conformance/wire.cjs");
async function run(variant) {
  const server = await startServer({
    grpc: from("@grpc/grpc-js"),
    loader: from("@grpc/proto-loader"),
  });
  const selected = consumer(variant),
    F = selected.firestore(),
    db = new F.Firestore({
      projectId: "p",
      host: "127.0.0.1:" + server.port,
      ssl: false,
    });
  try {
    const results = await scenario(db, F);
    assert(selected.stats.protobufjs > 0);
    assert(selected.stats["protobufjs/minimal"] > 0);
    return { results, log: server.log };
  } finally {
    await db.terminate();
    server.close();
  }
}
(async () => {
  const stock = await run("upstream"),
    vpm = await run("vpm");
  assert.deepEqual(vpm, stock);
  console.log(
    `Protobuf replacement: ${Object.keys(vpm.results).length} real Firestore workflow results and ${vpm.log.length} decoded RPCs match, including transactions, bulk writes and Watch.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
