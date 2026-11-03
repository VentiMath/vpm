"use strict";
const assert = require("node:assert/strict"),
  http = require("node:http"),
  path = require("node:path");
async function run(original) {
  const api = original
      ? require("google-gax/fallback")
      : require("../../packages/vgoogle-gax/app-runtime/fallback.cjs"),
    authLib = original
      ? require("google-auth-library")
      : require("../../packages/vgoogle-auth-library"),
    auth = new authLib.GoogleAuth({
      authClient: new authLib.PassThroughClient(),
      projectId: "fixture",
    });
  const server = http.createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const mode = JSON.parse(text || "{}").content;
    res.setHeader("content-type", "application/json");
    if (mode === "empty") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (mode === "html") {
      res.writeHead(404);
      res.end("<h1>missing</h1>");
      return;
    }
    if (mode === "error") {
      res.writeHead(503);
      res.end(
        JSON.stringify({
          error: { message: "unavailable", code: 503, status: "UNAVAILABLE" },
        }),
      );
      return;
    }
    if (mode === "slow") {
      res.write('{"content":');
      const timer = setTimeout(() => res.end('"late"}'), 1000);
      res.once("close", () => clearTimeout(timer));
      return;
    }
    if (req.url.includes(":expand")) {
      res.write('[{"content":"first"}');
      const timer = setTimeout(() => res.end(',{"content":"last"}]'), 1000);
      res.once("close", () => clearTimeout(timer));
      return;
    }
    res.end(JSON.stringify({ content: "é漢" }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const client = new api.GrpcClient({ auth }),
    root = client.loadProtoJSON(require("./upstream/test/fixtures/echo.json")),
    stub = await client.createStub(root.lookupService("Echo"), {
      servicePath: "127.0.0.1",
      port: server.address().port,
      protocol: "http",
    });
  const unary = (content, timeout = 1000) => {
    let operation;
    const promise = new Promise((resolve, reject) => {
      operation = stub.echo(
        { content },
        {},
        { deadline: new Date(Date.now() + timeout) },
        (e, v) => (e ? reject(e) : resolve(v)),
      );
    });
    promise.cancel = () => operation.cancel();
    return promise;
  };
  try {
    assert.equal((await unary("ok")).content, "é漢");
    assert.equal((await unary("empty")).content, "");
    await assert.rejects(
      unary("html"),
      (e) => e.code === 5 && e.httpStatusCode === 404,
    );
    await assert.rejects(
      unary("error"),
      (e) => e.code === 14 && e.httpStatusCode === 503,
    );
    const cancelled = unary("slow");
    setTimeout(() => cancelled.cancel(), 20);
    await assert.rejects(cancelled, (e) => e.code === 1);
    await assert.rejects(unary("slow", 20), (e) => e.code === 4);
    const stream = stub.expand(
      { content: "stream" },
      {},
      { deadline: new Date(Date.now() + 1000) },
    );
    let errors = 0;
    stream.on("error", () => errors++);
    await new Promise((resolve, reject) => {
      stream.once("error", reject);
      stream.once("data", (value) => {
        assert.equal(value.content, "first");
        stream.cancel();
        resolve();
      });
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(errors, 0);
    console.log(
      (original ? "Original" : "Independent") +
        " REST: UTF-8, 204, HTTP errors, cancellation, body deadline and quiet stream cancellation pass.",
    );
  } finally {
    stub.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
(async () => {
  await run(true);
  await run(false);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
