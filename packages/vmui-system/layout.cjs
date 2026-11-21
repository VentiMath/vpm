"use strict";
const React = require("react"),
	{ styled, useTheme, useThemeProps } = require("./react.cjs"),
	{ merge } = require("./theme.cjs"),
	{ handleBreakpoints, unstable_extendSxProp } = require("./sx.cjs");
const cls = (...items) => items.filter(Boolean).join(" "),
	cap = (s) => s[0].toUpperCase() + s.slice(1);
const getContainerUtilityClass = (slot) => "MuiContainer-" + slot,
	containerClasses = Object.fromEntries(
		[
			"root",
			"disableGutters",
			"fixed",
			"maxWidthXs",
			"maxWidthSm",
			"maxWidthMd",
			"maxWidthLg",
			"maxWidthXl",
		].map((slot) => [slot, getContainerUtilityClass(slot)]),
	);
function createContainer({
	createStyledComponent = styled("div", { name: "MuiContainer", slot: "Root" }),
	useThemeProps: themeProps = (props) =>
		useThemeProps({ props, name: "MuiContainer" }),
	componentName = "MuiContainer",
} = {}) {
	const Root = createStyledComponent(({ theme, ownerState: s }) => {
		let styles = {
			width: "100%",
			marginLeft: "auto",
			boxSizing: "border-box",
			marginRight: "auto",
			...(!s.disableGutters
				? {
						paddingLeft: theme.spacing(2),
						paddingRight: theme.spacing(2),
						[theme.breakpoints.up("sm")]: {
							paddingLeft: theme.spacing(3),
							paddingRight: theme.spacing(3),
						},
					}
				: null),
		};
		if (s.fixed)
			for (const key of theme.breakpoints.keys) {
				const value = theme.breakpoints.values[key];
				if (value)
					styles = merge(styles, {
						[theme.breakpoints.up(key)]: {
							maxWidth: value + theme.breakpoints.unit,
						},
					});
			}
		if (s.maxWidth)
			styles = merge(styles, {
				[theme.breakpoints.up(s.maxWidth)]: {
					maxWidth:
						(s.maxWidth === "xs"
							? Math.max(theme.breakpoints.values.xs, 444)
							: theme.breakpoints.values[s.maxWidth]) + theme.breakpoints.unit,
				},
			});
		return styles;
	});
	return React.forwardRef(function Container(input, ref) {
		const {
				className,
				component = "div",
				disableGutters = false,
				fixed = false,
				maxWidth = "lg",
				classes = {},
				...props
			} = themeProps(input),
			ownerState = { ...input, component, disableGutters, fixed, maxWidth };
		const slots = [
			"root",
			maxWidth && "maxWidth" + cap(maxWidth),
			fixed && "fixed",
			disableGutters && "disableGutters",
		];
		return React.createElement(Root, {
			as: component,
			...props,
			ref,
			ownerState,
			className: cls(
				...slots
					.filter(Boolean)
					.map((k) => cls(componentName + "-" + k, classes[k])),
				className,
			),
		});
	});
}
const getStackUtilityClass = (slot) => "MuiStack-" + slot,
	stackClasses = { root: "MuiStack-root" };
