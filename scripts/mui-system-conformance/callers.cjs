"use strict";
const assert = require("node:assert/strict"),
	base = require("./build.cjs");
// Generated Emotion names may differ with equivalent independent interpolation
// structure. Preserve their one-to-one identities and compare all CSS/HTML.
function normalize(html) {
	// Upstream Stylis invents this property through a hash collision; VPM's
	// documented prefixer fix omits it. It has no CSS effect in the browser gate.
	html = html.replaceAll(/-webkit-print-color-scheme:(?:light|dark);/g, "");
	const ids = new Map();
	for (const m of html.matchAll(/data-emotion="([^ ]+) ([^"]+)"/g))
		if (!ids.has(m[1] + " " + m[2])) ids.set(m[1] + " " + m[2], ids.size);
	for (const [key, index] of ids) {
		const [prefix, id] = key.split(" ");
		html = html
			.replaceAll(prefix + "-" + id, prefix + "-HASH" + index)
			.replaceAll(
				'data-emotion="' + key + '"',
				'data-emotion="' + prefix + " HASH" + index + '"',
			);
	}
	// Attribute order has no DOM semantics. Preserve all names and values.
	return html.replace(
		/<([a-z][a-z0-9-]*)(\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?>/gi,
		(tag, name, attrs) => {
			if (!attrs) return tag;
			const values = (
				attrs.match(/[^\s=]+(?:="[^"]*"|='[^']*')?/g) || []
			).filter((value) => value !== "/");
			return (
				"<" +
				name +
				" " +
				values.sort().join(" ") +
				(attrs.trimEnd().endsWith("/") ? " /" : "") +
				">"
			);
		},
	);
}
let count = 0;
for (const version of ["current", "app"])
	for (const color of ["#123456", "#abcdef"])
		for (const compact of [false, true])
			for (const variables of [false, true]) {
				const a = normalize(
						require(base + "/" + version + "-vpm/caller.cjs").run(
							color,
							compact,
							variables,
						),
					),
					b = normalize(
						require(base + "/" + version + "-upstream/caller.cjs").run(
							color,
							compact,
							variables,
						),
					);
				if (a !== b) {
					require("node:fs").writeFileSync(
						"/private/tmp/vpm-system-ssr.json",
						JSON.stringify({ actual: a, expected: b }),
					);
					let i = 0;
					while (a[i] === b[i] && i < a.length) i++;
					throw Error(
						version +
							" cssVariables=" +
							variables +
							" first difference at " +
							i +
							"\nactual: " +
							a.slice(Math.max(0, i - 70), i + 250) +
							"\nexpected: " +
							b.slice(Math.max(0, i - 70), i + 250),
					);
				}
				count++;
			}
console.log(
	count + " unchanged MUI Material form/menu/tab/dialog SSR snapshots match",
);
