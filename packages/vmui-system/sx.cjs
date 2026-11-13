"use strict";
const {
	getPath,
	createBreakpoints,
	createUnaryUnit,
	getValue,
	merge,
	isPlainObject,
} = require("./theme.cjs");
const { unstable_fastDeepAssign: assignStyles } = require("vmui-utils");
const put = (object, key, value) => {
	if (key === "__proto__")
		Object.defineProperty(object, key, {
			value,
			enumerable: true,
			writable: true,
			configurable: true,
		});
	else object[key] = value;
};
const defaults = createBreakpoints(),
	config = {};
const identity = (v) => v,
	sizingTransform = (v) => (v <= 1 && v !== 0 ? `${v * 100}%` : v);
const borderTransform = (v) => (typeof v === "number" ? `${v}px solid` : v);
const paletteTransform = (resolved, original) =>
	original === "grey" ? original : resolved;
const spacingNames = {};
for (const [short, long] of [
	["m", "margin"],
	["p", "padding"],
]) {
	for (const [suffix, properties] of Object.entries({
		"": [long],
		t: [long + "Top"],
		r: [long + "Right"],
		b: [long + "Bottom"],
		l: [long + "Left"],
		x: [long + "Left", long + "Right"],
		y: [long + "Top", long + "Bottom"],
	}))
		spacingNames[short + suffix] = properties;
	for (const suffix of [
		"",
		"Top",
		"Right",
		"Bottom",
		"Left",
		"Inline",
		"InlineStart",
		"InlineEnd",
		"Block",
		"BlockStart",
		"BlockEnd",
	])
		spacingNames[long + suffix] = [long + suffix];
	spacingNames[long + "X"] = [long + "Left", long + "Right"];
	spacingNames[long + "Y"] = [long + "Top", long + "Bottom"];
}
const groups = {
	borders: [
		"border",
		"borderTop",
		"borderRight",
		"borderBottom",
		"borderLeft",
		"borderColor",
		"borderTopColor",
		"borderRightColor",
		"borderBottomColor",
		"borderLeftColor",
		"outline",
		"outlineColor",
		"borderRadius",
	],
	palette: ["color", "bgcolor", "backgroundColor"],
	display: [
		"displayPrint",
		"display",
		"overflow",
		"textOverflow",
		"visibility",
		"whiteSpace",
	],
	flexbox: [
		"flexBasis",
		"flexDirection",
		"flexWrap",
		"justifyContent",
		"alignItems",
		"alignContent",
		"order",
		"flex",
		"flexGrow",
		"flexShrink",
		"alignSelf",
		"justifyItems",
		"justifySelf",
	],
	grid: [
		"gap",
		"rowGap",
		"columnGap",
		"gridColumn",
		"gridRow",
		"gridAutoFlow",
		"gridAutoColumns",
		"gridAutoRows",
		"gridTemplateColumns",
		"gridTemplateRows",
		"gridTemplateAreas",
		"gridArea",
	],
	positions: ["position", "zIndex", "top", "right", "bottom", "left"],
	shadows: ["boxShadow"],
	sizing: [
		"width",
		"maxWidth",
		"minWidth",
		"height",
		"maxHeight",
		"minHeight",
		"boxSizing",
	],
	typography: [
		"font",
		"fontFamily",
		"fontSize",
		"fontStyle",
		"fontWeight",
		"letterSpacing",
		"textTransform",
		"lineHeight",
		"textAlign",
		"typography",
	],
};
for (const keys of Object.values(groups))
	for (const key of keys) config[key] = {};
for (const key of groups.borders)
	config[key] = key.endsWith("Color")
		? { themeKey: "palette" }
		: key === "borderRadius"
			? {}
			: { themeKey: "borders", transform: borderTransform };
for (const key of groups.palette)
	config[key] = {
		themeKey: "palette",
		transform: paletteTransform,
		...(key === "bgcolor" ? { cssProperty: "backgroundColor" } : null),
	};
for (const key of ["width", "minWidth", "height", "maxHeight", "minHeight"])
	config[key] = { transform: sizingTransform };
for (const key of ["fontFamily", "fontSize", "fontStyle", "fontWeight"])
	config[key] = { themeKey: "typography" };
config.font = { themeKey: "font" };
config.typography = { cssProperty: false, themeKey: "typography" };
config.zIndex = { themeKey: "zIndex" };
config.boxShadow = { themeKey: "shadows" };
config.displayPrint = {
	cssProperty: false,
	transform: (v) => ({ "@media print": { display: v } }),
};
for (const key of Object.keys(spacingNames))
	config[key] = { style: (props) => spacing(props) };