function responsiveValues(value, theme) {
	if (Array.isArray(value))
		return Object.fromEntries(
			value
				.map((v, i) => [theme.breakpoints.keys[i], v])
				.filter(([, v]) => v != null),
		);
	return value && typeof value === "object"
		? value
		: { [theme.breakpoints.keys[0]]: value };
}
const stackSides = {
	row: "Left", "row-reverse": "Right", column: "Top", "column-reverse": "Bottom",
};
function stackSpacing(theme, direction, spacing, useFlexGap) {
	const gap = typeof spacing === "number" ? theme.spacing(spacing) : spacing;
	if (useFlexGap) return { gap };
	return {
		"& > :not(style):not(style)": { margin: 0 },
		...(gap != null && { "& > :not(style) ~ :not(style)": { ["margin" + stackSides[direction]]: gap } }),
	};
}
function stackStyle({ theme, ownerState: s }) {
	const responsiveDirection = s.direction != null && typeof s.direction === "object";
	const responsiveSpacing = s.spacing != null && typeof s.spacing === "object";
	let direction = responsiveDirection ? "column" : s.direction;
	const base = { display: "flex", flexDirection: direction };
	if (!responsiveDirection && !responsiveSpacing) {
		return s.spacing ? { ...base, ...stackSpacing(theme, direction, s.spacing, s.useFlexGap) } : base;
	}
	const directions = responsiveDirection ? responsiveValues(s.direction, theme) : {};
	const spaces = responsiveSpacing ? responsiveValues(s.spacing, theme) : {};
	let spacing = responsiveSpacing ? undefined : s.spacing;
	for (const key of theme.breakpoints.keys) {
		if (directions[key] == null && spaces[key] == null) continue;
		direction = directions[key] ?? direction;
		spacing = spaces[key] ?? spacing;
		base[theme.breakpoints.up(key)] = {
			...(directions[key] != null && { flexDirection: direction }),
			...(s.spacing && stackSpacing(theme, direction, spacing, s.useFlexGap)),
		};
	}
	return base;
}
function createStack({
	createStyledComponent = styled("div", { name: "MuiStack", slot: "Root" }),
	useThemeProps: themeProps = (props) =>
		useThemeProps({ props, name: "MuiStack" }),
	componentName = "MuiStack",
} = {}) {
	const Root = createStyledComponent(stackStyle);
	return React.forwardRef(function Stack(input, ref) {
		const {
				component = "div",
				direction = "column",
				spacing = 0,
				divider,
				useFlexGap = false,
				children,
				className,
				...props
			} = unstable_extendSxProp(themeProps(input)),
			ownerState = { direction, spacing, useFlexGap };
		const content = divider
			? React.Children.toArray(children).filter(Boolean).flatMap((child, i) =>
					i
						? [React.cloneElement(divider, { key: "separator-" + i }), child]
						: [child],
				)
			: children;
		return React.createElement(
			Root,
			{
				as: component,
				...props,
				ownerState,
				ref,
				className: cls(componentName + "-root", className),
			},
			content,
		);
	});
}
const getGridUtilityClass = (slot) => "MuiGrid-" + slot;
const defaultBreakpoints = ["xs", "sm", "md", "lg", "xl"];
const gridSlots = [
	"root", "container",
	...Array.from({length:11}, (_, n) => "spacing-xs-" + n),
	...["row", "row-reverse", "column", "column-reverse"].map(d => "direction-xs-" + d),
	...["wrap", "nowrap", "wrap-reverse"].map(w => "wrap-xs-" + w),
	...defaultBreakpoints.flatMap(key => ["auto", "true", ...Array.from({length:12}, (_, i) => i+1)]
		.map(size => "grid-" + key + "-" + size)),
];
const gridClasses = Object.freeze(Object.fromEntries(gridSlots.map(k => [k,getGridUtilityClass(k)])));
function generateSizeClassNames(size) {
	return Object.entries(size || {})
		.filter(([, v]) => v !== false && v != null)
		.map(([key, v]) => `grid-${key}-${v}`);
}
function generateSpacingClassNames(value, smallest = "xs") {
	if (value == null || Array.isArray(value)) return [];
	return typeof value === "object"
		? Object.entries(value)
				.filter(([, v]) => Number(v) > 0)
				.map(([k, v]) => `spacing-${k}-${v}`)
		: Number(value) > 0
			? [`spacing-${smallest}-${value}`]
			: [];
}
function generateDirectionClasses(value) {
	return typeof value === "object"
		? Object.entries(value).map(([k, v]) => `direction-${k}-${v}`)
		: value
			? [`direction-xs-${value}`]
			: [];
}
function eachGridBreakpoint(breakpoints, value, visit) {
	if (value == null) return;
	if (typeof value !== "object") {
		visit(0, value);
		return;
	}
	const keys = breakpoints.keys, array = Array.isArray(value);
	for (let i = 0; i < keys.length; i++) {
		const entry = array ? value[i] : value[keys[i]];
		if (entry != null) visit(i, entry);
	}
}
function traverseBreakpoints(breakpoints, value, iterator) {
	eachGridBreakpoint(breakpoints, value, (index, entry) => {
		const query = index && breakpoints.up(breakpoints.keys[index]);
		iterator((target, style) => Object.assign(target, query ? { [query]: style } : style), entry);
	});
}
function gridStyle({ theme, ownerState: s }) {
	let styles = { minWidth: 0, boxSizing: "border-box" };
	if (s.container)
		styles = {
			...styles,
			display: "flex",
			flexWrap: s.wrap,
			gap: "var(--Grid-rowSpacing) var(--Grid-columnSpacing)",
		};
	// Multiple props can introduce different breakpoints. Emit the shared rules
	// in increasing width order so later props cannot reverse the cascade.
	const media = [];
	const apply = (value, fn) =>
		eachGridBreakpoint(theme.breakpoints, value, (index, entry) => {
			const block = index ? (media[index] ??= {}) : styles;
			const rules = fn(entry);
			for (const property of Object.keys(rules)) {
				if (property === "> *") Object.assign(block[property] ??= {}, rules[property]);
				else block[property] = rules[property];
			}
		});
	if (s.container) {
		styles["--Grid-columns"] = 12;
		apply(s.columns, (v) => ({
			"--Grid-columns": v,
			"> *": { "--Grid-parent-columns": v },
		}));
		apply(s.rowSpacing, (v) => ({
			"--Grid-rowSpacing": typeof v === "string" ? v : theme.spacing(v),
			"> *": {
				"--Grid-parent-rowSpacing":
					typeof v === "string" ? v : theme.spacing(v),
			},
		}));
		apply(s.columnSpacing, (v) => ({
			"--Grid-columnSpacing": typeof v === "string" ? v : theme.spacing(v),
			"> *": {
				"--Grid-parent-columnSpacing":
					typeof v === "string" ? v : theme.spacing(v),
			},
		}));
		apply(s.direction, (v) => ({ flexDirection: v }));
	}
	apply(s.size, (v) =>
		v === "grow"
			? { flexBasis: 0, flexGrow: 1, maxWidth: "100%" }
			: v === "auto"
				? {
						flexBasis: "auto",
						flexGrow: 0,
						flexShrink: 0,
						maxWidth: "none",
						width: "auto",
					}
				: v === false
					? {}
					: {
							flexGrow: 0,
							flexBasis: "auto",
							width: `calc(100% * ${v} / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - ${v}) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))`,
						},
	);
	apply(s.offset, (v) => ({
		marginLeft:
			v === "auto"
				? "auto"
				: v === 0
					? "0px"
					: `calc(100% * ${v} / var(--Grid-parent-columns) + var(--Grid-parent-columnSpacing) * ${v} / var(--Grid-parent-columns))`,
	}));
	for (let i = 1; i < media.length; i++) {
		if (media[i]) styles[theme.breakpoints.up(theme.breakpoints.keys[i])] = media[i];
	}
	return styles;
}
function createGrid({
	createStyledComponent = styled("div", { name: "MuiGrid", slot: "Root" }),
	useThemeProps: themeProps = (props) =>
		useThemeProps({ props, name: "MuiGrid" }),
	useTheme: themeHook = useTheme,
	componentName = "MuiGrid",
} = {}) {
	const Root = createStyledComponent(gridStyle);
	const Grid = React.forwardRef(function GridRoot(input, ref) {
		const theme = themeHook(),
			{
				component = "div",
				container = false,
				direction = "row",
				wrap = "wrap",
				unstable_level: level = 0,
				columns = level === 0 ? 12 : undefined,
				spacing,
				rowSpacing = spacing ?? (level === 0 ? 0 : undefined),
				columnSpacing = spacing ?? (level === 0 ? 0 : undefined),
				size = {},
				offset = {},
				className,
				children,
				...props
			} = themeProps(input);
		const ownerState = {
			container,
			direction,
			wrap,
			columns,
			rowSpacing,
			columnSpacing,
			size: responsiveValues(size, theme),
			offset: responsiveValues(offset, theme),
		};
		const slots = [
			"root",
			container && "container",
			wrap !== "wrap" && "wrap-xs-" + wrap,
			...generateDirectionClasses(direction),
			...generateSizeClassNames(ownerState.size),
			...(container ? generateSpacingClassNames(spacing) : []),
		];
		return React.createElement(
			Root,
			{
				as: component,
				...props,
				ref,
				ownerState,
				className: cls(
					...slots.filter(Boolean).map((s) => componentName + "-" + s),
					className,
				),
			},
			container ? React.Children.map(children, child =>
				React.isValidElement(child) && child.type?.muiName === "Grid" && child.props.container
					? React.cloneElement(child, {unstable_level: level + 1})
					: child
			) : children,
		);
	});
	Grid.muiName = "Grid";
	return Grid;
}
module.exports = {
	createContainer,
	Container: createContainer(),
	containerClasses,
	getContainerUtilityClass,
	createStack,
	Stack: createStack(),
	stackClasses,
	getStackUtilityClass,
	createGrid,
	Grid: createGrid(),
	gridClasses,
	getGridUtilityClass,
	unstable_generateSizeClassNames: generateSizeClassNames,
	unstable_generateSpacingClassNames: generateSpacingClassNames,
	unstable_generateDirectionClasses: generateDirectionClasses,
	unstable_traverseBreakpoints: traverseBreakpoints,
};
