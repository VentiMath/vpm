"use strict";
const { test } = require("node:test"),
	assert = require("node:assert/strict");
const api = require(
	require("../../../scripts/mui-system-conformance/prepare.cjs"),
);
test("theme and responsive styles preserve input objects and order media widths", () => {
	const input = {
			spacing: 4,
			breakpoints: { values: { wide: 1200, phone: 0, tablet: 600 } },
			palette: { primary: { main: "#123456" } },
		},
		snapshot = structuredClone(input);
	const theme = api.createTheme(input);
	assert.deepEqual(input, snapshot);
	assert.deepEqual(theme.breakpoints.keys, ["phone", "tablet", "wide"]);
	const sx = {
			p: { wide: 3, phone: 1 },
			"&:hover": { color: "primary.main", mx: 2 },
		},
		old = structuredClone(sx),
		out = api.unstable_styleFunctionSx({ theme, sx });
	assert.deepEqual(sx, old);
	assert.deepEqual(Object.keys(out), [
		"@media (min-width:0px)",
		"@media (min-width:1200px)",
		"&:hover",
	]);
	assert.equal(out["&:hover"].color, "#123456");
	assert.equal(out["&:hover"].marginLeft, "8px");
});
test("spacing reads live theme functions and handles signed CSS variables", () => {
	let multiplier = 2;
	const theme = api.createTheme({ spacing: (n) => n * multiplier });
	assert.equal(theme.spacing(2), "4px");
	multiplier = 4;
	assert.equal(theme.spacing(-2), "−8px".replace("−", "-"));
	const variable = api.createTheme({ spacing: "var(--gap)" });
	assert.equal(
		variable.spacing(0, 1, -2),
		"0px var(--gap) calc(-2 * var(--gap))",
	);
});
test("style lookup never treats prototype properties as theme tokens", () => {
	const theme = api.createTheme({ palette: { primary: { main: "red" } } });
	assert.equal(api.getPath(theme, "palette.toString"), undefined);
	const value = JSON.parse(
		'{"__proto__":{"color":"red"},"constructor":"unset"}',
	);
	const result = api.unstable_styleFunctionSx({ sx: value, theme });
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
	assert.equal(Object.hasOwn(result, "__proto__"), true);
	assert.deepEqual(result.__proto__, { color: "red" });
	assert.equal({}.color, undefined);
});
test("cycles reject while shared acyclic styles remain valid", () => {
	const cyclic = {};
	cyclic["&:hover"] = cyclic;
	assert.throws(() => api.unstable_styleFunctionSx({ sx: cyclic }), /Cyclic/);
	const array = [];
	array.push(array);
	assert.throws(() => api.unstable_styleFunctionSx({ sx: array }), /Cyclic/);
	const same = { p: 1 };
	assert.deepEqual(api.unstable_styleFunctionSx({ sx: [same, same] }), [
		{ padding: 8 },
		{ padding: 8 },
	]);
	const vars = {};
	vars.self = vars;
	assert.throws(() => api.cssVarsParser(vars), /cycles/);
});
test("variable parser skips non-values and supplies stable independent outputs", () => {
	const input = {
		palette: { color: "#abc", opacity: 0.2 },
		shape: { radius: 4 },
		zIndex: { modal: 10 },
		vars: { skip: 1 },
		callback() {},
	};
	const result = api.cssVarsParser(input, { prefix: "contest" });
	assert.equal(result.css["--contest-shape-radius"], "4px");
	assert.equal(result.css["--contest-zIndex-modal"], 10);
	assert.equal(result.css["--contest-palette-opacity"], 0.2);
	assert.equal(result.css["--contest-vars-skip"], undefined);
	result.vars.palette.color = "changed";
	assert.equal(input.palette.color, "#abc");
});
test("invalid finite breakpoints and malformed color channels reject explicitly", () => {
	for (const n of [NaN, Infinity])
		assert.throws(
			() => api.createBreakpoints({ values: { xs: n } }),
			TypeError,
		);
	for (const value of ["#ggg", "rgb(1,2,NaN)", "rgb(1,2,3,4,5)"])
		assert.throws(() => api.alpha(value, 0.5), TypeError);
	assert.equal(api.alpha("#123456", 0.5), "rgba(18, 52, 86, 0.5)");
	assert.equal(api.getContrastRatio("#000", "#fff"), 21);
});
test("CSS variables exclude components and only assign the explicit default selector", () => {
	const t = {
		components: { Thing: { a: 1 } },
		defaultColorScheme: "dark",
		colorSchemes: {
			light: { palette: { main: "#fff" } },
			dark: { palette: { main: "#000" } },
		},
	};
	const a = api.prepareCssVars(t, { colorSchemeSelector: "class" });
	assert.equal(a.vars.components, undefined);
	assert.deepEqual(Object.keys(a.generateStyleSheets()[0]), [":root, .dark"]);
	const b = api.prepareCssVars(
		{ ...t, defaultColorScheme: undefined },
		{ colorSchemeSelector: "media" },
	);
	assert.deepEqual(Object.keys(b.generateStyleSheets()[0]), [
		"@media (prefers-color-scheme: light)",
	]);
});
