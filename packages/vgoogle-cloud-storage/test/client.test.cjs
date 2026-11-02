"use strict";
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { gzipSync } = require("node:zlib");
const { Storage, CRC32C } = require("..");
const chunkSize = 256 * 1024;
after(() => require("vteeny-request").teenyRequest.close());
async function fixture(t, handler, options = {}) {
  const failures = [];
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      res.setHeader("content-type", "application/json");
      await handler(req, res, Buffer.concat(chunks));
    } catch (error) {
      failures.push(error);
      res.writeHead(500);
      res.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    assert.deepEqual(failures, []);
  });
  const endpoint = "http://127.0.0.1:" + server.address().port;
  return {
    endpoint,
    storage: new Storage({
      projectId: "fixture",
      apiEndpoint: endpoint,
      retryOptions: { autoRetry: false },
      ...options,
    }),
  };
}
function json(res, status, data) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}
function metadata(data) {
  const crc = new CRC32C();
  crc.update(data);
  return { name: "object", size: String(data.length), crc32c: crc.toString() };
}

test("resumable chunks recover a partially persisted failed request by querying the session", async (t) => {
  const data = Buffer.alloc(chunkSize * 2 + 33, 97),
    ranges = [];
  let persisted = Buffer.alloc(0),
    probed = false;
  const { storage, endpoint } = await fixture(
    t,
    (req, res, body) => {
      if (req.method === "POST") {
        res.writeHead(200, { location: endpoint + "/session" });
        return res.end();
      }
      const range = req.headers["content-range"];
      ranges.push(range);
      if (range === "bytes */*") {
        probed = true;
        res.writeHead(308, { range: "bytes=0-" + (persisted.length - 1) });
        return res.end();
      }
      const match = /^bytes (\d+)-(\d+)\/(\*|\d+)$/.exec(range);
      assert(match);
      assert.equal(Number(match[1]), persisted.length);
      assert.equal(body.length, Number(match[2]) - Number(match[1]) + 1);
      if (persisted.length === 0) {
        persisted = body.subarray(0, chunkSize / 2);
        return json(res, 503, { error: { message: "committed only part" } });
      }
      persisted = Buffer.concat([persisted, body]);
      if (match[3] === "*") {
        res.writeHead(308, { range: "bytes=0-" + (persisted.length - 1) });
        res.end();
      } else json(res, 200, metadata(persisted));
    },
    { retryOptions: { autoRetry: true, maxRetries: 2 } },
  );
  await storage
    .bucket("bucket")
    .file("object")
    .save(data, { chunkSize, preconditionOpts: { ifGenerationMatch: 0 } });
  assert(probed);
  assert.deepEqual(persisted, data);
  assert.deepEqual(ranges, [
    "bytes 0-262143/*",
    "bytes */*",
    "bytes 131072-262143/*",
    "bytes 262144-524287/*",
    "bytes 524288-524320/524321",
  ]);
});

test("resumable acknowledgements cannot skip bytes or loop indefinitely", async (t) => {
  for (const range of ["bytes=0-999999", "junk", undefined]) {
    let requests = 0;
    const { storage, endpoint } = await fixture(t, (req, res) => {
      if (req.method === "POST") {
        res.writeHead(200, { location: endpoint + "/session" });
        return res.end();
      }
      requests++;
      res.writeHead(308, range ? { range } : {});
      res.end();
    });
    await assert.rejects(
      storage
        .bucket("b")
        .file("object")
        .save(Buffer.alloc(chunkSize + 1), { chunkSize, validation: false }),
      /acknowledgement|no progress/,
    );
    assert(requests <= 2);
  }
});

test("empty, partial and continued sessions send accurate byte positions", async (t) => {
  const ranges = [],
    data = Buffer.from("abcdef");
  const { storage, endpoint } = await fixture(t, (req, res, body) => {
    if (req.method === "POST") {
      res.writeHead(200, { location: endpoint + "/session" });
      return res.end();
    }
    const range = req.headers["content-range"];
    ranges.push(range);
    if (range === "bytes 0-2/*") {
      assert.equal(body.toString(), "abc");
      res.writeHead(308, { range: "bytes=0-2" });
      res.end();
    } else
      json(res, 200, metadata(range === "bytes */0" ? Buffer.alloc(0) : data));
  });
  const file = storage.bucket("b").file("object");
  await file.save(Buffer.alloc(0));
  await file.save(data.subarray(0, 3), {
    isPartialUpload: true,
    uri: endpoint + "/session",
  });
  await file.save(data.subarray(3), {
    offset: 3,
    uri: endpoint + "/session",
    resumeCRC32C: metadata(data.subarray(0, 3)).crc32c,
  });
  assert.deepEqual(ranges, ["bytes */0", "bytes 0-2/*", "bytes 3-5/6"]);
  await assert.rejects(
    file.save("x", {
      uri: "https://unrelated.example/session",
      validation: false,
    }),
    /session URL/,
  );
  await assert.rejects(
    file.save("x", { offset: 1, validation: false }),
    /session URI/,
  );
});

