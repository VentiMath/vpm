"use strict";
const { deepmerge, isPlainObject } = require("vmui-utils");
const DEFAULT_BREAKPOINTS = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 };
function createBreakpoints({
	values = DEFAULT_BREAKPOINTS,
	unit = "px",
	step = 5,
	...extra
} = {}) {
	const entries = Object.entries(values).sort((a, b) => a[1] - b[1]);
	if (
		!entries.length ||
		!Number.isFinite(step) ||
		step < 0 ||
		entries.some(([, v]) => !Number.isFinite(v))
	)
		throw new TypeError(
			"Breakpoints require finite values and a nonnegative step",
		);
	const keys = entries.map(([key]) => key),
		ordered = Object.fromEntries(entries);
	const value = (key) => (Object.hasOwn(ordered, key) ? ordered[key] : key);
	const up = (key) => `@media (min-width:${value(key)}${unit})`;
	const down = (key) => `@media (max-width:${value(key) - step / 100}${unit})`;
	const between = (a, b) =>
		`${up(a)} and (max-width:${value(b) - step / 100}${unit})`;
	const only = (key) => {
		const i = keys.indexOf(key);
		return i >= 0 && i < keys.length - 1 ? between(key, keys[i + 1]) : up(key);
	};
	const not = (key) => {
		const i = keys.indexOf(key);
		return i === 0
			? up(keys[1])
			: i === keys.length - 1
				? down(key)
				: only(key).replace("@media", "@media not all and");
	};
	return {
		keys,
		values: ordered,
		up,
		down,
		between,
		only,
		not,
		unit,
		...extra,
		internal_mediaKeys: keys.map(up),
	};
}
function createUnaryUnit(theme, name, defaultValue) {
	const base = getPath(theme, name) ?? defaultValue;
	if (typeof base === "function") return base;
	if (typeof base === "number")
		return (value) => (typeof value === "string" ? value : value * base);
	if (Array.isArray(base))
		return (value) =>
			typeof value === "string"
				? value
				: value < 0
					? -base[-value]
					: base[value];
	if (typeof base === "string")
		return (value) =>
			typeof value === "string"
				? value
				: base.startsWith("var(") && value === 0
					? "0px"
					: base.startsWith("var(") && value === 1
						? base
						: `calc(${value} * ${base})`;
	throw new TypeError(
		"Spacing requires a number, CSS value, array or function",
	);
}
function getValue(transform, value) {
	if (value === undefined || value === null || typeof value === "string")
		return value;
	return transform(value);
}
function createSpacing(input = 8, transform) {
	if (typeof input === "function" && input.mui) return input;
	const convert =
		transform || createUnaryUnit({ spacing: input }, "spacing", 8);
	const spacing = (...values) =>
		(values.length ? values : [1])
			.map((v) => {
				const result = convert(v);
				return typeof result === "number" ? `${result}px` : result;
			})
			.join(" ");
	spacing.mui = true;
	return spacing;
}
function cssContainerQueries(theme) {
	const make = (name) => {
		const replace = (text) =>
			text
				.replace("@media", "@container" + (name ? " " + name : ""))
				.replace("not all and ", "not ");
		return Object.fromEntries(
			["up", "down", "between", "only", "not"].map((key) => [
				key,
				(...args) => replace(theme.breakpoints[key](...args)),
			]),
		);
	};
	const containerQueries = Object.assign(make, make());
	return { ...theme, containerQueries };
}
function applyStyles(mode, styles) {
	if (this.vars && typeof this.getColorSchemeSelector === "function") {
		if (this.colorSchemes && !Object.hasOwn(this.colorSchemes, mode)) return {};
		const selector = this.getColorSchemeSelector(mode);
		if (selector === "&") return styles;
		return {
			[selector.startsWith("@")
				? selector
				: `*:where(${selector.replace(/&/g, "")}) &`]: styles,
		};
	}
	return this.palette?.mode === mode ? styles : {};
}
function createTheme(options = {}, ...more) {
	const { breakpoints, spacing, palette, shape, ...rest } = options;
	let theme = {
		breakpoints: createBreakpoints(breakpoints),
		direction: "ltr",
		components: {},
		palette: { mode: "light", ...palette },
		spacing: createSpacing(spacing),
		shape: { borderRadius: 4, ...shape },
	};
	theme = cssContainerQueries(deepmerge(theme, rest));
	theme.applyStyles = applyStyles;
	for (const item of more) theme = deepmerge(theme, item);
	const sx = require("./sx.cjs");
	theme.unstable_sxConfig = {
		...sx.unstable_defaultSxConfig,
		...theme.unstable_sxConfig,
	};
	theme.unstable_sx = function (value) {
		return sx.unstable_styleFunctionSx({ sx: value, theme: this });
	};
	theme.internal_cache = {};
	return theme;
}
function getPath(object, path, checkVars = true) {
	if (typeof path !== "string" || !object) return null;
	const read = (start) =>
		path
			.split(".")
			.reduce(
				(out, key) =>
					out != null && Object.hasOwn(Object(out), key) ? out[key] : undefined,
				start,
			);
	if (checkVars && object.vars) {
		const value = read(object.vars);
		if (value !== undefined) return value;
	}
	return read(object);
}
module.exports = {
	createBreakpoints,
	createSpacing,
	createUnaryUnit,
	createUnarySpacing: (theme) => createUnaryUnit(theme, "spacing", 8),
	getValue,
	cssContainerQueries,
	createTheme,
	getPath,
	shape: { borderRadius: 4 },
	isPlainObject,
	merge: deepmerge,
};
