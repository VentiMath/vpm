"use strict";
const clamp = (v) => Math.max(0, Math.min(1, v));
function hexToRgb(color) {
	if (!/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(color))
		throw new TypeError("Invalid hex color");
	let text = color.slice(1);
	if (text.length < 5) text = [...text].map((c) => c + c).join("");
	const values = text.match(/../g).map((c) => parseInt(c, 16));
	if (values.length === 4) values[3] = Number((values[3] / 255).toFixed(3));
	return `${values.length === 4 ? "rgba" : "rgb"}(${values.join(", ")})`;
}
function decomposeColor(input) {
	if (input && typeof input === "object" && input.type)
		return {
			type: input.type,
			values: [...input.values],
			...(input.colorSpace ? { colorSpace: input.colorSpace } : null),
		};
	if (typeof input !== "string")
		throw new TypeError("Color must be a CSS color string");
	if (input.startsWith("#")) return decomposeColor(hexToRgb(input));
	const m = /^(rgb|rgba|hsl|hsla|color)\((.*)\)$/.exec(input.trim());
	if (!m) throw new TypeError("Unsupported color");
	let body = m[2],
		colorSpace;
	if (m[1] === "color") {
		const match = /^([a-z0-9-]+)\s+(.+)$/.exec(body);
		if (
			!match ||
			!["srgb", "display-p3", "a98-rgb", "prophoto-rgb", "rec-2020"].includes(
				match[1],
			)
		)
			throw new TypeError("Unsupported color space");
		colorSpace = match[1];
		body = match[2];
	}
	const values = body
		.split(/[,\s/]+/)
		.filter(Boolean)
		.map(parseFloat);
	if (
		values.length < 3 ||
		values.length > 4 ||
		values.some((v) => !Number.isFinite(v))
	)
		throw new TypeError("Color channels must be finite");
	return { type: m[1], values, colorSpace };
}
function recomposeColor({ type, values, colorSpace }) {
	const result = values.map((v, i) =>
		type.startsWith("rgb") && i < 3
			? Math.trunc(v)
			: type.startsWith("hsl") && (i === 1 || i === 2)
				? v + "%"
				: v,
	);
	return type === "color"
		? `color(${colorSpace} ${result.slice(0, 3).join(" ")}${result.length === 4 ? " /" + result[3] : ""})`
		: `${type}(${result.join(", ")})`;
}
function hslToRgb(color) {
	const { type, values } = decomposeColor(color),
		[h, s0, l0, a] = values,
		s = s0 / 100,
		l = l0 / 100;
	const c = (1 - Math.abs(2 * l - 1)) * s,
		x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
		m = l - c / 2;
	const sectors = [
		[c, x, 0],
		[x, c, 0],
		[0, c, x],
		[0, x, c],
		[x, 0, c],
		[c, 0, x],
	];
	const rgb = sectors[((Math.floor(h / 60) % 6) + 6) % 6].map((v) =>
		Math.round((v + m) * 255),
	);
	if (a !== undefined) rgb.push(a);
	return recomposeColor({
		type: type === "hsla" ? "rgba" : "rgb",
		values: rgb,
	});
}
function rgbToHex(color) {
	if (color.startsWith("#")) return color;
	const c = decomposeColor(color);
	return (
		"#" +
		c.values
			.map((v, i) =>
				Math.round(i === 3 ? v * 255 : v)
					.toString(16)
					.padStart(2, "0"),
			)
			.join("")
	);
}
function colorChannel(color) {
	const c = decomposeColor(color);
	return c.values
		.slice(0, 3)
		.map((v, i) => (c.type.startsWith("hsl") && i > 0 ? v + "%" : v))
		.join(" ");
}
function alpha(color, value) {
	const c = decomposeColor(color);
	if (c.type === "rgb") c.type = "rgba";
	if (c.type === "hsl") c.type = "hsla";
	c.values[3] = clamp(value);
	return recomposeColor(c);
}
function adjust(color, coefficient, brighten) {
	const c = decomposeColor(color),
		amount = clamp(coefficient),
		indices = c.type.startsWith("hsl") ? [2] : [0, 1, 2],
		max = c.type === "color" ? 1 : c.type.startsWith("hsl") ? 100 : 255;
	for (const i of indices)
		c.values[i] = brighten
			? c.values[i] + (max - c.values[i]) * amount
			: c.values[i] * (1 - amount);
	return recomposeColor(c);
}
const darken = (c, v) => adjust(c, v, false),
	lighten = (c, v) => adjust(c, v, true);
function getLuminance(color) {
	let c = decomposeColor(color);
	if (c.type.startsWith("hsl")) c = decomposeColor(hslToRgb(color));
	const rgb = c.values.slice(0, 3).map((v) => {
		v = c.type === "color" ? v : v / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return Number(
		(rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722).toFixed(3),
	);
}
function getContrastRatio(a, b) {
	a = getLuminance(a);
	b = getLuminance(b);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const emphasize = (c, k = 0.15) =>
	getLuminance(c) > 0.5 ? darken(c, k) : lighten(c, k);
function blend(background, overlay, opacity, gamma = 1) {
	const a = decomposeColor(background),
		b = decomposeColor(overlay);
	return recomposeColor({
		type: "rgb",
		values: a.values
			.slice(0, 3)
			.map(
				(v, i) =>
					(v ** gamma * (1 - opacity) + b.values[i] ** gamma * opacity) **
					(1 / gamma),
			),
	});
}
const api = {
	hexToRgb,
	decomposeColor,
	recomposeColor,
	hslToRgb,
	rgbToHex,
	colorChannel,
	alpha,
	darken,
	lighten,
	getLuminance,
	getContrastRatio,
	emphasize,
	blend,
};
for (const name of ["alpha", "darken", "lighten", "emphasize", "colorChannel"])
	api["private_safe" + name[0].toUpperCase() + name.slice(1)] = (
		color,
		...args
	) => {
		try {
			return api[name](color, ...args);
		} catch {
			return color;
		}
	};
module.exports = api;
