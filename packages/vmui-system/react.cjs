"use strict";
const React = require("react"),
	engine = require("vmui-styled-engine"),
	privateTheme = require("vmui-private-theming");
const { internal_resolveProps: resolveProps } = require("vmui-utils"),
	{ createTheme, merge } = require("./theme.cjs"),
	sx = require("./sx.cjs");
const EMPTY_THEME = Object.freeze({});
const systemDefaultTheme = createTheme(),
	RtlContext = React.createContext(false),
	DefaultsContext = React.createContext(undefined);
function useThemeWithoutDefault(fallback = null) {
	const theme = React.useContext(engine.ThemeContext);
	return theme && Object.keys(theme).length ? theme : fallback;
}
function useTheme(fallback = systemDefaultTheme) {
	return useThemeWithoutDefault(fallback);
}
function RtlProvider({ value, children }) {
	return React.createElement(RtlContext.Provider, { value }, children);
}
function useRtl() {
	return React.useContext(RtlContext);
}
function DefaultPropsProvider({ value, children }) {
	return React.createElement(DefaultsContext.Provider, { value }, children);
}
function useDefaultProps({ props, name }) {
	const values = React.useContext(DefaultsContext);
	return resolveProps(values?.[name]?.defaultProps || {}, props);
}
function getThemeProps({ theme, name, props }) {
	return resolveProps(theme?.components?.[name]?.defaultProps || {}, props);
}
function useThemeProps({ props, name, defaultTheme, themeId }) {
	const theme = useTheme(defaultTheme);
	return getThemeProps({
		props,
		name,
		theme: (themeId && theme[themeId]) || theme,
	});
}
function ThemeProvider({ theme, themeId, children }) {
	const outer = useThemeWithoutDefault(EMPTY_THEME);
	const value = React.useMemo(() => {
		const base = themeId ? outer[themeId] || outer : outer;
		const supplied = typeof theme === "function" ? theme(base) : theme;
		const local = (themeId && supplied?.[themeId]) || supplied;
		if (local === null || typeof local !== "object")
			throw new TypeError("ThemeProvider requires a theme object");
		return themeId
			? { ...outer, [themeId]: { ...base, ...local } }
			: { ...outer, ...local };
	}, [outer, theme, themeId]);
	const scoped = themeId ? value[themeId] : value;
	return React.createElement(
		privateTheme.ThemeProvider,
		{ theme: value },
		React.createElement(
			engine.ThemeContext.Provider,
			{ value },
			React.createElement(
				RtlProvider,
				{ value: scoped.direction === "rtl" },
				React.createElement(
					DefaultPropsProvider,
					{ value: scoped.components },
					children,
				),
			),
		),
	);
}
const shouldForwardProp = (prop) =>
	!["ownerState", "theme", "sx", "as"].includes(prop);
