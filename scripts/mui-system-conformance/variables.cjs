"use strict";
const assert = require("node:assert/strict"),
	own = require(require("./prepare.cjs"));
let count = 0;
for (const name of ["@mui/system", "mui-system-app"]) {
	const a = require(name),
		parse = a.unstable_cssVarsParser;
	for (const prefix of ["", "mui", "contest"])
		for (let n = 0; n < 32; n++) {
			const input = {
				shape: { borderRadius: n },
				spacing: n + 1,
				palette: { main: "#123456", opacity: n / 32, mode: "light" },
				zIndex: { modal: 1000 + n },
				typography: { fontSize: 14, lineHeight: 1.5 },
				array: [1, "auto", null],
				callback: () => n,
				vars: { ignored: 1 },
			};
			const options = {
				prefix,
				shouldSkipGeneratingVar: (path) => path.includes("mode"),
			};
			assert.deepEqual(
				own.cssVarsParser(input, options),
				parse(input, options),
			);
			count++;
			const theme = {
				...input,
				components: { Ignore: { styleOverrides: { root: { margin: 2 } } } },
				colorSchemes: {
					light: { palette: { main: "#fff" } },
					dark: { palette: { main: "#000" } },
				},
			};
			for (const selector of ["media", "class", "data", '[data-theme="%s"]']) {
				const x = own.unstable_prepareCssVars(theme, {
						...options,
						colorSchemeSelector: selector,
					}),
					y = a.unstable_prepareCssVars(theme, {
						...options,
						colorSchemeSelector: selector,
					});
				assert.deepEqual(x.vars, y.vars);
				assert.deepEqual(x.generateThemeVars(), y.generateThemeVars());
				assert.deepEqual(x.generateStyleSheets(), y.generateStyleSheets());
				count++;
			}
		}
	for (const v of [2, [1, 2], [1, null, 3], { xs: 1, md: 3 }, { sm: 2 }, {}])
		for (const base of [undefined, { xs: true, sm: true, md: true }]) {
			const options = {
				values: v,
				breakpoints: { xs: 0, sm: 600, md: 900 },
				base,
			};
			assert.deepEqual(
				own.unstable_resolveBreakpointValues(options),
				a.unstable_resolveBreakpointValues(options),
			);
			count++;
		}
}
console.log(count + " CSS variable and responsive value comparisons pass");
