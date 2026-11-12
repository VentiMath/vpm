"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  api = require("..");
async function fixture(fn) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vtsconfck-test-")),
  );
  const put = (name, value) => {
    const f = root + "/" + name;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(
      f,
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return f;
  };
  try {
    await fn(root, put);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
test("JSONC preserves strings, line positions and trailing commas", () => {
  const input =
    '{\n//comment\n"url":"https://example.test/*ok*/", "items":[1,2,],\n}';
  const text = api.toJson(input);
  assert.equal(text.split("\n").length, input.split("\n").length);
  assert.deepEqual(JSON.parse(text), {
    url: "https://example.test/*ok*/",
    items: [1, 2],
  });
});
test("prototype-looking configuration keys remain data during inheritance", () =>
  fixture(async (root, put) => {
    put(
      "base.json",
      '{"compilerOptions":{"__proto__":{"polluted":true},"constructor":"own"}}',
    );
    put("tsconfig.json", { extends: "./base.json" });
    const r = await api.parse(root + "/tsconfig.json");
    assert.equal({}.polluted, undefined);
    assert.equal(Object.hasOwn(r.tsconfig.compilerOptions, "__proto__"), true);
    assert.equal(r.tsconfig.compilerOptions.constructor, "own");
  }));
test("root-limited cache does not leak a result from a broader lookup", () =>
  fixture(async (root, put) => {
    put("tsconfig.json", {});
    put("child/src/a.ts", "");
    const cache = new api.TSConfckCache();
    assert.equal(
      await api.find(root + "/child/src/a.ts", { root, cache }),
      root + "/tsconfig.json",
    );
    assert.equal(
      await api.find(root + "/child/src/a.ts", {
        root: root + "/child",
        cache,
      }),
      null,
    );
  }));
test("clear invalidates parsed results and pending work cannot repopulate the new cache", () =>
  fixture(async (root, put) => {
    const file = put("tsconfig.json", { compilerOptions: { strict: true } }),
      cache = new api.TSConfckCache();
    const pending = api.parse(file, { cache });
    cache.clear();
    await pending;
    assert.equal(cache.hasParseResult(file), false);
    put("tsconfig.json", { compilerOptions: { strict: false } });
    assert.equal(
      (await api.parse(file, { cache })).tsconfig.compilerOptions.strict,
      false,
    );
    cache.clear();
    assert.equal(cache.hasParseResult(file), false);
  }));
test("multiple extends retains source order and last-parent precedence", () =>
  fixture(async (root, put) => {
    put("a.json", { compilerOptions: { strict: false } });
    put("b.json", { compilerOptions: { strict: true } });
    const file = put("tsconfig.json", { extends: ["./a.json", "./b.json"] });
    const r = await api.parse(file);
    assert.equal(r.tsconfig.compilerOptions.strict, true);
    assert.deepEqual(r.extended[0].tsconfig.extends, ["./a.json", "./b.json"]);
  }));
test("inheritance and reference cycles fail with bounded diagnostics", () =>
  fixture(async (root, put) => {
    const a = put("a.json", { extends: "./b.json" });
    put("b.json", { extends: "./a.json" });
    await assert.rejects(api.parse(a), { code: "EXTENDS_CIRCULAR" });
    const ref = put("refs/tsconfig.json", { references: [{ path: "." }] });
    await assert.rejects(api.parse(ref), { code: "REFERENCES_CIRCULAR" });
  }));
test("invalid top-level shapes fail explicitly and native compiler mode is unavailable", () =>
  fixture(async (root, put) => {
    await assert.rejects(api.parse(put("bad.json", [])), {
      code: "PARSE_FILE",
    });
    await assert.rejects(api.parseNative(root + "/tsconfig.json"), {
      code: "UNSUPPORTED_NATIVE",
    });
  }));
test("directory scanning skips requested names and never follows symlink cycles", () =>
  fixture(async (root, put) => {
    put("src/tsconfig.json", {});
    put("node_modules/x/tsconfig.json", {});
    fs.symlinkSync(root, root + "/src/cycle", "dir");
    assert.deepEqual(
      await api.findAll(root, { skip: (name) => name === "node_modules" }),
      [root + "/src/tsconfig.json"],
    );
  }));