test("destroying a stream during authentication never starts an upload", async (t) => {
  let release,
    called = 0,
    requests = 0;
  const auth = {
    authorizeRequest: () => {
      called++;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  };
  const { storage } = await fixture(
    t,
    (req, res) => {
      requests++;
      res.end();
    },
    { authClient: auth, useAuthWithCustomEndpoint: true },
  );
  const stream = storage.bucket("b").file("object").createWriteStream();
  stream.on("error", () => {});
  stream.end("bytes");
  while (!called) await new Promise((resolve) => setImmediate(resolve));
  stream.destroy(new Error("cancelled by caller"));
  await new Promise((resolve) => setImmediate(resolve));
  release({ headers: { authorization: "fixture" } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 0);
  assert(stream.destroyed);
});

test("downloads validate wire bytes before decompression and preserve range semantics", async (t) => {
  const bytes = Buffer.from("binary\0payload ".repeat(100)),
    compressed = gzipSync(bytes),
    ranges = [];
  const { storage } = await fixture(t, (req, res) => {
    if (req.headers.range) {
      ranges.push(req.headers.range);
      res.writeHead(206);
      return res.end(bytes.subarray(2, 6));
    }
    res.writeHead(200, {
      "content-encoding": "gzip",
      "x-goog-hash": "crc32c=" + metadata(compressed).crc32c,
    });
    res.end(compressed);
  });
  const file = storage.bucket("b").file("object");
  assert.deepEqual((await file.download())[0], bytes);
  assert.deepEqual((await file.download({ decompress: false }))[0], compressed);
  assert.deepEqual(
    (await file.download({ start: 2, end: 5 }))[0],
    bytes.subarray(2, 6),
  );
  assert.deepEqual(ranges, ["bytes=2-5"]);
  assert.throws(
    () => file.createReadStream({ start: 0, validation: "crc32c" }),
    /validation/i,
  );
});

test("checksum, provider and missing MD5 failures settle downloads", async (t) => {
  const { storage } = await fixture(t, (req, res) => {
    res.writeHead(200, { "x-goog-hash": "crc32c=AAAAAA==" });
    res.end("incorrect");
  });
  const file = storage.bucket("b").file("object");
  await assert.rejects(file.download(), { code: "CONTENT_DOWNLOAD_MISMATCH" });
  await assert.rejects(file.download({ validation: "md5" }), {
    code: "MD5_NOT_AVAILABLE",
  });
  file.crc32cGenerator = () => ({
    update() {
      throw Error("custom hash failure");
    },
  });
  await assert.rejects(file.download(), /custom hash failure/);
  file.crc32cGenerator = () => ({
    update() {},
    toString() {
      throw Error("custom flush failure");
    },
  });
  await assert.rejects(file.download(), /custom flush failure/);
});

test("download cancellation before consumption makes no request", async (t) => {
  let requests = 0;
  const { storage } = await fixture(t, (req, res) => {
    requests++;
    res.end();
  });
  const stream = storage.bucket("b").file("object").createReadStream();
  stream.destroy();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 0);
});

test("listing detects repeated tokens and metadata and deletion retain preconditions", async (t) => {
  let patches = 0,
    deletes = 0;
  const { storage } = await fixture(t, (req, res, body) => {
    const url = new URL(req.url, "http://fixture");
    if (url.pathname.endsWith("/o"))
      return json(res, 200, { items: [], nextPageToken: "loop" });
    if (req.method === "PATCH") {
      patches++;
      assert.equal(url.searchParams.get("ifMetagenerationMatch"), "3");
      assert.deepEqual(JSON.parse(body), { contentType: "text/plain" });
      return json(res, 200, { name: "object" });
    }
    if (req.method === "DELETE") {
      deletes++;
      assert(!url.searchParams.has("ignoreNotFound"));
      assert.equal(url.searchParams.get("ifGenerationMatch"), "5");
      return json(res, 404, { error: { message: "missing" } });
    }
    return json(res, 403, { error: { message: "denied" } });
  });
  const bucket = storage.bucket("b"),
    file = bucket.file("object");
  await assert.rejects(bucket.getFiles(), /repeated a page token/);
  await assert.rejects(async () => {
    for await (const unused of bucket.getFilesStream()) void unused;
  }, /repeated a page token/);
  const input = { contentType: "text/plain" },
    operation = file.setMetadata(input, { ifMetagenerationMatch: 3 });
  input.contentType = "changed";
  await operation;
  await file.delete({ ignoreNotFound: true, ifGenerationMatch: 5 });
  await assert.rejects(file.exists(), { code: 403 });
  assert.equal(patches, 1);
  assert.equal(deletes, 1);
});

test("signed URL and POST policy wrappers capture caller inputs before credentials resolve", async () => {
  let release;
  const auth = {
    getCredentials: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    sign: async () => Buffer.from("signature").toString("base64"),
  };
  const file = new Storage({ authClient: auth })
    .bucket("bucket")
    .file("before");
  const config = {
    action: "read",
    version: "v4",
    expires: Date.now() + 60000,
    queryParams: { value: "before" },
  };
  const pending = file.getSignedUrl(config);
  config.queryParams.value = "after";
  file.name = "after";
  release({ client_email: "fixture@example.test" });
  const [signed] = await pending;
  assert.equal(new URL(signed).searchParams.get("value"), "before");
  assert.equal(new URL(signed).pathname, "/bucket/before");
  const fields = { "Content-Type": "text/plain" },
    conditions = [["content-length-range", 0, 100]];
  const post = file.generateSignedPostPolicyV4({
    expires: Date.now() + 60000,
    fields,
    conditions,
  });
  fields["Content-Type"] = "changed";
  conditions[0][2] = 999;
  file.name = "later";
  release({ client_email: "fixture@example.test" });
  const [result] = await post;
  const policy = JSON.parse(Buffer.from(result.fields.policy, "base64"));
  assert.equal(result.fields.key, "after");
  assert.equal(result.fields["Content-Type"], "text/plain");
  assert.deepEqual(policy.conditions[0], ["content-length-range", 0, 100]);
});
