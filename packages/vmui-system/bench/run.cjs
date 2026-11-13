"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
	assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
	fixture = path.resolve(root, "../../scripts/mui-system-conformance");
const React = require(fixture + "/node_modules/react"),
	{ renderToString } = require(fixture + "/node_modules/react-dom/server"),
	own = require(fixture + "/prepare.cjs");
const cases = [
	{
		name: "create application theme",
		make(file) {
			const api = require(file);
			return () =>
				api.createTheme({
					spacing: 8,
					palette: { primary: { main: "#123456" } },
					shape: { borderRadius: 6 },
					components: { Demo: { defaultProps: { dense: true } } },
				});
		},
		validate(v) {
			assert.equal(v.palette.primary.main, "#123456");
			assert.equal(v.spacing(2), "16px");
		},
	},
	{
		name: "resolve responsive sx",
		make(file) {
			const api = require(file),
				theme = api.createTheme({ palette: { primary: { main: "#123456" } } }),
				sx = {
					px: { xs: 1, md: 3 },
					width: [1, 0.5],
					bgcolor: "primary.main",
					borderRadius: 2,
					"&:hover": { color: "primary.main", m: 1 },
				};
			return () => api.unstable_styleFunctionSx({ theme, sx });
		},
		validate(v) {
			assert.equal(v.backgroundColor, "#123456");
			assert.equal(v["@media (min-width:900px)"].paddingLeft, "24px");
		},
	},
	{
		name: "generate theme CSS variables",
		make(file) {
			const api = require(file),
				theme = {
					spacing: 8,
					shape: { borderRadius: 4 },
					defaultColorScheme: "light",
					colorSchemes: {
						light: { palette: { main: "#fff", opacity: 0.5 } },
						dark: { palette: { main: "#000", opacity: 0.6 } },
					},
				};
			return () =>
				api
					.unstable_prepareCssVars(theme, {
						prefix: "app",
						colorSchemeSelector: "class",
					})
					.generateStyleSheets();
		},
		validate(v) {
			assert.equal(v[1][":root, .light"]["--app-palette-main"], "#fff");
		},
	},
	{
		name: "Box and responsive Stack SSR",
		make(file) {
			const api = require(file),
				theme = api.createTheme(),
				tree = React.createElement(
					api.ThemeProvider,
					{ theme },
					React.createElement(
						api.Stack,
						{ spacing: 2, direction: { xs: "column", md: "row" } },
						React.createElement(
							api.Box,
							{ sx: { p: 2, color: "blue" } },
							"Contest",
						),
						React.createElement(api.Box, { sx: { m: 1 } }, "Results"),
					),
				);
			return () => renderToString(tree);
		},
		validate(v) {
			assert.match(v, /Contest/);
			assert.match(v, /padding:16px/);
		},
	},
	{
		name: "styled theme override SSR",
		make(file) {
			const api = require(file),
				theme = api.createTheme({
					components: {
						Panel: {
							styleOverrides: { root: { borderRadius: 3 } },
							variants: [
								{ props: { selected: true }, style: { opacity: 0.5 } },
							],
						},
					},
				}),
				C = api.styled("div", {
					name: "Panel",
					slot: "Root",
					overridesResolver: (_, s) => s.root,
				})(({ theme }) => ({ padding: theme.spacing(2) })),
				tree = React.createElement(
					api.ThemeProvider,
					{ theme },
					React.createElement(
						C,
						{ ownerState: { selected: true }, sx: { color: "red" } },
						"AMC",
					),
				);
			return () => renderToString(tree);
		},
		validate(v) {
			assert.match(v, /opacity:0.5/);
			assert.match(v, /padding:16px/);
		},
	},
];
const fs = require("node:fs"),
	closure = new Set();
function visit(name) {
	if (closure.has(name)) return;
	closure.add(name);
	for (const key of Object.keys(
		require(root + "/../" + name + "/package.json").dependencies || {},
	))
		visit(key);
}
visit("vmui-system");
const files = [];
for (const name of closure)
	for (const file of fs.readdirSync(root + "/../" + name))
		if (file === "src" || /\.(?:cjs|mjs|json)$/.test(file))
			files.push("../" + name + "/" + file);
files.push(
	"bench/run.cjs",
	"../../scripts/mui-system-conformance/prepare.cjs",
	"../../scripts/mui-system-conformance/package-lock.json",
	"../../scripts/mui-system-conformance/node_modules/@mui/system",
);
require("../../../scripts/bench-process.cjs")
	.run({
		root,
		upstream: require.resolve("@mui/system", { paths: [fixture] }),
		vpm: own,
		cases,
		files,
	})
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	});
