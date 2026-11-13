"use strict";
const path = require("node:path"),
	fs = require("node:fs"),
	root = path.resolve(__dirname, "../..");
const aliases = Object.fromEntries(
	fs
		.readdirSync(root + "/packages")
		.filter((n) => n.startsWith("v"))
		.map((n) => [n, root + "/packages/" + n]),
);
const out = __dirname + "/node_modules/.vpm-system/primitives.cjs";
require("esbuild").buildSync({
	stdin: {
		contents: "module.exports=require('./index.cjs')",
		resolveDir: root + "/packages/vmui-system",
	},
	outfile: out,
	bundle: true,
	platform: "node",
	format: "cjs",
	external: ["react"],
	alias: aliases,
	logLevel: "silent",
});
module.exports = out;
