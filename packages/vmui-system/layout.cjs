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
function stackStyle({ theme, ownerState: s }) {
	const directions = responsiveValues(s.direction, theme),
		spaces = responsiveValues(s.spacing, theme);
	let direction = "column",
		spacing = 0,
		styles = { display: "flex", flexDirection: "column" };
	for (let i = 0; i < theme.breakpoints.keys.length; i++) {
		const key = theme.breakpoints.keys[i];
		if (directions[key] == null && spaces[key] == null) continue;
		direction = directions[key] ?? direction;
		spacing = spaces[key] ?? spacing;
		const gap = typeof spacing === "string" ? spacing : theme.spacing(spacing),
			side = {
				row: "Left",
				"row-reverse": "Right",
				column: "Top",
				"column-reverse": "Bottom",
			}[direction];
		const item = {
			flexDirection: direction,
			...(s.useFlexGap
				? { gap }
				: {
						"& > :not(style):not(style)": { margin: 0 },
						"& > :not(style) ~ :not(style)": { ["margin" + side]: gap },
					}),
		};
		styles = merge(
			styles,
			i === 0 ? item : { [theme.breakpoints.up(key)]: item },
		);
	}
	return styles;
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
		const nodes = React.Children.toArray(children).filter(Boolean);
		const content = divider
			? nodes.flatMap((child, i) =>
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
const getGridUtilityClass = (slot) => "MuiGrid-" + slot,
	gridClasses = Object.fromEntries(
		[
			"root",
			"container",
			"direction-xs-column",
			"direction-xs-column-reverse",
			"direction-xs-row-reverse",
			"wrap-xs-nowrap",
			"wrap-xs-wrap-reverse",
		].map((k) => [k, getGridUtilityClass(k)]),
	);
const GridContext = React.createContext(null);
function generateSizeClassNames(size) {
	return Object.entries(size || {})
		.filter(([, v]) => v !== false && v != null)
		.map(([key, v]) => `grid-${key}-${v}`);
}
function generateSpacingClassNames(value, smallest = "xs") {
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
function traverseBreakpoints(breakpoints, value, iterator) {
	const values = Array.isArray(value)
		? Object.fromEntries(value.map((v, i) => [breakpoints.keys[i], v]))
		: value && typeof value === "object"
			? value
			: { [breakpoints.keys[0]]: value };
	for (const key of breakpoints.keys)
		if (values[key] != null)
			iterator(
				(target, style) =>
					Object.assign(
						target,
						key === breakpoints.keys[0]
							? style
							: { [breakpoints.up(key)]: style },
					),
				values[key],
			);
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
	const apply = (value, fn) =>
		traverseBreakpoints(theme.breakpoints, value, (append, v) => {
			const next = {};
			append(next, fn(v));
			styles = merge(styles, next);
		});
	if (s.container) {
		apply(s.columns ?? "var(--Grid-parent-columns)", (v) => ({
			"--Grid-columns": v,
			"> *": { "--Grid-parent-columns": v },
		}));
		apply(s.rowSpacing ?? "var(--Grid-parent-rowSpacing)", (v) => ({
			"--Grid-rowSpacing": typeof v === "string" ? v : theme.spacing(v),
			"> *": {
				"--Grid-parent-rowSpacing":
					typeof v === "string" ? v : theme.spacing(v),
			},
		}));
		apply(s.columnSpacing ?? "var(--Grid-parent-columnSpacing)", (v) => ({
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
	return React.forwardRef(function Grid(input, ref) {
		const theme = themeHook(),
			parent = React.useContext(GridContext),
			{
				component = "div",
				container = false,
				direction = "row",
				wrap = "wrap",
				columns = parent?.columns ?? 12,
				spacing,
				rowSpacing = spacing ?? parent?.rowSpacing ?? 0,
				columnSpacing = spacing ?? parent?.columnSpacing ?? 0,
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
			React.createElement(
				GridContext.Provider,
				{ value: container ? { columns, rowSpacing, columnSpacing } : parent },
				children,
			),
		);
	});
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
