"use strict";
const path = require("node:path"),
	fs = require("node:fs"),
	root = path.resolve(__dirname, "../..");
const packages = process.env.VPM_SYSTEM_INSTALL
	? process.env.VPM_SYSTEM_INSTALL + "/node_modules"
	: root + "/packages";
module.exports = (own, version = "current", browser = false) => {
	const alias = {};
	for (const name of fs.readdirSync(root + "/packages"))
		if (name.startsWith("v")) alias[name] = packages + "/" + name;
	const control = (p) => {
		const base = path.dirname(require.resolve(p));
		return browser && fs.existsSync(base + "/esm") ? base + "/esm" : base;
	};
	alias["@mui/material"] = control(
		version === "current" ? "@mui/material" : "mui-material-app",
	);
	for (const [upstream, replacement, app] of [
		["@mui/system", "vmui-system", "mui-system-app"],
		["@mui/utils", "vmui-utils", "mui-utils-app"],
		["@mui/private-theming", "vmui-private-theming", "mui-private-theming-app"],
		["@mui/styled-engine", "vmui-styled-engine", "mui-styled-engine-app"],
	]) {
		if (!own) {
			alias[upstream] = control(version === "current" ? upstream : app);
			continue;
		}
		const base = packages + "/" + replacement;
		alias[upstream] = base + (browser ? "/index.mjs" : "/index.cjs");
		for (const [key, value] of Object.entries(
			require(base + "/package.json").exports,
		))
			if (key !== "." && key !== "./package.json")
				alias[upstream + key.slice(1)] =
					base +
					"/" +
					(browser ? value.import.default : value.require.default).slice(2);
	}
	if (own)
		for (const name of [
			"react",
			"styled",
			"cache",
			"serialize",
			"utils",
			"hash",
			"memoize",
			"unitless",
			"sheet",
			"weak-memoize",
			"is-prop-valid",
			"use-insertion-effect-with-fallbacks",
		])
			alias["@emotion/" + name] = packages + "/vemotion-" + name;
	return alias;
};
