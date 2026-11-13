import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";
import * as api from "vmui-system";
const require = createRequire(import.meta.url),
	c = require("vmui-system");
assert.equal(api.createTheme, c.createTheme);
for (const key of Object.keys(require("vmui-system/package.json").exports)) {
	if (key === "." || key === "./package.json") continue;
	const id = "vmui-system/" + key.slice(2),
		a = require(id),
		b = await import(id);
	if (Object.hasOwn(a, "default")) assert.notEqual(a.default, undefined, id);
	if (a.default) assert.equal(a.default, b.default, id);
	else for (const k of Object.keys(b)) assert.equal(a[k], b[k], id + ":" + k);
}
const theme = api.createTheme({ spacing: 4 });
const html = renderToString(
	React.createElement(
		api.ThemeProvider,
		{ theme },
		React.createElement(api.Box, { sx: { p: 2, color: "red" } }, "Contest"),
	),
);
assert.match(html, /padding:8px/);
assert.match(html, /Contest/);
for (const name of [
	"@mui/system",
	"@mui/utils",
	"@babel/runtime",
	"@emotion/react",
	"prop-types",
])
	assert.throws(() => require.resolve(name));
const seen = new Set();
function check(name) {
	if (seen.has(name)) return;
	seen.add(name);
	const manifest = require(name + "/package.json");
	for (const [key, value] of Object.entries(manifest.dependencies || {})) {
		assert.ok(
			value.startsWith("file:"),
			key + " must resolve to a pinned archive",
		);
		check(key);
	}
}
check("vmui-system");
console.log(
	"All System entries, SSR and " +
		seen.size +
		"-package pinned VPM closure pass",
);
