"use strict";
const React = require("react");
const { merge, isPlainObject } = require("./theme.cjs");
const createGetCssVar =
	(prefix = "") =>
	(field, ...fallbacks) => {
		const name = (key) => "--" + (prefix ? prefix + "-" : "") + key;
		let fallback = "";
		for (let i = fallbacks.length - 1; i >= 0; i--) {
			const v = fallbacks[i];
			fallback =
				v == null ||
				typeof v === "number" ||
				/^(?:#|[+-]?\d|(?:rgb|hsl|color|calc|var)\()/.test(v)
					? String(v)
					: `var(${name(v)}${fallback ? ", " + fallback : ""})`;
		}
		return `var(${name(field)}${fallback ? ", " + fallback : ""})`;
	};
function cssVarsParser(
	input,
	{ prefix: prefix = "", shouldSkipGeneratingVar } = {},
) {
	const css = {},
		active = new Set();
	function walk(value, path) {
		if (value && typeof value === "object") {
			if (active.has(value))
				throw new TypeError("Theme variables cannot contain cycles");
			active.add(value);
			const variables = Array.isArray(value) ? [] : {},
				defaults = Array.isArray(value) ? [] : {};
			for (const [key, child] of Object.entries(value)) {
				if (["__proto__", "constructor", "prototype", "vars"].includes(key))
					continue;
				const found = walk(child, [...path, key]);
				if (found) {
					variables[key] = found[0];
					defaults[key] = found[1];
				}
			}
			active.delete(value);
			return [variables, defaults];
		}
		if (
			!["string", "number"].includes(typeof value) ||
			shouldSkipGeneratingVar?.(path, value)
		)
			return null;
		const key = "--" + [prefix, ...path].filter(Boolean).join("-");
		const unitless = path.some((part) =>
			/^(?:zIndex|fontWeight|lineHeight)$|opacity/i.test(part),
		);
		const literal =
			typeof value === "number" && !unitless ? `${value}px` : value;
		css[key] = literal;
		return [`var(${key})`, `var(${key}, ${literal})`];
	}
	const [vars, varsWithDefaults] = walk(input, []);
	return { css: css, vars, varsWithDefaults };
}
function selectorFor(selector, scheme) {
	if (selector === "media") return `@media (prefers-color-scheme: ${scheme})`;
	if (selector === "class") return "." + scheme;
	if (selector === "data") return "[data-" + scheme + "]";
	return selector ? selector.replace(/%s/g, scheme) : ":root";
}
const createGetColorSchemeSelector = (selector) => (scheme) => {
	const s = selectorFor(selector, scheme);
	return s.startsWith("@") ? s : s === ":root" ? "&" : s + " &";
};
function prepareTypographyVars(typography) {
	return Object.fromEntries(
		Object.entries(typography)
			.filter(([, v]) => isPlainObject(v))
			.map(([key, v]) => [
				key,
				[
					v.fontStyle,
					v.fontVariant,
					v.fontWeight,
					v.fontStretch,
					v.fontSize === void 0
						? void 0
						: v.fontSize + (v.lineHeight === void 0 ? "" : "/" + v.lineHeight),
					v.fontFamily,
				]
					.filter((part) => part !== void 0)
					.join(" "),
			]),
	);
}
function prepareCssVars(theme, options = {}) {
	const { colorSchemes = {}, components, defaultColorScheme, ...base } = theme;
	const parsed = cssVarsParser(base, options),
		schemes = Object.fromEntries(
			Object.entries(colorSchemes).map(([key, value]) => [
				key,
				cssVarsParser(value, options),
			]),
		);
	const primary = schemes[defaultColorScheme] || Object.values(schemes)[0];
	let vars = parsed.varsWithDefaults;
	for (const value of Object.values(schemes))
		vars = merge(value.varsWithDefaults, vars);
	if (primary) vars = merge(vars, primary.varsWithDefaults);
	function generateThemeVars() {
		let value = parsed.vars;
		for (const scheme of Object.values(schemes))
			value = merge(value, scheme.vars);
		return value;
	}
	function sheet(scheme, css) {
		if (options.getSelector) {
			const selection = options.getSelector(scheme, css);
			return typeof selection === "string" ? { [selection]: css } : selection;
		}
		if (scheme === void 0) return { ":root": css };
		let selected = selectorFor(options.colorSchemeSelector, scheme);
		if (scheme === defaultColorScheme)
			selected =
				options.colorSchemeSelector === "media" || !options.colorSchemeSelector
					? ":root"
					: ":root, " + selected;
		return selected.startsWith("@")
			? { [selected]: { ":root": css } }
			: { [selected]: css };
	}
	function generateStyleSheets() {
		const sheets = [];
		if (Object.keys(parsed.css).length) sheets.push(sheet(void 0, parsed.css));
		const ordered = [
			defaultColorScheme,
			...Object.keys(schemes).filter((k) => k !== defaultColorScheme),
		];
		for (const name of ordered) {
			if (!schemes[name]) continue;
			const mode = colorSchemes[name].palette?.mode,
				css = {
					...(!options.disableCssColorScheme && mode
						? { colorScheme: mode }
						: null),
					...schemes[name].css,
				};
			if (Object.keys(css).length) sheets.push(sheet(name, css));
		}
		return sheets;
	}
	return { vars, generateThemeVars, generateStyleSheets };
}
function createCssVarsTheme(theme) {
	const prepared = prepareCssVars(theme, {
		prefix: theme.cssVarPrefix,
		...theme,
	});
	return { ...theme, ...prepared };
}
function createCssVarsProvider(config) {
	const Context = React.createContext(null);
	function CssVarsProvider({
		theme = config.theme,
		themeId = config.themeId,
		children,
		defaultMode = "system",
		documentNode = typeof document !== "undefined" ? document : null,
		colorSchemeNode = documentNode?.documentElement,
		storageWindow = typeof window !== "undefined" ? window : null,
		storageManager,
		disableNestedContext = false,
		disableStyleSheetGeneration = false,
		...props
	}) {
		const inputTheme = theme;
		theme = React.useMemo(
			() => (typeof inputTheme === "function" ? inputTheme() : inputTheme),
			[inputTheme],
		);
		const parent = React.useContext(Context),
			isolated = disableNestedContext || !parent;
		const activeThemeId = themeId && theme[themeId] ? themeId : undefined;
		const scoped = activeThemeId ? theme[activeThemeId] : theme,
			schemeKeys = Object.keys(scoped.colorSchemes || {}),
			defaultScheme =
				props.defaultColorScheme ||
				config.defaultColorScheme ||
				scoped.defaultColorScheme ||
				"light";
		const defaults =
			typeof defaultScheme === "string"
				? { light: defaultScheme, dark: defaultScheme }
				: defaultScheme;
		const modeKey = props.modeStorageKey || config.modeStorageKey || "mode",
			schemeKey =
				props.colorSchemeStorageKey ||
				config.colorSchemeStorageKey ||
				"color-scheme";
		const manager = React.useMemo(() => {
			if (storageManager === null) return null;
			if (storageManager)
				return storageManager({ key: modeKey, storageWindow });
			return {
				get: (fallback) => {
					try {
						return storageWindow?.localStorage.getItem(modeKey) || fallback;
					} catch {
						return fallback;
					}
				},
				set: (value) => {
					try {
						storageWindow?.localStorage.setItem(modeKey, value);
					} catch {}
				},
				subscribe: (fn) => {
					const listener = (e) => {
						if (e.key === modeKey) fn(e.newValue);
					};
					storageWindow?.addEventListener("storage", listener);
					return () => storageWindow?.removeEventListener("storage", listener);
				},
			};
		}, [storageManager, storageWindow, modeKey]);
		const [mode, setModeState] = React.useState(void 0),
			[systemMode, setSystemMode] = React.useState(void 0),
			[selected, setSelected] = React.useState(defaults);
		React.useEffect(() => {
			if (!isolated) return;
			setModeState(manager?.get(defaultMode) || defaultMode);
			const media = storageWindow?.matchMedia?.("(prefers-color-scheme: dark)");
			const update = () => setSystemMode(media?.matches ? "dark" : "light");
			update();
			media?.addEventListener("change", update);
			const off = manager?.subscribe((value) =>
				setModeState(value || defaultMode),
			);
			return () => {
				off?.();
				media?.removeEventListener("change", update);
			};
		}, [manager, defaultMode, isolated, storageWindow]);
		const effective = mode === "system" ? systemMode : mode,
			colorScheme = effective ? selected[effective] : void 0;
		const value = React.useMemo(
			() => ({
				mode,
				systemMode,
				colorScheme,
				lightColorScheme: selected.light,
				darkColorScheme: selected.dark,
				allColorSchemes: schemeKeys,
				setMode: (next) => {
					next = next || defaultMode;
					if (!["light", "dark", "system"].includes(next))
						throw new TypeError("Invalid color mode");
					setModeState(next);
					manager?.set(next);
				},
				setColorScheme: (next) => {
					setSelected((old) =>
						typeof next === "string"
							? { ...old, [effective || "light"]: next }
							: { ...old, ...next },
					);
				},
			}),
			[
				mode,
				systemMode,
				colorScheme,
				selected,
				scoped,
				defaultMode,
				manager,
				effective,
			],
		);
		const context = isolated ? value : parent,
			scheme = context.colorScheme || defaults.light;
		let resolved = React.useMemo(() => {
			const merged = { ...scoped, ...scoped.colorSchemes?.[scheme] };
			if (scoped.generateThemeVars) merged.vars = scoped.generateThemeVars();
			if (scoped.generateSpacing)
				merged.spacing = scoped.generateSpacing.call(merged);
			return config.resolveTheme ? config.resolveTheme(merged) : merged;
		}, [scoped, scheme]);
		if (activeThemeId) resolved = { ...theme, [activeThemeId]: resolved };
		React.useEffect(() => {
			if (!isolated || !colorSchemeNode || !context.colorScheme) return;
			const selector = scoped.colorSchemeSelector || "media";
			if (selector === "media") return;
			if (selector === "class") {
				for (const key of schemeKeys) colorSchemeNode.classList.remove(key);
				colorSchemeNode.classList.add(context.colorScheme);
				return;
			}
			if (selector === "data") {
				for (const key of schemeKeys)
					colorSchemeNode.removeAttribute("data-" + key);
				colorSchemeNode.setAttribute("data-" + context.colorScheme, "");
				return;
			}
			const attr = /^\[([^=\]]+)(?:=["']?%s["']?)?\]$/.exec(selector);
			if (attr) colorSchemeNode.setAttribute(attr[1], context.colorScheme);
		}, [isolated, colorSchemeNode, context.colorScheme, scoped]);
		const {
			ThemeProvider: ThemeProvider,
			GlobalStyles,
		} = require("./react.cjs");
		return React.createElement(
			Context.Provider,
			{ value: context },
			React.createElement(
				ThemeProvider,
				{ theme: resolved, themeId: activeThemeId },
				children,
				!disableStyleSheetGeneration && isolated && scoped.generateStyleSheets
					? React.createElement(GlobalStyles, {
							styles: scoped.generateStyleSheets(),
						})
					: null,
			),
		);
	}
	const useColorScheme = () =>
		React.useContext(Context) || {
			mode: void 0,
			systemMode: void 0,
			colorScheme: void 0,
			allColorSchemes: [],
			setMode: () => {},
			setColorScheme: () => {},
		};
	return {
		CssVarsProvider,
		useColorScheme,
		getInitColorSchemeScript: InitColorSchemeScript,
	};
}
function InitColorSchemeScript() {
	throw new TypeError(
		"VentiMath supplies its theme on mount; pre-hydration color scripts are not implemented",
	);
}
module.exports = {
	prepareCssVars,
	prepareTypographyVars,
	createCssVarsTheme,
	createGetColorSchemeSelector,
	createCssVarsProvider,
	cssVarsParser,
	createGetCssVar,
	InitColorSchemeScript,
	unstable_prepareCssVars: prepareCssVars,
	unstable_cssVarsParser: cssVarsParser,
	unstable_createCssVarsTheme: createCssVarsTheme,
	unstable_createCssVarsProvider: createCssVarsProvider,
	unstable_createGetCssVar: createGetCssVar,
};
