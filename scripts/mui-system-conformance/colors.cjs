"use strict";
const assert = require("node:assert/strict"),
	own = require("../../packages/vmui-system/colors.cjs");
let count = 0;
for (const version of ["@mui/system", "mui-system-app"]) {
	const upstream = require(version);
	for (let i = 0; i < 128; i++)
		for (const color of [
			"#" + ((i * 503 + 17) % 0xffffff).toString(16).padStart(6, "0"),
			`rgba(${i}, ${i * 2}, 128, .3)`,
			`hsl(${i * 2}, 54%, 43%)`,
			"color(display-p3 .2 .4 .6)",
		]) {
			for (const name of [
				"decomposeColor",
				"colorChannel",
				"getLuminance",
				"alpha",
				"darken",
				"lighten",
				"emphasize",
			]) {
				const args = [color, (i % 9) / 8];
				assert.deepEqual(
					own[name](...args),
					upstream[name](...args),
					name + " " + color,
				);
				count++;
			}
		}
}
console.log(count + " color comparisons pass");
