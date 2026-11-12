"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { EventEmitter } = require("node:events");
const plugin = require("..");
async function setup(options = {}) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpaths-test-")),
  );
  const write = (data) =>
    fs.writeFileSync(root + "/tsconfig.json", JSON.stringify(data));
  write({ compilerOptions: { paths: { "@/*": ["old/*"] } } });
  const p = plugin(options);
  await p.configResolved({ root, logger: { warn() {} } });
  const resolve = (id) =>
    p.resolveId.call(
      { resolve: async (id) => ({ id }) },
      id,
      root + "/src/a.ts",
      {},
    );
  return {
    root,
    write,
    p,
    resolve,
    clear: () => {
      p.closeBundle();
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}
test("exact keys and longer prefixes precede general wildcard aliases", async () => {
  const s = await setup();
  try {
    s.write({
      compilerOptions: {
        paths: {
          "@/*": ["general/*"],
          "@/fixed": ["exact"],
          "@/special/*": ["special/*"],
          "*tail": ["suffix/*"],
        },
      },
    });
    s.p.watchChange(s.root + "/tsconfig.json");
    assert.equal(await s.resolve("@/fixed"), s.root + "/exact");
    assert.equal(await s.resolve("tail"), s.root + "/suffix");
    assert.equal(await s.resolve("@/special/a"), s.root + "/special/a");
  } finally {
    s.clear();
  }
});
test("configuration edits and add/unlink invalidate without stale resolved-path cache", async () => {
  const s = await setup();
  const watcher = new EventEmitter();
  try {
    s.p.configureServer({ watcher });
    assert.equal(await s.resolve("@/a"), s.root + "/old/a");
    s.write({ compilerOptions: { paths: { "@/*": ["new/*"] } } });
    watcher.emit("change", s.root + "/tsconfig.json");
    assert.equal(await s.resolve("@/a"), s.root + "/new/a");
    fs.unlinkSync(s.root + "/tsconfig.json");
    watcher.emit("unlink", s.root + "/tsconfig.json");
    assert.equal(await s.resolve("@/a"), undefined);
    s.write({ compilerOptions: { paths: { "@/*": ["created/*"] } } });
    watcher.emit("add", s.root + "/tsconfig.json");
    assert.equal(await s.resolve("@/a"), s.root + "/created/a");
    s.p.closeBundle();
    for (const e of ["add", "change", "unlink"])
      assert.equal(watcher.listenerCount(e), 0);
  } finally {
    s.clear();
  }
});
test("lazy discovery supports newly encountered child configuration", async () => {
  const s = await setup({ projectDiscovery: "lazy" });
  try {
    assert.equal(await s.resolve("@/a"), s.root + "/old/a");
    fs.mkdirSync(s.root + "/nested");
    fs.writeFileSync(
      s.root + "/nested/tsconfig.json",
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["local/*"] } } }),
    );
    s.p.watchChange(s.root + "/nested/tsconfig.json");
    assert.equal(
      await s.p.resolveId.call(
        { resolve: async (id) => ({ id }) },
        "@/a",
        s.root + "/nested/a.ts",
        {},
      ),
      s.root + "/nested/local/a",
    );
  } finally {
    s.clear();
  }
});
test("targets keep query suffixes, context and skipSelf without mutating options", async () => {
  const s = await setup();
  try {
    const options = { custom: { x: 1 } };
    let seen;
    const value = await s.p.resolveId.call(
      {
        resolve: async (...args) => {
          seen = args;
          return { id: args[0] };
        },
      },
      "@/a?raw",
      s.root + "/src/a.ts",
      options,
    );
    assert.equal(value, s.root + "/old/a?raw");
    assert.deepEqual(seen[2], { ...options, skipSelf: true });
    assert.equal(options.skipSelf, undefined);
  } finally {
    s.clear();
  }
});
test("no module-result cache hides files created after a missing target", async () => {
  const s = await setup();
  try {
    let available = false;
    const ctx = { resolve: async (id) => (available ? { id } : null) };
    assert.equal(
      await s.p.resolveId.call(ctx, "@/a", s.root + "/src/a.ts", {}),
      undefined,
    );
    available = true;
    assert.equal(
      await s.p.resolveId.call(ctx, "@/a", s.root + "/src/a.ts", {}),
      s.root + "/old/a",
    );
  } finally {
    s.clear();
  }
});
test("unsupported compiler and file-log modes reject explicitly", () => {
  assert.throws(() => plugin({ parseNative: true }), /Compiler parsing/);
  assert.throws(() => plugin({ logFile: true }), /File logging/);
  assert.throws(() => plugin({ projectDiscovery: "unknown" }), /Invalid/);
});