function breakpointState(props) {
	return props.theme?.breakpoints || defaults;
}
function handleBreakpoints(props, value, callback) {
	const bp = breakpointState(props),
		out = {};
	if (Array.isArray(value)) {
		value.forEach((v, i) => {
			if (i >= bp.keys.length)
				throw new RangeError("Responsive array exceeds configured breakpoints");
			out[bp.up(bp.keys[i])] = callback(v, bp.keys[i]);
		});
		return out;
	}
	if (isPlainObject(value)) {
		for (const [key, v] of Object.entries(value)) {
			if (Object.hasOwn(bp.values, key)) out[bp.up(key)] = callback(v, key);
			else if (key.startsWith("@")) {
				const [size, name] = key.slice(1).split("/");
				const cq = props.theme?.containerQueries;
				if (cq)
					out[cq(name).up(/^\d/.test(size) ? Number(size) : size)] = callback(
						v,
						key,
					);
				else put(out, key, v);
			} else
				Object.defineProperty(out, key, {
					value: v,
					writable: true,
					enumerable: true,
					configurable: true,
				});
		}
		return out;
	}
	return callback(value);
}
function getStyleValue(mapping, transform, value, userValue = value) {
	let result;
	if (typeof mapping === "function") result = mapping(value);
	else result = getPath(mapping, String(value)) ?? value;
	return transform ? transform(result, userValue, mapping) : result;
}
function style({ prop, cssProperty = prop, themeKey, transform }) {
	const fn = (props) => {
		const value = props[prop];
		if (value == null) return null;
		const theme = props.theme || {},
			mapping = getPath(theme, themeKey) || {};
		return handleBreakpoints(props, value, (v) => {
			let actual = getStyleValue(mapping, transform, v);
			if (
				actual === v &&
				typeof v === "string" &&
				themeKey &&
				!Object.hasOwn(mapping, v)
			)
				actual = getStyleValue(
					mapping,
					transform,
					`${prop}${v === "default" ? "" : v[0]?.toUpperCase() + v.slice(1)}`,
					v,
				);
			if (
				actual === `${prop}${String(v)[0]?.toUpperCase() + String(v).slice(1)}`
			)
				actual = v;
			return cssProperty === false
				? isPlainObject(actual)
					? actual
					: null
				: { [cssProperty]: actual };
		});
	};
	fn.filterProps = [prop];
	return fn;
}
function spacing(props) {
	const out = {},
		transform = createUnaryUnit(props.theme || {}, "spacing", 8);
	for (const key of Object.keys(props))
		if (spacingNames[key] && props[key] != null) {
			const result = handleBreakpoints(props, props[key], (v) =>
				Object.fromEntries(
					spacingNames[key].map((name) => [name, getValue(transform, v)]),
				),
			);
			assignStyles(out, result);
		}
	return out;
}
spacing.filterProps = Object.keys(spacingNames);
function unitStyle(key, base, defaultValue) {
	const fn = (props) =>
		props[key] == null
			? null
			: handleBreakpoints(props, props[key], (v) => ({
					[key]: getValue(
						createUnaryUnit(props.theme || {}, base, defaultValue),
						v,
					),
				}));
	fn.filterProps = [key];
	return fn;
}
const borderRadius = unitStyle("borderRadius", "shape.borderRadius", 4);
// Nested theme paths need a scalar base rather than a literal property lookup.
config.borderRadius = {
	style: (props) =>
		props.borderRadius == null
			? null
			: handleBreakpoints(props, props.borderRadius, (v) => ({
					borderRadius: getValue(
						createUnaryUnit(
							{ radius: getPath(props.theme, "shape.borderRadius") ?? 4 },
							"radius",
							4,
						),
						v,
					),
				})),
};
for (const key of ["gap", "rowGap", "columnGap"])
	config[key] = { style: unitStyle(key, "spacing", 8) };