function resolveStyle(style, props) {
	const result = typeof style === "function" ? style(props) : style;
	if (Array.isArray(result)) return result.map((s) => resolveStyle(s, props));
	if (result && typeof result === "object" && Array.isArray(result.variants)) {
		const { variants, ...base } = result;
		return [base, ...resolveVariants(variants, props)];
	}
	return result;
}
function resolveVariants(variants, props) {
	const state = { ...props, ...props.ownerState, ownerState: props.ownerState };
	return (variants || [])
		.filter((v) =>
			typeof v.props === "function"
				? v.props(state)
				: Object.entries(v.props).every(([key, value]) => state[key] === value),
		)
		.map((v) => resolveStyle(v.style, state));
}
function createStyled({
	themeId,
	defaultTheme = systemDefaultTheme,
	rootShouldForwardProp = shouldForwardProp,
	slotShouldForwardProp = shouldForwardProp,
} = {}) {
	return (tag, options = {}) => {
		const {
			name,
			slot,
			overridesResolver,
			skipVariantsResolver = slot && slot !== "Root" && slot !== "root",
			skipSx = false,
			...engineOptions
		} = options;
		const selected = (props) => {
			const theme =
				props.theme && Object.keys(props.theme).length
					? props.theme
					: defaultTheme;
			return { ...props, theme: (themeId && theme[themeId]) || theme };
		};
		const label =
			options.label ||
			(process.env.NODE_ENV !== "production" && name
				? `${name}-${slot ? slot[0].toLowerCase() + slot.slice(1) : "root"}`
				: undefined);
		const filter =
			engineOptions.shouldForwardProp ||
			(slot === "Root" || slot === "root"
				? rootShouldForwardProp
				: slot
					? slotShouldForwardProp
					: typeof tag === "string"
						? undefined
						: shouldForwardProp);
		return (...styles) => {
			const template = Array.isArray(styles[0]) && styles[0].raw;
			const prepared = template
				? [
						(props) => {
							const p = selected(props);
							return engine.css(
								styles[0],
								...styles.slice(1).map((value) => resolveStyle(value, p)),
							);
						},
					]
				: styles.map(
						(style) => (props) => resolveStyle(style, selected(props)),
					);
			if (name && overridesResolver)
				prepared.push((props) => {
					const p = selected(props),
						values = p.theme.components?.[name]?.styleOverrides || {};
					return overridesResolver(
						p,
						Object.fromEntries(
							Object.entries(values).map(([k, v]) => [k, resolveStyle(v, p)]),
						),
					);
				});
			if (name && !skipVariantsResolver)
				prepared.push((props) => {
					const p = selected(props);
					return resolveVariants(p.theme.components?.[name]?.variants, p);
				});
			if (!skipSx)
				prepared.push((props) => sx.unstable_styleFunctionSx(selected(props)));
			const component = engine.default(tag, {
				...engineOptions,
				label,
				shouldForwardProp: filter,
			})(...prepared);
			if (tag.muiName) component.muiName = tag.muiName;
			return component;
		};
	};
}
const styled = createStyled();
function createBox({
	defaultTheme = systemDefaultTheme,
	defaultClassName = "MuiBox-root",
	generateClassName,
} = {}) {
	const Root = engine.default("div", {
		shouldForwardProp: (prop) => !["theme", "sx", "as"].includes(prop),
	})(sx.unstable_styleFunctionSx);
	return React.forwardRef(function Box(input, ref) {
		const theme = useTheme(defaultTheme),
			{
				component = "div",
				className,
				...props
			} = sx.unstable_extendSxProp(input);
		return React.createElement(Root, {
			as: component,
			...props,
			theme,
			ref,
			className: [
				className,
				generateClassName
					? generateClassName(defaultClassName)
					: defaultClassName,
			]
				.filter(Boolean)
				.join(" "),
		});
	});
}
function GlobalStyles({ styles, themeId, defaultTheme = systemDefaultTheme }) {
	const theme = useTheme(defaultTheme),
		scoped = (themeId && theme[themeId]) || theme;
	return React.createElement(engine.GlobalStyles, {
		styles: typeof styles === "function" ? styles(scoped) : styles,
	});
}
function unstable_memoTheme(fn) {
	let theme, result;
	return (props) => {
		if (theme !== props.theme) {
			theme = props.theme;
			result = fn(props);
		}
		return result;
	};
}
function unstable_createUseMediaQuery({ themeId } = {}) {
	return (queryInput, options = {}) => {
		let theme = useTheme();
		if (themeId && theme[themeId]) theme = theme[themeId];
		const query = (
				typeof queryInput === "function" ? queryInput(theme) : queryInput
			).replace(/^@media\s*/, ""),
			settings = getThemeProps({
				theme,
				name: "MuiUseMediaQuery",
				props: options,
			});
		const native = typeof window === "undefined" ? null : window.matchMedia;
		const nativeMatcher = React.useMemo(
			() => (native ? native.bind(window) : null),
			[native],
		);
		const {
			defaultMatches = false,
			noSsr = false,
			ssrMatchMedia,
			matchMedia = nativeMatcher,
		} = settings;
		const media = React.useMemo(
			() => (matchMedia ? matchMedia(query) : null),
			[matchMedia, query],
		);
		const subscribe = React.useCallback(
			(notify) => {
				if (!media) return () => {};
				const cb = () => notify();
				if (media.addEventListener) media.addEventListener("change", cb);
				else media.addListener(cb);
				return () => {
					if (media.removeEventListener)
						media.removeEventListener("change", cb);
					else media.removeListener(cb);
				};
			},
			[media],
		);
		const get = React.useCallback(
			() => (media ? media.matches : defaultMatches),
			[media, defaultMatches],
		);
		const server = React.useCallback(
			() =>
				noSsr && media
					? media.matches
					: ssrMatchMedia
						? ssrMatchMedia(query).matches
						: defaultMatches,
			[noSsr, media, ssrMatchMedia, query, defaultMatches],
		);
		return React.useSyncExternalStore(subscribe, get, server);
	};
}
const useMediaQuery = unstable_createUseMediaQuery();
module.exports = {
	systemDefaultTheme,
	ThemeProvider,
	useTheme,
	useThemeWithoutDefault,
	RtlProvider,
	useRtl,
	DefaultPropsProvider,
	useDefaultProps,
	getThemeProps,
	useThemeProps,
	shouldForwardProp,
	createStyled,
	styled,
	createBox,
	Box: createBox(),
	boxClasses: { root: "MuiBox-root" },
	GlobalStyles,
	unstable_memoTheme,
	unstable_createUseMediaQuery,
	useMediaQuery,
	StyledEngineProvider: engine.StyledEngineProvider,
	css: engine.css,
	keyframes: engine.keyframes,
};
