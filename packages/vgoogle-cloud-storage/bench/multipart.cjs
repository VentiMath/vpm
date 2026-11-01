"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { spawn } = require("node:child_process"),
  { once } = require("node:events"),
  readline = require("node:readline");
const root = path.resolve(__dirname, "..");
const roots = {
  upstream: path.resolve(
    root,
    "../../scripts/storage-conformance/node_modules/@google-cloud/storage",
  ),
  vpm: root,
};
const body = Buffer.alloc(64 * 1024, 97),
  crc32c = "TpXtPw==";
let selectedRoot, server;
const library = (directory) => {
  selectedRoot = directory;
  return require(directory);
};
const { Writable } = require("node:stream");
const cases = [
  {
    name: "multipart plan / metadata and progress stream",
    make: (directory) => {
      const { EventEmitter } = require("node:events");
      const { Storage } = library(directory),
        file = new Storage({
          projectId: "fixture",
          retryOptions: { autoRetry: false },
        })
          .bucket("fixture")
          .file("fixture.pdf");
      let request;
      file.request = (options) => (request = options);
      return () => {
        const destination = new EventEmitter();
        destination.on("error", () => {});
        destination.setWritable = (stream) => (destination.input = stream);
        destination.destroy = () => {
          destination.destroyed = true;
          destination.input?.destroy();
          destination.emit("close");
        };
        file.startSimpleUpload_(destination, {
          metadata: {
            contentType: "application/pdf",
            metadata: { purpose: "fixture" },
          },
        });
        const result = request.multipart[0].body;
        destination.destroy();
        return result;
      };
    },
    validate: (value) =>
      assert.equal(JSON.parse(value).contentType, "application/pdf"),
  },
  ...[65536].map((size) => ({
    name: "HTTP multipart upload / " + size + " bytes + CRC32C",
    async: true,
    make: (directory) => {
      const { Storage } = library(directory),
        file = new Storage({
          projectId: "fixture",
          apiEndpoint: process.env.VPM_STORAGE_BENCH_ORIGIN,
          useAuthWithCustomEndpoint: false,
          retryOptions: { autoRetry: false },
        })
          .bucket("fixture")
          .file("fixture.pdf");
      const payload = Buffer.alloc(size, 97);
      return async () => {
        await file.save(payload, { resumable: false });
        return file.metadata;
      };
    },
    validate: (value) => assert.equal(value.name, "fixture.pdf"),
  })),
];
const envNames = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "GOOGLE_SDK_NODE_LOGGING",
  "STORAGE_EMULATOR_HOST",
];
const saved = Object.fromEntries(
  envNames.map((name) => [name, process.env[name]]),
);
for (const name of envNames) delete process.env[name];
// Keep warning I/O outside timing for both upload pipelines.
require("node:events").defaultMaxListeners = 32;
async function cleanup() {
  if (selectedRoot === roots.vpm)
    require("vteeny-request").teenyRequest.close();
  else if (selectedRoot) {
    const {
      pool,
    } = require("../../../scripts/storage-conformance/node_modules/teeny-request/build/src/agents");
    for (const agent of pool.values()) agent.destroy();
    pool.clear();
  }
  if (server) {
    const ended = once(server, "exit");
    server.stdin.end();
    await ended;
  }
  for (const name of envNames)
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
}
(async () => {
  if (!process.env.VPM_BENCH_WORKER) {
    server = spawn("node", [path.join(__dirname, "http-server.cjs")], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    const lines = readline.createInterface({ input: server.stdout });
    const [line] = await once(lines, "line");
    lines.close();
    const address = JSON.parse(line);
    assert.equal(address.node.split(".")[0], "24");
    process.env.VPM_STORAGE_BENCH_ORIGIN = "http://127.0.0.1:" + address.port;
  }
  const files = [
    "bench/multipart.cjs",
    "bench/http-server.cjs",
    "../../scripts/storage-conformance/package-lock.json",
    "../../scripts/storage-conformance/node_modules/@google-cloud/storage/package.json",
    "../../scripts/storage-conformance/node_modules/@google-cloud/storage/build/cjs/src",
  ];
  const seen = new Set();
  function sources(name) {
    if (seen.has(name)) return;
    seen.add(name);
    const directory = path.resolve(root, "..", name),
      manifest = require(path.join(directory, "package.json"));
    for (const file of fs.readdirSync(directory, { recursive: true }))
      if (
        !/^(?:test|bench|node_modules)\//.test(file) &&
        (/\.(?:js|cjs|mjs)$/.test(file) || file === "package.json")
      )
        files.push(path.relative(root, path.join(directory, file)));
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
    }))
      sources(dependency);
  }
  sources("vgoogle-cloud-storage");
  await require("../../../scripts/bench-process.cjs").run({
    root,
    upstream: roots.upstream,
    vpm: roots.vpm,
    cases,
    files,
    cleanup,
    validationOnly: process.argv.includes("--validate"),
  });
})().catch(async (error) => {
  console.error(error);
  if (server && !server.killed) server.kill();
  process.exitCode = 1;
});
