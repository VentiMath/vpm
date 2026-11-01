"use strict";
const assert = require("node:assert/strict"),
  http = require("node:http"),
  { once } = require("node:events"),
  { finished } = require("node:stream/promises");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const seen = [],
    startedRequests = [],
    serverErrors = [];
  const server = http.createServer(async (req, res) => {
    startedRequests.push(req.url);
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      seen.push({
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks),
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "uploaded" }));
    } catch (error) {
      if (error.code !== "ECONNRESET") serverErrors.push(error);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = "http://127.0.0.1:" + server.address().port;
  try {
    for (const [API, vpm] of [
      [require("./node_modules/@google-cloud/storage"), false],
      [require("../../packages/vgoogle-cloud-storage"), true],
    ]) {
      const storage = new API.Storage({
        projectId: "fixture",
        apiEndpoint: endpoint,
        useAuthWithCustomEndpoint: true,
        retryOptions: { autoRetry: false },
      });
      storage.authClient.authorizeRequest = async (request) => ({
        ...request,
        headers: { ...request.headers, authorization: "Bearer fixture" },
      });
      const file = storage.bucket("fixture").file("binary #1.pdf");
      file.setEncryptionKey(Buffer.alloc(32, 1));
      file.interceptors.push({
        request: (request) => ({
          ...request,
          headers: { ...request.headers, "x-fixture": "preserved" },
        }),
      });
      await file.save(Buffer.from([0, 255, 13, 10]), {
        resumable: false,
        validation: false,
        contentType: "application/pdf",
        preconditionOpts: { ifGenerationMatch: 0 },
        userProject: "billing",
      });
      const record = seen.at(-1),
        url = new URL(record.url, endpoint);
      assert.equal(record.headers.authorization, "Bearer fixture");
      assert.equal(record.headers["x-fixture"], "preserved");
      assert.equal(record.headers["x-goog-encryption-algorithm"], "AES256");
      assert.equal(url.searchParams.get("ifGenerationMatch"), "0");
      assert.equal(url.searchParams.get("userProject"), "billing");
      assert.ok(record.body.includes(Buffer.from([0, 255, 13, 10])));
      let release, started;
      const gate = new Promise((resolve) => (release = resolve)),
        entered = new Promise((resolve) => (started = resolve));
      let signal;
      storage.authClient.authorizeRequest = async (request) => {
        signal = request.signal;
        started();
        await gate;
        return request;
      };
      const uploading = storage.bucket("fixture").file("cancelled");
      uploading.metadata = { name: "before" };
      const stream = uploading.createWriteStream({
        resumable: false,
        validation: false,
        contentType: "text/plain",
      });
      const result = finished(stream).catch((e) => e);
      stream.end("cancel payload");
      await entered;
      const before = startedRequests.length;
      stream.destroy(new Error("cancel"));
      await result;
      release();
      await pause(100);
      if (vpm) {
        assert.equal(signal.aborted, true);
        assert.equal(
          startedRequests.length,
          before,
          "cancelled upload must not reach HTTP after auth resolves",
        );
        assert.equal(uploading.metadata.name, "before");
      } else {
        for (let i = 0; startedRequests.length === before && i < 100; i++)
          await pause(10);
        assert.equal(startedRequests.length, before + 1);
        assert.equal(signal, undefined);
        console.log(
          "Original after cancellation: " +
            (startedRequests.length - before) +
            " late HTTP request(s), metadata " +
            uploading.metadata.name,
        );
      }
    }
    assert.deepEqual(serverErrors, []);
    console.log(
      "Multipart HTTP: auth, encryption, interceptors, preconditions, binary payload and cancellation across auth pass.",
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    require("../../packages/vteeny-request").teenyRequest.close();
    const { pool } = require("./node_modules/teeny-request/build/src/agents");
    for (const agent of pool.values()) agent.destroy();
    pool.clear();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
