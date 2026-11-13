"use strict";
const assert = require("node:assert/strict");
const own = require(require("./prepare.cjs"));
let checks = 0,
	failures = 0;
for (const version of ["@mui/system", "mui-system-app"]) {
	const api = require(version);
	for (const options of [
		{},
		{ spacing: "var(--gap)" },
		{ spacing: "2rem" },
		{
			breakpoints: {
				values: { phone: 0, tablet: 640, wide: 1280 },
				step: 2,
				unit: "em",
			},
			spacing: 4,
		},
		{ spacing: [0, 2, 5, 10, 20], shape: { borderRadius: 6 } },
		{
			spacing: (v) => v * 3,
			palette: { primary: { main: "#abc" }, grey: { 100: "#eee" } },
			typography: { fontWeightBold: 700, body1: { fontSize: 16 } },
		},
	]) {
		const a = api.createTheme(options),
			b = own.createTheme(options);
		for (const key of a.breakpoints.keys)
			for (const method of ["up", "down", "only", "not"]) {
				assert.equal(b.breakpoints[method](key), a.breakpoints[method](key));
				checks++;
			}
		for (const args of [[], [0], [1], [-2], [1, 2], [1, "auto", 3], ["2rem"]]) {
			assert.equal(b.spacing(...args), a.spacing(...args));
			checks++;
		}
		const values = [
			0,
			1,
			2,
			-1,
			0.5,
			"auto",
			"primary.main",
			"bold",
			[0, 1, null, 2],
			{ xs: 1, md: 2 },
			{ sm: 1, xs: 0 },
			null,
		];
		for (const key of Object.keys(api.unstable_defaultSxConfig))
			for (const value of values) {
				const sx = {
					[key]: Array.isArray(value)
						? value.slice(0, a.breakpoints.keys.length)
						: value,
				};
				let expected;
				try {
					expected = api.unstable_styleFunctionSx({ theme: a, sx });
				} catch {
					continue;
				}
				const actual = own.unstable_styleFunctionSx({ theme: b, sx });
				try {
					assert.deepEqual(actual, expected);
				} catch {
					if (failures++ < 16)
						console.log(
							version,
							JSON.stringify(options),
							JSON.stringify(sx),
							"actual",
							JSON.stringify(actual),
							"expected",
							JSON.stringify(expected),
						);
				}
				checks++;
			}
		for (const sx of [
			{ p: { sm: 2, xs: 1 }, "&:hover": { mx: 2, color: "primary.main" } },
			{ width: [1, 0.5], displayPrint: "none" },
			[{ p: 2 }, false, (theme) => ({ m: theme.spacing(1) })],
			{ foo: { bar: 1 } },
			(theme) => ({ p: 2 }),
			{ typography: "body1" },
		]) {
			assert.deepEqual(
				own.unstable_styleFunctionSx({ theme: b, sx }),
				api.unstable_styleFunctionSx({ theme: a, sx }),
			);
			checks++;
		}
	}
}
assert.equal(failures, 0);
console.log(checks + " theme/spacing/breakpoint/sx comparisons pass");
