"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vprotobuf-load-"));
async function main() {
  let checks = 0;
  for (const pb of [
    require("protobufjs"),
    require("../../packages/vprotobufjs"),
  ]) {
    const originals = Object.keys(pb.common).filter((x) =>
      x.endsWith(".proto"),
    );
    for (const name of originals) {
      const root = new pb.Root();
      root.loadSync([
        name,
        "../protos/" + name,
        path.join(temp, name),
        "https://schemas.invalid/" + name,
      ]);
      assert.deepEqual(root.files, [name]);
      assert.deepEqual(
        JSON.parse(JSON.stringify(root)),
        JSON.parse(JSON.stringify(pb.Root.fromJSON(pb.common[name]))),
      );
      checks++;
    }
    const promised = await pb.load("../protos/google/protobuf/wrappers.proto");
    const T = promised.lookupType("google.protobuf.StringValue");
    assert.equal(
      T.decode(T.encode({ value: "pipeline" }).finish()).value,
      "pipeline",
    );
    checks++;
    let synchronous = true;
    const callback = new Promise((resolve, reject) =>
      pb.load("../protos/google/protobuf/wrappers.proto", (e, root) => {
        try {
          assert.equal(synchronous, false);
          if (e) throw e;
          assert(root.lookupType("google.protobuf.Int64Value"));
          resolve();
        } catch (error) {
          reject(error);
        }
      }),
    );
    synchronous = false;
    await callback;
    checks++;
    const fixture = path.join(temp, "fixture.proto");
    fs.writeFileSync(
      fixture,
      'syntax="proto3"; import "../protos/google/protobuf/wrappers.proto"; import "google/protobuf/wrappers.proto"; message Result { google.protobuf.Int64Value value = 1; }',
    );
    const custom = new pb.Root(),
      resolved = [];
    custom.resolvePath = (origin, name) => {
      resolved.push([origin, name]);
      assert.equal(origin, "");
      return name;
    };
    await custom.load(fixture);
    assert.deepEqual(resolved, [["", fixture]]);
    assert.deepEqual(custom.files, [fixture, "google/protobuf/wrappers.proto"]);
    const Result = custom.lookupType("Result");
    assert.deepEqual(
      Result.toObject(
        Result.decode(
          Result.encode(
            Result.fromObject({ value: { value: "9007199254740993" } }),
          ).finish(),
        ),
        { longs: String },
      ),
      { value: { value: "9007199254740993" } },
    );
    checks++;
    const redirect = new pb.Root();
    redirect.resolvePath = () => "../redirect/google/protobuf/wrappers.proto";
    redirect.loadSync("alias");
    assert.deepEqual(redirect.files, ["google/protobuf/wrappers.proto"]);
    checks++;
    const skip = new pb.Root();
    skip.resolvePath = () => null;
    await skip.load("ignored");
    assert.deepEqual(skip.files, []);
    checks++;
    for (const name of [
      "../protos/google/protobuf/not-a-builtin.proto",
      path.join(temp, "toString"),
      path.join(temp, "wrappers.proto"),
    ]) {
      assert.throws(() => new pb.Root().loadSync(name), /ENOENT/);
      await assert.rejects(pb.load(name), /ENOENT/);
      checks++;
    }
    pb.common("vpm-loading-fixture.proto", {
      nested: { Custom: { fields: { value: { type: "string", id: 1 } } } },
    });
    try {
      assert(
        new pb.Root()
          .loadSync("vpm-loading-fixture.proto")
          .lookupType("Custom"),
      );
      checks++;
    } finally {
      delete pb.common["vpm-loading-fixture.proto"];
    }
    console.log(
      `${pb === require("protobufjs") ? "Original" : "VPM"}: built-in aliases, deduplication, resolver overrides, imports, missing files and sync/promise/callback loading pass.`,
    );
  }
  console.log(checks + " paired loading scenarios passed.");
  // Exercise the browser's asynchronous loader, which cannot fall back to fs.
  const source = path.join(temp, "browser.mjs"),
    bundle = path.join(temp, "browser.js");
  fs.writeFileSync(
    source,
    `import pb from ${JSON.stringify(path.resolve(__dirname, "../../packages/vprotobufjs/index.js"))};
    globalThis.done=(async()=>{
      const root=await pb.load(['../protos/google/protobuf/wrappers.proto','google/protobuf/wrappers.proto','https://schemas.invalid/google/protobuf/wrappers.proto']);
      const loaded=await pb.load('/schemas/app.proto');
      const T=loaded.lookupType('Result');
      return {isNode:pb.util.isNode,files:root.files,value:T.toObject(T.decode(T.encode({value:{value:'browser'}}).finish()))};
    })();`,
  );
  const built = require("node:child_process").spawnSync(
    "bun",
    [
      "build",
      source,
      "--target=browser",
      "--format=iife",
      "--outfile=" + bundle,
    ],
    { encoding: "utf8" },
  );
  assert.equal(built.status, 0, built.stderr);
  let fetches = 0;
  const ctx = {
    TextEncoder,
    TextDecoder,
    Uint8Array,
    fetch: async (url) => {
      assert.equal(url, "/schemas/app.proto");
      fetches++;
      return {
        ok: true,
        text: async () =>
          'syntax="proto3"; import "../protos/google/protobuf/wrappers.proto"; message Result { google.protobuf.StringValue value = 1; }',
      };
    },
  };
  require("node:vm").runInNewContext(fs.readFileSync(bundle, "utf8"), ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(await ctx.done)), {
    isNode: false,
    files: ["google/protobuf/wrappers.proto"],
    value: { value: { value: "browser" } },
  });
  assert.equal(fetches, 1, "built-in definitions must never fetch");
  console.log(
    "Browser loader: built-in aliases/deduplication make zero fetches; external schema imports resolve correctly.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temp, { recursive: true, force: true }));
