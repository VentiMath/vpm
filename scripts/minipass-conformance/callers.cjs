"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  fixture = require("./fixture.cjs");
const control = fixture(),
  own = fixture(
    process.env.VPM_MINIPASS_PACKAGE ||
      path.resolve(__dirname, "../../packages/vminipass"),
  ),
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-minipass-paths-"));
const normalize = (rows) =>
  Array.from(rows, (x) => (typeof x === "string" ? x : x.fullpath())).sort();
(async () => {
  try {
    for (let i = 0; i < 90; i++) {
      const file = cwd + `/src/dir${i % 7}/file${i}.${i % 2 ? "ts" : "js"}`;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "data");
    }
    fs.writeFileSync(cwd + "/.hidden", "hidden");
    let checks = 0;
    for (const pattern of ["**/*", "src/**/*.ts", "src/dir{1,3}/*.js"])
      for (const options of [
        {},
        { dot: true },
        { nodir: true },
        { withFileTypes: true },
        { ignore: "**/dir1/**" },
        { maxDepth: 2 },
      ]) {
        const opts = { cwd, ...options },
          a = control.req("glob/raw"),
          b = own.req("glob/raw"),
          expected = normalize(await a.globStream(pattern, opts).collect());
        assert.deepEqual(
          normalize(await b.globStream(pattern, opts).collect()),
          expected,
        );
        checks++;
        assert.deepEqual(
          normalize(await b.globStreamSync(pattern, opts).collect()),
          expected,
        );
        checks++;
        const rows = [];
        for await (const value of b.globStream(pattern, opts)) rows.push(value);
        assert.deepEqual(normalize(rows), expected);
        checks++;
        const sync = b.globStreamSync(pattern, opts),
          read = [];
        while (sync.bufferLength) read.push(sync.read());
        assert.deepEqual(normalize(read), expected);
        checks++;
      }
    for (const options of [
      {},
      { withFileTypes: false },
      { maxDepth: 1 },
      { filter: (p) => !p.name.endsWith(".js") },
    ])
      for (const method of ["stream", "streamSync"]) {
        const a = new (control.req("path-scurry").PathScurry)(cwd),
          b = new (own.req("path-scurry").PathScurry)(cwd);
        const expected = normalize(await a[method](options).collect());
        assert.deepEqual(
          normalize(await b[method](options).collect()),
          expected,
        );
        checks++;
      }
    const slow = own.req("glob/raw").globStream("**/*", { cwd }),
      rows = [];
    for await (const row of slow) {
      rows.push(row);
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.deepEqual(
      normalize(rows),
      normalize(control.req("glob/raw").globSync("**/*", { cwd })),
    );
    checks++;
    for (const f of [control, own]) {
      const controller = new AbortController(),
        s = f
          .req("glob/raw")
          .globStream("**/*", { cwd, signal: controller.signal }),
        pending = s.collect(),
        error = new Error("cancel walk");
      controller.abort(error);
      await assert.rejects(pending, (e) => e === error);
      checks++;
    }
    assert(
      own.calls() >= checks - 2,
      "Must exercise the replacement constructor",
    );
    console.log(
      `${checks} unchanged glob 13/path-scurry 2 streaming checks pass; ${own.calls()} replacement constructions.`,
    );
  } finally {
    control.close();
    own.close();
    fs.rmSync(cwd, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