config.maxWidth = {
	style: (props) =>
		props.maxWidth == null
			? null
			: handleBreakpoints(props, props.maxWidth, (v) => ({
					maxWidth: breakpointState(props).values[v] || sizingTransform(v),
				})),
};
function breakpoints(styleFunction) {
	const fn = (props) => {
		const bp = breakpointState(props);
		let result = styleFunction(props) || {};
		for (const key of bp.keys)
			if (props[key] != null)
				result = merge(result, {
					[bp.up(key)]: styleFunction({ theme: props.theme, ...props[key] }),
				});
		return result;
	};
	fn.filterProps = [...defaults.keys, ...(styleFunction.filterProps || [])];
	return fn;
}
function resolveBreakpointValues({
	values,
	breakpoints = defaults.values,
	base,
}) {
	const keys = Object.keys(breakpoints);
	if (!base) {
		if (Array.isArray(values))
			base = Object.fromEntries(
				keys.slice(0, values.length).map((k) => [k, true]),
			);
		else if (values && typeof values === "object")
			base = Object.fromEntries(
				keys.filter((k) => values[k] != null).map((k) => [k, true]),
			);
		else return values;
	}
	const out = {};
	let prior;
	for (const key of Object.keys(base)) {
		const value = Array.isArray(values)
			? values[keys.indexOf(key)]
			: values && typeof values === "object"
				? values[key]
				: values;
		if (value != null || values === null) prior = value;
		put(out, key, prior);
	}
	return out;
}
function mergeBreakpointsInOrder(breakpoints, ...styles) {
	let out = {};
	for (const value of styles) out = merge(out, value || {});
	return orderMedia(out, breakpoints);
}
function orderMedia(out, bp) {
	const sorted = {};
	for (const key of bp.internal_mediaKeys || bp.keys.map(bp.up))
		if (out[key] && Object.keys(out[key]).length) put(sorted, key, out[key]);
	for (const key of Object.keys(out))
		if (
			!Object.hasOwn(sorted, key) &&
			(!(bp.internal_mediaKeys || bp.keys.map(bp.up)).includes(key) ||
				(out[key] && Object.keys(out[key]).length))
		)
			put(sorted, key, out[key]);
	return sorted;
}
function styleFunctionSx({ sx, theme = {} }) {
	const visit = (value) => {
		if (typeof value === "function") value = value(theme);
		if (value == null) return null;
		if (Array.isArray(value)) return value.map(process);
		if (typeof value !== "object") return value;
		let out = {};
		const cfg =
			theme.unstable_sxConfig || exportsObject.unstable_defaultSxConfig;
		for (const [key, raw] of Object.entries(value)) {
			const v = typeof raw === "function" ? raw(theme) : raw;
			if (v == null) continue;
			const rule = Object.hasOwn(cfg, key) ? cfg[key] : undefined;
			if (rule) {
				const result = rule.style
					? rule.style({ theme, [key]: v })
					: style({ prop: key, ...rule })({ theme, [key]: v });
				assignStyles(out, result || {});
			} else if (typeof v === "object") {
				const responsive = handleBreakpoints({ theme }, v, (x) => ({
					[key]: x,
				}));
				if (Object.keys(responsive).every((k) => Object.hasOwn(v, k)))
					put(out, key, process(v));
				else assignStyles(out, responsive);
			} else
				Object.defineProperty(out, key, {
					value: v,
					writable: true,
					enumerable: true,
					configurable: true,
				});
		}
		return orderMedia(out, theme.breakpoints || defaults);
	};
	const active = new Set();
	const process = (value) => {
		if (typeof value === "function") value = value(theme);
		if (!value || typeof value !== "object") return visit(value);
		if (active.has(value))
			throw new TypeError("Cyclic sx values are not supported");
		active.add(value);
		try {
			return visit(value);
		} finally {
			active.delete(value);
		}
	};
	return process(sx);
}
styleFunctionSx.filterProps = ["sx"];
function extendSxProp(props) {
	const { sx, ...other } = props,
		system = {},
		rest = {},
		cfg =
			props.theme?.unstable_sxConfig || exportsObject.unstable_defaultSxConfig;
	for (const key of Object.keys(other))
		Object.defineProperty(Object.hasOwn(cfg, key) ? system : rest, key, {
			value: other[key],
			writable: true,
			enumerable: true,
			configurable: true,
		});
	const merged = Array.isArray(sx)
		? [system, ...sx]
		: typeof sx === "function"
			? (theme) => ({ ...system, ...sx(theme) })
			: { ...system, ...sx };
	return { ...rest, sx: merged };
}
function compose(...functions) {
	const result = (props) =>
		functions.reduce((out, fn) => merge(out, fn(props) || {}), {});
	result.filterProps = functions.flatMap((f) => f.filterProps || []);
	return result;
}
const exportsObject = {
	breakpoints,
	unstable_styleFunctionSx: styleFunctionSx,
	unstable_createStyleFunctionSx: () => styleFunctionSx,
	unstable_defaultSxConfig: { ...config },
	unstable_extendSxProp: extendSxProp,
	extendSxProp,
	style,
	getStyleValue,
	handleBreakpoints,
	mergeBreakpointsInOrder,
	compose,
	spacing,
	borderTransform,
	paletteTransform,
	sizingTransform,
};
for (const [group, keys] of Object.entries(groups)) {
	const fns = keys.map((key) => {
		const rule = config[key];
		const fn = rule.style || style({ prop: key, ...rule });
		fn.filterProps = [key];
		exportsObject[key === "typography" ? "typographyVariant" : key] = fn;
		return fn;
	});
	exportsObject[group] = compose(...fns);
}
exportsObject.marginKeys = Object.keys(spacingNames).filter((k) =>
	k.startsWith("m"),
);
exportsObject.paddingKeys = Object.keys(spacingNames).filter((k) =>
	k.startsWith("p"),
);
for (const name of ["margin", "padding"]) {
	const keys = exportsObject[name + "Keys"];
	exportsObject[name] = (props) =>
		spacing(
			Object.fromEntries(
				Object.entries(props).filter(
					([k]) => k === "theme" || keys.includes(k),
				),
			),
		);
	exportsObject[name].filterProps = keys;
}
exportsObject.unstable_resolveBreakpointValues = resolveBreakpointValues;
module.exports = exportsObject;
