"use strict";
const { test: baseTest } = require("node:test"),
  assert = require("node:assert/strict"),
  http2 = require("node:http2"),
  zlib = require("node:zlib"),
  fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync, spawn } = require("node:child_process");
const test = (name, fn) => baseTest(name, { timeout: 10000 }, fn);
const original = process.env.GRPC_UPSTREAM === "1",
  grpc = original
    ? require("@grpc/grpc-js")
    : require("../../packages/vgrpc-js");
const wireGrpc = require("@grpc/grpc-js");
const method = {
  path: "/fixture.Service/Echo",
  requestStream: false,
  responseStream: false,
  requestSerialize: (x) => Buffer.from(JSON.stringify(x)),
  requestDeserialize: (b) => JSON.parse(b),
  responseSerialize: (x) => Buffer.from(JSON.stringify(x)),
  responseDeserialize: (b) => JSON.parse(b),
};
const Client = grpc.makeGenericClientConstructor(
  {
    echo: method,
    watch: { ...method, path: "/fixture.Service/Watch", responseStream: true },
    chat: {
      ...method,
      path: "/fixture.Service/Chat",
      requestStream: true,
      responseStream: true,
    },
  },
  "Fixture",
);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = (value, encoding = "identity") => {
  let b = Buffer.from(JSON.stringify(value));
  if (encoding === "gzip") b = zlib.gzipSync(b);
  if (encoding === "deflate") b = zlib.deflateSync(b);
  const h = Buffer.alloc(5);
  h[0] = encoding === "identity" ? 0 : 1;
  h.writeUInt32BE(b.length, 1);
  return Buffer.concat([h, b]);
};
async function withServer(handler, action, options = {}) {
  const server = http2.createServer(),
    sessions = new Set();
  server.on("session", (s) => {
    sessions.add(s);
    s.on("error", () => {});
    s.on("close", () => sessions.delete(s));
  });
  server.on("stream", (s, h) => {
    s.on("error", () => {});
    s.on("data", () => {});
    handler(s, h);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const client = new Client(
    "127.0.0.1:" + server.address().port,
    grpc.credentials.createInsecure(),
    options,
  );
  try {
    return await action(client, server);
  } finally {
    client.close();
    for (const s of sessions) s.destroy();
    await new Promise((r) => server.close(r));
  }
}
function respond(stream, value, extra = {}, code = 0, details = "") {
  stream.respond(
    { ":status": 200, "content-type": "application/grpc", ...extra },
    { waitForTrailers: true },
  );
  stream.on("wantTrailers", () =>
    stream.sendTrailers({
      "grpc-status": String(code),
      "grpc-message": encodeURIComponent(details),
      "x-tail": "done",
    }),
  );
  stream.end(value === undefined ? undefined : frame(value));
}
function unary(
  client,
  value = { hello: "world" },
  metadata = new grpc.Metadata(),
  options = {},
) {
  return new Promise((resolve) => {
    const events = [];
    const call = client.echo(
      value,
      metadata,
      { deadline: Date.now() + 3000, ...options },
      (error, result) => resolve({ error, result, events, call }),
    );
    call.on("metadata", (m) => events.push(["metadata", m]));
    call.on("status", (s) => events.push(["status", s]));
  });
}
function collect(stream) {
  return new Promise((resolve, reject) => {
    const values = [];
    stream.on("data", (x) => values.push(x));
    stream.on("error", reject);
    stream.on("end", () => resolve(values));
  });
}
function policy(extra = {}) {
  return {
    "grpc.initial_reconnect_backoff_ms": 10,
    "grpc.service_config": JSON.stringify({
      methodConfig: [
        {
          name: [{ service: "fixture.Service" }],
          retryPolicy: {
            maxAttempts: 3,
            initialBackoff: "0.001s",
            maxBackoff: "0.01s",
            backoffMultiplier: 2,
            retryableStatusCodes: ["UNAVAILABLE"],
          },
        },
      ],
    }),
    ...extra,
  };
}

test("public application client import does not load retained transport", () => {
  if (original) return;
  const script = `const p=${JSON.stringify(path.resolve(__dirname, "../../packages/vgrpc-js"))};require(p);import(p+'/index.mjs').then(()=>{for(const f of Object.keys(require.cache))if(f.startsWith(p+'/build/src/')&&/(?:internal-channel|resolving-call|retrying-call|load-balancing-call|subchannel|resolver-dns|channel-credentials|client|server)\\.js$/.test(f))throw Error('retained transport loaded: '+f)});`;
  const r = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test("unary response, binary metadata, trailers and one status", () =>
  withServer(
    (s) =>
      respond(
        s,
        { ok: true },
        {
          "x-hello": "world",
          "x-bin": Buffer.from("binary").toString("base64"),
        },
      ),
    async (c) => {
      const r = await unary(c);
      await delay(0);
      assert.ifError(r.error);
      assert.deepEqual(r.result, { ok: true });
      assert.equal(r.events[0][0], "metadata");
      assert.deepEqual(r.events[0][1].get("x-bin"), [Buffer.from("binary")]);
      assert.equal(r.events.filter((x) => x[0] === "status").length, 1);
      assert.equal(r.events.at(-1)[1].metadata.get("x-tail")[0], "done");
    },
  ));
test("trailers-only errors preserve status, Unicode details and metadata", () =>
  withServer(
    (s) =>
      s.respond(
        {
          ":status": 200,
          "content-type": "application/grpc",
          "grpc-status": "7",
          "grpc-message": encodeURIComponent("denied é 漢"),
          "x-tail": "bad",
        },
        { endStream: true },
      ),
    async (c) => {
      const r = await unary(c);
      assert.equal(r.error.code, 7);
      assert.equal(r.error.details, "denied é 漢");
      assert.equal(r.error.metadata.get("x-tail")[0], "bad");
    },
  ));
for (const encoding of ["gzip", "deflate"])
  test(encoding + " response decompression", () =>
    withServer(
      (s) => {
        s.respond(
          {
            ":status": 200,
            "content-type": "application/grpc",
            "grpc-encoding": encoding,
          },
          { waitForTrailers: true },
        );
        s.on("wantTrailers", () => s.sendTrailers({ "grpc-status": "0" }));
        s.end(frame({ text: "x".repeat(2000) }, encoding));
      },
      async (c) => {
        const r = await unary(c);
        assert.ifError(r.error);
        assert.equal(r.result.text.length, 2000);
      },
    ),
  );
test("outbound gzip is a complete independently compressed message", () =>
  withServer(
    (s, h) => {
      const chunks = [];
      s.on("data", (c) => chunks.push(c));
      s.on("end", () => {
        assert.equal(h["grpc-encoding"], "gzip");
        const b = Buffer.concat(chunks);
        assert.equal(b[0], 1);
        assert.deepEqual(JSON.parse(zlib.gunzipSync(b.subarray(5))), {
          hello: "world",
        });
        respond(s, { ok: true });
      });
    },
    async (c) => assert.ifError((await unary(c)).error),
    { "grpc.default_compression_algorithm": 2 },
  ));
test("deadline elapsed before dispatch sends no request", () => {
  let calls = 0;
  return withServer(
    (s) => {
      calls++;
      respond(s, {});
    },
    async (c) => {
      const r = await unary(c, {}, undefined, { deadline: Date.now() - 1 });
      assert.equal(r.error.code, 4);
      assert.equal(calls, 0);
    },
  );
});
test("active deadline cancels exactly once", () =>
  withServer(
    (s) => {},
    async (c) => {
      const r = await unary(c, {}, undefined, { deadline: Date.now() + 30 });
      await delay(20);
      assert.equal(r.error.code, 4);
      assert.equal(r.events.filter((e) => e[0] === "status").length, 1);
    },
  ));
test("cancel before credentials settle never sends a request", async () => {
  let done,
    calls = 0;
  await withServer(
    (s) => {
      calls++;
      respond(s, {});
    },
    async (c) => {
      const pending = new Promise((resolve) => {
        const call = c.echo(
          {},
          new grpc.Metadata(),
          {
            deadline: Date.now() + 1000,
            credentials: grpc.credentials.createFromMetadataGenerator(
              (o, cb) => (done = cb),
            ),
          },
          (error) => resolve(error),
        );
        setImmediate(() => call.cancel());
      });
      const error = await pending;
      assert.equal(error.code, 1);
      done?.(null, new grpc.Metadata());
      await delay(20);
      assert.equal(calls, 0);
    },
  );
});
test("channel shutdown drains active calls and prevents new requests", () =>
  withServer(
    (s) => {},
    async (c) => {
      const first = unary(c, {}, undefined, { deadline: Date.now() + 60 });
      await delay(10);
      c.close();
      assert.equal((await first).error.code, 4);
      await assert.rejects(unary(c), /shut down/);
      assert.equal(c.getChannel().getConnectivityState(false), 4);
    },
  ));
test("waitForReady and connectivity notification", () =>
  withServer(
    (s) => respond(s, {}),
    async (c) => {
      await new Promise((resolve, reject) =>
        c.waitForReady(Date.now() + 2000, (e) => (e ? reject(e) : resolve())),
      );
      assert.equal(c.getChannel().getConnectivityState(false), 2);
      const changed = new Promise((resolve) =>
        c.getChannel().watchConnectivityState(2, Date.now() + 1000, resolve),
      );
      c.close();
      assert.equal(await changed, undefined);
    },
  ));
test("missing trailers cannot report success", () =>
  withServer(
    (s) => {
      s.respond({ ":status": 200, "content-type": "application/grpc" });
      s.end(frame({ ok: true }));
    },
    async (c) => assert.notEqual((await unary(c)).error.code, 0),
  ));
test("truncated successful response is rejected", () =>
  withServer(
    (s) => {
      s.respond(
        { ":status": 200, "content-type": "application/grpc" },
        { waitForTrailers: true },
      );
      s.on("wantTrailers", () => s.sendTrailers({ "grpc-status": "0" }));
      s.end(frame({ ok: true }).subarray(0, 7));
    },
    async (c) => assert.ok((await unary(c)).error),
  ));
for (const count of [0, 2])
  test("unary rejects " + count + " messages", () =>
    withServer(
      (s) => {
        s.respond(
          { ":status": 200, "content-type": "application/grpc" },
          { waitForTrailers: true },
        );
        s.on("wantTrailers", () => s.sendTrailers({ "grpc-status": "0" }));
        s.end(Buffer.concat(Array.from({ length: count }, () => frame({}))));
      },
      async (c) =>
        assert.equal(
          (await unary(c, {}, undefined, { deadline: Date.now() + 100 })).error
            .code,
          original && count === 2 ? 4 : 12,
        ),
    ),
  );
for (const [status, code] of [
  [401, 16],
  [403, 7],
  [404, 12],
  [503, 14],
])
  test("HTTP " + status + " maps to gRPC " + code, () =>
    withServer(
      (s) => {
        s.respond({ ":status": status });
        s.end("upstream unavailable");
      },
      async (c) => assert.equal((await unary(c)).error.code, code),
    ),
  );
test("receive message limit rejects before accepting response", () =>
  withServer(
    (s) => respond(s, { text: "x".repeat(200) }),
    async (c) => assert.equal((await unary(c)).error.code, 8),
    { "grpc.max_receive_message_length": 100 },
  ));
test("decompressed message limit is enforced", () =>
  withServer(
    (s) => {
      s.respond(
        {
          ":status": 200,
          "content-type": "application/grpc",
          "grpc-encoding": "gzip",
        },
        { waitForTrailers: true },
      );
      s.on("wantTrailers", () => s.sendTrailers({ "grpc-status": "0" }));
      s.end(frame({ text: "x".repeat(100000) }, "gzip"));
    },
    async (c) => assert.equal((await unary(c)).error.code, 8),
    { "grpc.max_receive_message_length": 1000 },
  ));
test("send limit rejects without writing oversized request", () =>
  withServer(
    (s) => respond(s, {}),
    async (c) =>
      assert.equal((await unary(c, { text: "x".repeat(200) })).error.code, 8),
    { "grpc.max_send_message_length": 100 },
  ));
test("configured retry replays only uncommitted request and sends attempt count", async () => {
  const attempts = [];
  await withServer(
    (s, h) => {
      attempts.push(h["grpc-previous-rpc-attempts"] || "0");
      if (attempts.length === 1)
        s.respond(
          {
            ":status": 200,
            "content-type": "application/grpc",
            "grpc-status": "14",
          },
          { endStream: true },
        );
      else respond(s, { ok: true });
    },
    async (c) => {
      const r = await unary(c);
      assert.ifError(r.error);
      assert.deepEqual(attempts, ["0", "1"]);
    },
    policy(),
  );
});
test("response headers commit a call and disable configured retry", async () => {
  let calls = 0;
  await withServer(
    (s) => {
      calls++;
      respond(s, undefined, {}, 14, "failed");
    },
    async (c) => {
      assert.equal((await unary(c)).error.code, 14);
      assert.equal(calls, 1);
    },
    policy(),
  );
});
test("retry buffer limit prevents replay of large request", async () => {
  let calls = 0;
  await withServer(
    (s) => {
      calls++;
      s.respond(
        {
          ":status": 200,
          "content-type": "application/grpc",
          "grpc-status": "14",
        },
        { endStream: true },
      );
    },
    async (c) => {
      assert.equal((await unary(c)).error.code, 14);
      assert.equal(calls, 1);
    },
    policy({ "grpc.per_rpc_retry_buffer_size": 4 }),
  );
});
test("negative server pushback disables retry", async () => {
  let calls = 0;
  await withServer(
    (s) => {
      calls++;
      s.respond(
        {
          ":status": 200,
          "content-type": "application/grpc",
          "grpc-status": "14",
          "grpc-retry-pushback-ms": "-1",
        },
        { endStream: true },
      );
    },
    async (c) => {
      assert.equal((await unary(c)).error.code, 14);
      assert.equal(calls, 1);
    },
    policy(),
  );
});
async function resetPeer(mode, action) {
  // A Node peer ensures Bun's HTTP/2 server cannot erase the reset code under test.
  const child = spawn("node", [path.join(__dirname, "reset-peer.cjs"), mode], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const port = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.stdout.once("data", (b) => resolve(Number(b.toString())));
  });
  const c = new Client("127.0.0.1:" + port, grpc.credentials.createInsecure());
  try {
    await action(c);
  } finally {
    c.close();
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
}
test("REFUSED_STREAM transparently retries an unprocessed call", () =>
  resetPeer("refuse", async (c) => {
    const r = await unary(c);
    assert.ifError(r.error);
    assert.equal(r.result.attempts, 2);
  }));
test("connection loss after received response headers is not replayed", async () => {
  let calls = 0;
  await withServer(
    (s) => {
      calls++;
      s.respond({ ":status": 200, "content-type": "application/grpc" });
      setTimeout(() => s.session?.destroy(), 10);
    },
    async (c) => {
      const code = (await unary(c)).error.code;
      if (original) assert.ok([13, 14].includes(code));
      else assert.equal(code, 14);
      assert.equal(calls, 1);
    },
    policy(),
  );
});
test("GOAWAY drains old session and next call reconnects", () =>
  withServer(
    (s) => {
      respond(s, { ok: true });
      const session = s.session;
      s.on("close", () => {
        if (!session.destroyed) session.goaway();
      });
    },
    async (c) => {
      assert.ifError((await unary(c)).error);
      await delay(20);
      assert.ifError((await unary(c)).error);
    },
  ));
test("streaming responses and backpressure preserve order", () =>
  withServer(
    (s) => {
      s.respond(
        { ":status": 200, "content-type": "application/grpc" },
        { waitForTrailers: true },
      );
      s.on("wantTrailers", () => s.sendTrailers({ "grpc-status": "0" }));
      s.end(Buffer.concat(Array.from({ length: 500 }, (_, i) => frame({ i }))));
    },
    async (c) => {
      const stream = c.watch({}, { deadline: Date.now() + 3000 });
      stream.pause();
      await delay(15);
      const pending = collect(stream);
      stream.resume();
      const values = await pending;
      assert.deepEqual(
        values.map((v) => v.i),
        Array.from({ length: 500 }, (_, i) => i),
      );
    },
  ));
test("serializer and deserializer failures report INTERNAL", async () => {
  await withServer(
    (s) => respond(s, {}),
    async (c) => {
      const error = await new Promise((resolve) =>
        c.makeUnaryRequest(
          "/fixture.Service/Echo",
          () => {
            throw Error("encode");
          },
          JSON.parse,
          {},
          resolve,
        ),
      );
      assert.equal(error.code, 13);
    },
  );
  await withServer(
    (s) => respond(s, {}),
    async (c) => {
      const error = await new Promise((resolve) =>
        c.makeUnaryRequest(
          "/fixture.Service/Echo",
          () => Buffer.from("{}"),
          () => {
            throw Error("decode");
          },
          {},
          resolve,
        ),
      );
      assert.equal(error.code, 13);
    },
  );
});
test("credential composition keeps all generators and merge ordering", async () => {
  const make = (name, ms) =>
    grpc.credentials.createFromMetadataGenerator((o, cb) =>
      setTimeout(() => {
        const m = new grpc.Metadata();
        m.add("x-order", name);
        cb(null, m);
      }, ms),
    );
  const value = await grpc.credentials
    .combineCallCredentials(make("a", 10), make("b", 1), make("c", 2))
    .generateMetadata({ service_url: "https://fixture", method_name: "Echo" });
  assert.deepEqual(value.get("x-order"), ["a", "b", "c"]);
});
test("credential equality does not equate a prefix with a longer plan", () => {
  const a = grpc.credentials.createFromMetadataGenerator((o, cb) =>
    cb(null, new grpc.Metadata()),
  );
  assert.equal(a.compose(a)._equals(a.compose(a).compose(a)), original);
});
test("Google Auth Headers preserve authorization", async () => {
  const {
    OAuth2Client,
  } = require("../protobuf-conformance/node_modules/google-auth-library");
  const auth = new OAuth2Client();
  auth.setCredentials({
    access_token: "local-fixture-token",
    expiry_date: Date.now() + 3600000,
  });
  const m = await grpc.credentials
    .createFromGoogleCredential(auth)
    .generateMetadata({
      service_url: "https://fixture.test/service",
      method_name: "Echo",
    });
  assert.deepEqual(
    m.get("authorization"),
    original ? [] : ["Bearer local-fixture-token"],
  );
});
test("authentication errors cannot be overridden by accompanying metadata", async () => {
  const expected = Error("credential failure"),
    cred = grpc.credentials.createFromMetadataGenerator((o, cb) =>
      cb(expected, new grpc.Metadata()),
    );
  if (original) assert.ok(await cred.generateMetadata({}));
  else
    await assert.rejects(
      cred.generateMetadata({}),
      (error) => error === expected,
    );
});
console.log(
  original
    ? "Original public client control"
    : "Independent public application client",
);

test("peer stream cancellation remains CANCELLED on a live connection", () =>
  resetPeer("cancel", async (c) =>
    assert.equal((await unary(c)).error.code, 1),
  ));
test("waiting for readiness stops at the deadline", async () => {
  const c = new Client("127.0.0.1:1", grpc.credentials.createInsecure(), {
    "grpc.initial_reconnect_backoff_ms": 10,
  });
  try {
    const error = await new Promise((resolve) =>
      c.waitForReady(Date.now() + 30, resolve),
    );
    assert.ok(error);
  } finally {
    c.close();
  }
});
test("closing a connecting channel completes readiness callback", async () => {
  const c = new Client("127.0.0.1:1", grpc.credentials.createInsecure(), {
    "grpc.initial_reconnect_backoff_ms": 10,
  });
  const error = new Promise((resolve) =>
    c.waitForReady(Date.now() + 1000, resolve),
  );
  setTimeout(() => c.close(), 10);
  assert.ok(await error);
});

async function tlsPeer(action) {
  const ca = fs.readFileSync(path.join(__dirname, "tls/ca.pem")),
    key = fs.readFileSync(path.join(__dirname, "tls/server1.key")),
    cert = fs.readFileSync(path.join(__dirname, "tls/server1.pem"));
  const server = new wireGrpc.Server();
  let calls = 0;
  server.addService(
    { echo: method },
    {
      echo(call, done) {
        calls++;
        done(null, { ok: true });
      },
    },
  );
  const port = await new Promise((resolve, reject) =>
    server.bindAsync(
      "127.0.0.1:0",
      wireGrpc.ServerCredentials.createSsl(null, [
        { private_key: key, cert_chain: cert },
      ]),
      (e, p) => (e ? reject(e) : resolve(p)),
    ),
  );
  try {
    await action(port, ca, () => calls);
  } finally {
    server.forceShutdown();
  }
}
test("TLS rejects an untrusted certificate before sending application data", () =>
  tlsPeer(async (port, ca, calls) => {
    const c = new Client("127.0.0.1:" + port, grpc.credentials.createSsl(), {
      "grpc.ssl_target_name_override": "foo.test.google.fr",
    });
    try {
      assert.equal((await unary(c)).error.code, 14);
      assert.equal(calls(), 0);
    } finally {
      c.close();
    }
  }));
test("TLS rejects a trusted certificate with the wrong server name", () =>
  tlsPeer(async (port, ca, calls) => {
    const c = new Client("127.0.0.1:" + port, grpc.credentials.createSsl(ca), {
      "grpc.ssl_target_name_override": "wrong.test.invalid",
    });
    try {
      assert.equal((await unary(c)).error.code, 14);
      assert.equal(calls(), 0);
    } finally {
      c.close();
    }
  }));
test("TLS uses logical server identity and verifies its certificate", () =>
  tlsPeer(async (port, ca, calls) => {
    const c = new Client("127.0.0.1:" + port, grpc.credentials.createSsl(ca), {
      "grpc.ssl_target_name_override": "foo.test.google.fr",
    });
    try {
      assert.ifError((await unary(c)).error);
      assert.equal(calls(), 1);
    } finally {
      c.close();
    }
  }));
test("credential generator failure is delivered once without sending a request", () => {
  let calls = 0;
  return withServer(
    (s) => {
      calls++;
      respond(s, {});
    },
    async (c) => {
      const credential = grpc.credentials.createFromMetadataGenerator((o, cb) =>
        cb(Object.assign(Error("denied"), { code: 16 })),
      );
      const r = await unary(c, {}, undefined, { credentials: credential });
      await delay(0);
      assert.equal(r.error.code, 16);
      assert.equal(calls, 0);
      assert.equal(r.events.filter((e) => e[0] === "status").length, 1);
    },
  );
});
