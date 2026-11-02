"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process"),
  { createHash } = require("node:crypto");
const source = require("./SOURCE.json"),
  archive = path.join(__dirname, source.archive),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vprotobuf-public-"));
const files = [
  "api_writer-reader",
  "api_reader_packed",
  "api_writer_packed",
  "api_decoder_bounds",
  "comp_bytes",
  "comp_empty-encode",
  "comp_fixed64-grpc",
  "comp_sfixed64-grpc",
  "comp_long-tags",
  "comp_negative-int32",
  "comp_packed-repeated",
  "comp_repeated-message",
  "comp_unknown-fields",
  "api_service-rpc",
  "api_service-rpc-streaming",
];
try {
  assert.equal(
    createHash("sha256").update(fs.readFileSync(archive)).digest("hex"),
    source.sha256,
  );
  assert.equal(spawnSync("tar", ["-xzf", archive, "-C", temp]).status, 0);
  const upstream = process.argv.includes("--upstream"),
    target = path.resolve(
      __dirname,
      upstream ? "node_modules/protobufjs" : "../../packages/vprotobufjs",
    );
  for (const name of ["index.js", "light.js", "minimal.js"])
    fs.copyFileSync(path.join(target, name), path.join(temp, name));
  for (const dir of upstream
    ? ["src", "ext", "google"]
    : ["runtime", "ext", "google"]) {
    fs.rmSync(path.join(temp, dir), { recursive: true, force: true });
    fs.cpSync(path.join(target, dir), path.join(temp, dir), {
      recursive: true,
    });
  }
  fs.mkdirSync(path.join(temp, "node_modules"));
  for (const name of fs.readdirSync(path.join(__dirname, "node_modules")))
    if (name !== ".bin" && name !== "protobufjs")
      fs.symlinkSync(
        path.join(__dirname, "node_modules", name),
        path.join(temp, "node_modules", name),
      );
  fs.mkdirSync(path.join(temp, "cli"));
  fs.writeFileSync(
    path.join(temp, "cli/pbjs.js"),
    `const cli=require(${JSON.stringify(path.join(__dirname, "node_modules/protobufjs-cli/pbjs.js"))}),pb=require(${JSON.stringify(path.join(__dirname, "node_modules/protobufjs"))});module.exports={...cli,generate:(root,options,callback)=>cli.generate(pb.Root.fromJSON(root.toJSON()).resolveAll(),options,callback)};`,
  );
  fs.symlinkSync(temp, path.join(temp, "node_modules/protobufjs"));
  fs.symlinkSync(
    path.resolve(__dirname, "../../packages/vlong"),
    path.join(temp, "node_modules/vlong"),
  );
  fs.writeFileSync(
    path.join(temp, "run.cjs"),
    `require('./lib/tape-adapter');const tape=require('tape');let assertions=0,failures=0;const s=tape.createStream({objectMode:true});s.on('data',r=>{if(r.type==='assert'){assertions++;if(!r.ok){failures++;console.error(JSON.stringify(r));}}});s.on('end',()=>{console.log(JSON.stringify({files:${files.length},assertions,failures}));if(failures)process.exitCode=1;});${files.map((f) => "require(" + JSON.stringify("./tests/" + f + ".js") + ");").join("\n")}`,
  );
  const result = spawnSync(process.execPath, ["run.cjs"], {
    cwd: temp,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 4e6,
  });
  if (result.status !== 0) console.error(result.stdout, result.stderr);
  assert.equal(result.status, 0, "Unchanged public binary/RPC suite failed");
  console.log(
    `${upstream ? "Upstream" : "Independent VPM"} public binary/RPC assertions: ${result.stdout.trim().split("\n").at(-1)}`,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
