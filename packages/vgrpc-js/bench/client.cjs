"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  http2 = require("node:http2"),
  assert = require("node:assert/strict");
const harness = require("../../../scripts/bench-process.cjs");
const root = path.resolve(__dirname, "..");
const resources = [];
const scenarios = [
  { name: "warm unary 128B", bytes: 128, count: 1 },
  { name: "warm unary 16KiB", bytes: 16384, count: 1 },
  { name: "server stream 32 x 128B", bytes: 128, count: 32 },
];
const cases = scenarios.map(({ name, bytes, count }) => ({
  name,
  async: true,
  async make(file) {
    const grpc = require(file),
      payload = Buffer.alloc(bytes, 42);
    const frame = Buffer.alloc(bytes + 5, 42);
    frame[0] = 0;
    frame.writeUInt32BE(bytes, 1);
    const response = Buffer.concat(Array(count).fill(frame));
    const sessions = new Set(),
      server = http2.createServer();
    server.on("session", (session) => {
      sessions.add(session);
      session.on("error", () => {});
      session.on("close", () => sessions.delete(session));
    });
    server.on("stream", (stream) => {
      stream.on("error", () => {});
      stream.on("data", () => {});
      stream.on("end", () => {
        stream.respond(
          { ":status": 200, "content-type": "application/grpc" },
          { waitForTrailers: true },
        );
        stream.on("wantTrailers", () =>
          stream.sendTrailers({ "grpc-status": "0" }),
        );
        stream.end(response);
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const client = new grpc.Client(
      "127.0.0.1:" + server.address().port,
      grpc.credentials.createInsecure(),
    );
    resources.push(async () => {
      client.close();
      for (const session of sessions) session.destroy();
      await new Promise((resolve) => server.close(resolve));
    });
    const identity = (value) => value;
    if (count === 1)
      return () =>
        new Promise((resolve, reject) =>
          client.makeUnaryRequest(
            "/bench.Service/Echo",
            identity,
            identity,
            payload,
            (error, value) => (error ? reject(error) : resolve(value.length)),
          ),
        );
    return () =>
      new Promise((resolve, reject) => {
        let size = 0;
        client
          .makeServerStreamRequest(
            "/bench.Service/Stream",
            identity,
            identity,
            payload,
          )
          .on("data", (value) => (size += value.length))
          .on("error", reject)
          .on("end", () => resolve(size));
      });
  },
  validate: (size) => assert.equal(size, bytes * count),
}));
const options = {
  root,
  upstream: path.resolve(
    root,
    "../../scripts/grpc-conformance/node_modules/@grpc/grpc-js",
  ),
  vpm: root,
  files: [
    "client-runtime",
    "index.js",
    "package.json",
    "build/src/metadata.js",
    "build/src/call-credentials.js",
    "build/src/stream-decoder.js",
    "bench/client.cjs",
    "../../scripts/grpc-conformance/package-lock.json",
    "../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src",
  ],
  cleanup: async () => {
    for (const close of resources.splice(0)) await close();
  },
};
(async () => {
  if (process.env.VPM_BENCH_WORKER) {
    const i = Number(process.env.VPM_CASE);
    assert.ok(Number.isInteger(i) && cases[i]);
    await harness.run({ ...options, cases: [cases[i]] });
    return;
  }
  const dir = process.env.RESULT_DIR || path.join(__dirname, "client-results");
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < cases.length; i++) {
    process.env.VPM_CASE = String(i);
    process.env.OUTPUT = path.join(
      dir,
      `${process.versions.bun ? "bun" : "node"}-${i}.json`,
    );
    await harness.run({ ...options, cases: [cases[i]] });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
