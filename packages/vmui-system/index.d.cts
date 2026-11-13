import type * as React from "react";
import type {
	CSSProperties,
	CSSObject,
	Interpolation,
	CreateMUIStyled as EngineStyled,
} from "vmui-styled-engine";
export type {
	CSSObject,
	CSSInterpolation,
	Interpolation,
	StyledComponent,
} from "vmui-styled-engine";
export { css, keyframes, StyledEngineProvider } from "vmui-styled-engine";
export type { DefaultTheme } from "vmui-private-theming";

export type Direction = "ltr" | "rtl";
export interface BreakpointOverrides {}
type DefaultBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";
export type Breakpoint =
	| Exclude<DefaultBreakpoint, keyof BreakpointOverrides>
	| {
			[K in keyof BreakpointOverrides]: BreakpointOverrides[K] extends true
				? K
				: never;
	  }[keyof BreakpointOverrides];
export interface Breakpoints {
	keys: Breakpoint[];
	values: Record<Breakpoint, number>;
	unit: string;
	up(key: Breakpoint | number): string;
	down(key: Breakpoint | number): string;
	between(start: Breakpoint | number, end: Breakpoint | number): string;
	only(key: Breakpoint): string;
	not(key: Breakpoint): string;
	internal_mediaKeys?: string[];
}
export interface BreakpointsOptions
	extends Partial<Omit<Breakpoints, "values">> {
	values?: Record<string, number>;
	step?: number;
}
export function createBreakpoints(options?: BreakpointsOptions): Breakpoints;
export type SpacingArgument = number | string;
export interface Spacing {
	(...values: SpacingArgument[]): string;
	mui?: boolean;
}
export type SpacingOptions =
	| number
	| string
	| ReadonlyArray<number | string>
	| ((value: number | string) => number | string);
export function createSpacing(
	input?: SpacingOptions,
	transform?: (value: SpacingArgument) => number | string,
): Spacing;
export interface Shape {
	borderRadius: number;
}
export type ShapeOptions = Partial<Shape>;
export const shape: Shape;
export type ResponsiveStyleValue<T> =
	| T
	| ReadonlyArray<T | null>
	| { [key: string]: T | null };
type StyleValue<T extends object> =
	| string
	| number
	| boolean
	| null
	| undefined
	| SystemStyleObject<T>
	| ReadonlyArray<StyleValue<T>>
	| ((theme: T) => StyleValue<T>);
export interface SystemStyleObject<T extends object = {}> {
	[key: string]: StyleValue<T>;
}
export type SxProps<T extends object = {}> =
	| SystemStyleObject<T>
	| ((theme: T) => SystemStyleObject<T>)
	| ReadonlyArray<
			boolean | SystemStyleObject<T> | ((theme: T) => SystemStyleObject<T>)
	  >;
type SystemProperty =
	| "border"
	| "borderTop"
	| "borderRight"
	| "borderBottom"
	| "borderLeft"
	| "borderColor"
	| "borderTopColor"
	| "borderRightColor"
	| "borderBottomColor"
	| "borderLeftColor"
	| "outline"
	| "outlineColor"
	| "borderRadius"
	| "color"
	| "bgcolor"
	| "backgroundColor"
	| "displayPrint"
	| "display"
	| "overflow"
	| "textOverflow"
	| "visibility"
	| "whiteSpace"
	| "flexBasis"
	| "flexDirection"
	| "flexWrap"
	| "justifyContent"
	| "alignItems"
	| "alignContent"
	| "order"
	| "flex"
	| "flexGrow"
	| "flexShrink"
	| "alignSelf"
	| "justifyItems"
	| "justifySelf"
	| "gap"
	| "rowGap"
	| "columnGap"
	| "gridColumn"
	| "gridRow"
	| "gridAutoFlow"
	| "gridAutoColumns"
	| "gridAutoRows"
	| "gridTemplateColumns"
	| "gridTemplateRows"
	| "gridTemplateAreas"
	| "gridArea"
	| "position"
	| "zIndex"
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "boxShadow"
	| "width"
	| "maxWidth"
	| "minWidth"
	| "height"
	| "maxHeight"
	| "minHeight"
	| "boxSizing"
	| "font"
	| "fontFamily"
	| "fontSize"
	| "fontStyle"
	| "fontWeight"
	| "letterSpacing"
	| "textTransform"
	| "lineHeight"
	| "textAlign"
	| "typography"
	| "m"
	| "mt"
	| "mr"
	| "mb"
	| "ml"
	| "mx"
	| "my"
	| "margin"
	| "marginTop"
	| "marginRight"
	| "marginBottom"
	| "marginLeft"
	| "marginInline"
	| "marginInlineStart"
	| "marginInlineEnd"
	| "marginBlock"
	| "marginBlockStart"
	| "marginBlockEnd"
	| "marginX"
	| "marginY"
	| "p"
	| "pt"
	| "pr"
	| "pb"
	| "pl"
	| "px"
	| "py"
	| "padding"
	| "paddingTop"
	| "paddingRight"
	| "paddingBottom"
	| "paddingLeft"
	| "paddingInline"
	| "paddingInlineStart"
	| "paddingInlineEnd"
	| "paddingBlock"
	| "paddingBlockStart"
	| "paddingBlockEnd"
	| "paddingX"
	| "paddingY";
export type SystemProps<T extends object = Theme> = {
	[K in SystemProperty]?:
		| ResponsiveStyleValue<string | number>
		| ((theme: T) => ResponsiveStyleValue<string | number>);
};
export interface SxConfigEntry {
	cssProperty?: string | false;
	themeKey?: string;
	transform?: (themeValue: any, userValue: any) => any;
	style?: (props: any) => CSSObject | null;
}
export interface SxConfig {
	[key: string]: SxConfigEntry;
}
export interface ApplyStyles<K extends string> {
	(key: K, styles: CSSObject): CSSObject;
}
export interface Theme {
	breakpoints: Breakpoints;
	direction: "ltr" | "rtl";
	spacing: Spacing;
	shape: Shape;
	palette: Record<string, any>;
	components?: Record<string, any>;
	typography?: Record<string, any>;
	shadows?: ReadonlyArray<string>;
	zIndex?: object;
	unstable_sxConfig: SxConfig;
	unstable_sx(value: SxProps<Theme>): CSSObject;
	applyStyles: ApplyStyles<"light" | "dark">;
	containerQueries: ContainerQueries;
}
export interface ThemeOptions
	extends Partial<Omit<Theme, "breakpoints" | "spacing" | "shape">> {
	breakpoints?: BreakpointsOptions;
	spacing?: SpacingOptions;
	shape?: ShapeOptions;
}
export function createTheme(
	options?: ThemeOptions,
	...overrides: object[]
): Theme;
type ContainerMethods = Pick<
	Breakpoints,
	"up" | "down" | "between" | "only" | "not"
>;
export type ContainerQueries = ContainerMethods &
	((name?: string) => ContainerMethods);
export function cssContainerQueries<T extends { breakpoints: Breakpoints }>(
	theme: T,
): T & { containerQueries: ContainerQueries };
export interface StyleFunction<Props = any> {
	(props: Props): CSSObject | null;
	filterProps?: string[];
}
export function style(options: {
	prop: string;
	cssProperty?: string | false;
	themeKey?: string;
	transform?: (value: any, userValue?: any) => any;
}): StyleFunction;
export function compose(...styles: StyleFunction[]): StyleFunction;
export function unstable_styleFunctionSx<T extends object>(props: {
	theme?: T;
	sx?: SxProps<T>;
}): CSSObject | CSSObject[] | null;
export function unstable_createStyleFunctionSx(): typeof unstable_styleFunctionSx;
export const unstable_defaultSxConfig: SxConfig;
export function unstable_extendSxProp<P extends { sx?: SxProps<any> }>(
	props: P,
): P;
export { unstable_extendSxProp as extendSxProp };
export function createUnaryUnit(
	theme: object,
	key: string,
	fallback?: SpacingOptions,
	property?: string,
): (value: SpacingArgument) => number | string;
export function createUnarySpacing(theme: {
	spacing?: SpacingOptions;
	vars?: object;
}): (value: SpacingArgument) => number | string;
export function getValue<T>(
	transform: (value: number) => T,
	value: number | string | null | undefined,
): T | string | null | undefined;
export function handleBreakpoints(
	props: { theme?: Theme },
	value: unknown,
	style: (value: any, breakpoint?: string) => CSSObject,
): CSSObject;
export function mergeBreakpointsInOrder(
	breakpoints: Breakpoints,
	...styles: CSSObject[]
): CSSObject;

export interface ThemeProviderProps<T extends object = Theme> {
	theme: Partial<T> | ((outerTheme: T) => T);
	themeId?: string;
	children?: React.ReactNode;
}
export function ThemeProvider<T extends object>(
	props: ThemeProviderProps<T>,
): React.ReactElement;
export function useTheme<T = Theme>(fallback?: T): T;
export function useThemeWithoutDefault<T = Theme>(
	fallback?: T | null,
): T | null;
export function RtlProvider(props: {
	value: boolean;
	children?: React.ReactNode;
}): React.ReactElement;
export function useRtl(): boolean;
export function DefaultPropsProvider(props: {
	value?: Record<string, any>;
	children?: React.ReactNode;
}): React.ReactElement;
export function getThemeProps<T>(options: {
	props: T;
	name: string;
	theme: object;
}): T;
export function useDefaultProps<T>(options: { props: T; name: string }): T;
export function useThemeProps<T>(options: {
	props: T;
	name: string;
	themeId?: string;
	defaultTheme?: object;
}): T;
export interface MUIStyledCommonProps<T extends object = Theme> {
	theme?: T;
	as?: React.ElementType;
	sx?: SxProps<T>;
}
export interface MuiStyledOptions {
	name?: string;
	slot?: string;
	overridesResolver?: (
		props: any,
		styles: Record<string, any>,
	) => Interpolation<any>;
	skipVariantsResolver?: boolean;
	skipSx?: boolean;
}
export type CreateMUIStyled<T extends object = Theme> = EngineStyled<
	MUIStyledCommonProps<T>,
	MuiStyledOptions,
	T
>;
export function createStyled<T extends object = Theme>(options?: {
	themeId?: string;
	defaultTheme?: T;
	rootShouldForwardProp?: (prop: PropertyKey) => boolean;
	slotShouldForwardProp?: (prop: PropertyKey) => boolean;
}): CreateMUIStyled<T>;
export const styled: CreateMUIStyled;
export function shouldForwardProp(prop: PropertyKey): boolean;
export interface GlobalStylesProps<T extends object = Theme> {
	styles: Interpolation<T>;
	themeId?: string;
	defaultTheme?: T;
}
export function GlobalStyles<T extends object = Theme>(
	props: GlobalStylesProps<T>,
): React.ReactElement;
export function unstable_memoTheme<T, R = CSSObject>(
	style: (props: { theme: T }) => R,
): (props: { theme: T }) => R;
export interface UseMediaQueryOptions {
	defaultMatches?: boolean;
	noSsr?: boolean;
	matchMedia?: ((query: string) => MediaQueryList) | null;
	ssrMatchMedia?: (query: string) => { matches: boolean };
}
export function useMediaQuery<T = Theme>(
	query: string | ((theme: T) => string),
	options?: UseMediaQueryOptions,
): boolean;
export function unstable_createUseMediaQuery(options?: {
	themeId?: string;
}): typeof useMediaQuery;

export interface BoxTypeMap<
	Additional = {},
	Component extends React.ElementType = "div",
	T extends object = Theme,
> {
	props: Additional &
		SystemProps<T> & { children?: React.ReactNode; sx?: SxProps<T> };
	defaultComponent: Component;
}
type ElementProps<P, C extends React.ElementType> = P & {
	component?: C;
} & Omit<React.ComponentPropsWithRef<C>, keyof P | "component">;
export type BoxProps<
	C extends React.ElementType = "div",
	T extends object = Theme,
> = ElementProps<BoxTypeMap<{}, C, T>["props"], C>;
export function Box<C extends React.ElementType = "div">(
	props: BoxProps<C>,
): React.ReactElement;
export function createBox<T extends object = Theme>(options?: {
	defaultTheme?: T;
	defaultClassName?: string;
	generateClassName?: (name: string) => string;
}): typeof Box;
export const boxClasses: { root: string };
export interface ContainerClasses {
	root: string;
	disableGutters: string;
	fixed: string;
	maxWidthXs: string;
	maxWidthSm: string;
	maxWidthMd: string;
	maxWidthLg: string;
	maxWidthXl: string;
}
export interface StackClasses {
	root: string;
}
export interface GridClasses {
	root: string;
	container: string;
}
export const containerClasses: ContainerClasses;
export const stackClasses: StackClasses;
export const gridClasses: GridClasses;
export function getContainerUtilityClass(slot: string): string;
export function getStackUtilityClass(slot: string): string;
export function getGridUtilityClass(slot: string): string;
export type ContainerProps<C extends React.ElementType = "div"> = ElementProps<
	{
		children?: React.ReactNode;
		disableGutters?: boolean;
		fixed?: boolean;
		maxWidth?: Breakpoint | false;
		sx?: SxProps<Theme>;
		classes?: Partial<ContainerClasses>;
	},
	C
>;
export type StackProps<C extends React.ElementType = "div"> = ElementProps<
	Omit<SystemProps<Theme>, "direction"> & {
		children?: React.ReactNode;
		direction?: ResponsiveStyleValue<
			"row" | "row-reverse" | "column" | "column-reverse"
		>;
		spacing?: ResponsiveStyleValue<number | string>;
		divider?: React.ReactElement;
		useFlexGap?: boolean;
		sx?: SxProps<Theme>;
	},
	C
>;
export type GridSize = number | "auto" | "grow" | false;
export type GridProps<C extends React.ElementType = "div"> = ElementProps<
	Omit<SystemProps<Theme>, "container" | "direction"> & {
		children?: React.ReactNode;
		container?: boolean;
		columns?: ResponsiveStyleValue<number>;
		size?: ResponsiveStyleValue<GridSize>;
		offset?: ResponsiveStyleValue<number | "auto">;
		direction?: ResponsiveStyleValue<
			"row" | "row-reverse" | "column" | "column-reverse"
		>;
		spacing?: ResponsiveStyleValue<number | string>;
		rowSpacing?: ResponsiveStyleValue<number | string>;
		columnSpacing?: ResponsiveStyleValue<number | string>;
		wrap?: "wrap" | "nowrap" | "wrap-reverse";
		sx?: SxProps<Theme>;
	},
	C
>;
export function Container<C extends React.ElementType = "div">(
	props: ContainerProps<C>,
): React.ReactElement;
export function Stack<C extends React.ElementType = "div">(
	props: StackProps<C>,
): React.ReactElement;
export function Grid<C extends React.ElementType = "div">(
	props: GridProps<C>,
): React.ReactElement;
interface LayoutFactoryOptions {
	createStyledComponent?: (...styles: any[]) => React.ElementType;
	useThemeProps?: (props: any) => any;
	componentName?: string;
	useTheme?: () => Theme;
}
export function createContainer(
	options?: LayoutFactoryOptions,
): typeof Container;
export function createStack(options?: LayoutFactoryOptions): typeof Stack;
export function createGrid(options?: LayoutFactoryOptions): typeof Grid;

export type ColorFormat = "rgb" | "rgba" | "hsl" | "hsla" | "color";
export interface ColorObject {
	type: string;
	values: number[];
	colorSpace?: string;
}
export function decomposeColor(color: string | ColorObject): ColorObject;
export function recomposeColor(color: ColorObject): string;
export function hexToRgb(color: string): string;
export function rgbToHex(color: string): string;
export function hslToRgb(color: string): string;
export function colorChannel(color: string): string;
export function getLuminance(color: string): number;
export function getContrastRatio(first: string, second: string): number;
export function alpha(color: string, value: number): string;
export function darken(color: string, coefficient?: number): string;
export function lighten(color: string, coefficient?: number): string;
export function emphasize(color: string, coefficient?: number): string;
export function blend(
	background: string,
	overlay: string,
	opacity: number,
	gamma?: number,
): string;
export const private_safeAlpha: typeof alpha;
export const private_safeDarken: typeof darken;
export const private_safeLighten: typeof lighten;
export const private_safeEmphasize: typeof emphasize;
export const private_safeColorChannel: typeof colorChannel;

export interface CssVarsParserConfig {
	prefix?: string;
	shouldSkipGeneratingVar?: (path: string[], value: unknown) => boolean;
}
export interface CssVarsResult {
	css: Record<string, string | number>;
	vars: Record<string, any>;
	varsWithDefaults: Record<string, any>;
}
export function cssVarsParser(
	theme: object,
	config?: CssVarsParserConfig,
): CssVarsResult;
export { cssVarsParser as unstable_cssVarsParser };
export function createGetCssVar(
	prefix?: string,
): (field: string, ...fallbacks: Array<string | number | undefined>) => string;
export { createGetCssVar as unstable_createGetCssVar };
export function createGetColorSchemeSelector(
	selector?: string,
): (scheme: string) => string;
export interface PreparedCssVars {
	vars: Record<string, any>;
	generateThemeVars(): Record<string, any>;
	generateStyleSheets(): CSSObject[];
}
export function prepareCssVars(
	theme: object,
	config?: CssVarsParserConfig & {
		colorSchemeSelector?: string;
		disableCssColorScheme?: boolean;
		getSelector?: (
			scheme: string | undefined,
			css: Record<string, string | number>,
		) => string | CSSObject;
	},
): PreparedCssVars;
export { prepareCssVars as unstable_prepareCssVars };
export function prepareTypographyVars(
	typography: object,
): Record<string, string>;
export function createCssVarsTheme<T extends object>(
	theme: T,
): T & PreparedCssVars;
export { createCssVarsTheme as unstable_createCssVarsTheme };
export type Mode = "light" | "dark" | "system";
export type StorageManager = (options: {
	key: string;
	storageWindow?: Window | null;
}) => {
	get(defaultValue: any): any;
	set(value: any): void;
	subscribe(handler: (value: any) => void): () => void;
};
export interface ColorSchemeContextValue<S extends string> {
	mode: Mode | undefined;
	systemMode: "light" | "dark" | undefined;
	colorScheme: S | undefined;
	lightColorScheme: S;
	darkColorScheme: S;
	allColorSchemes: S[];
	setMode(mode: Mode | null): void;
	setColorScheme(
		value: S | Partial<Record<"light" | "dark", S | null>> | null,
	): void;
}
export interface CssVarsProviderConfig<S extends string> {
	defaultColorScheme: S | { light: S; dark: S };
	defaultMode?: Mode;
	modeStorageKey?: string;
	colorSchemeStorageKey?: string;
	disableTransitionOnChange?: boolean;
}
export interface CssVarsProviderProps<S extends string>
	extends Partial<CssVarsProviderConfig<S>> {
	theme?: object;
	themeId?: string;
	children?: React.ReactNode;
	documentNode?: Document | null;
	colorSchemeNode?: Element | null;
	storageWindow?: Window | null;
	storageManager?: StorageManager | null;
	disableNestedContext?: boolean;
	disableStyleSheetGeneration?: boolean;
}
export function createCssVarsProvider<S extends string = "light" | "dark">(
	options: CssVarsProviderConfig<S> & {
		theme: object | (() => object);
		themeId?: string;
		resolveTheme?: (theme: any) => any;
	},
): {
	CssVarsProvider(props: CssVarsProviderProps<S>): React.ReactElement;
	useColorScheme(): ColorSchemeContextValue<S>;
	getInitColorSchemeScript: typeof InitColorSchemeScript;
};
export { createCssVarsProvider as unstable_createCssVarsProvider };
/** Pre-hydration scripts are not implemented by this package. */
export function InitColorSchemeScript(): never;

export const alignContent: StyleFunction;
export const alignItems: StyleFunction;
export const alignSelf: StyleFunction;
export const backgroundColor: StyleFunction;
export const bgcolor: StyleFunction;
export const border: StyleFunction;
export const borderBottom: StyleFunction;
export const borderBottomColor: StyleFunction;
export const borderColor: StyleFunction;
export const borderLeft: StyleFunction;
export const borderLeftColor: StyleFunction;
export const borderRight: StyleFunction;
export const borderRightColor: StyleFunction;
export const borderTop: StyleFunction;
export const borderTopColor: StyleFunction;
export const borderRadius: StyleFunction;
export const borders: StyleFunction;
export const bottom: StyleFunction;
export const boxShadow: StyleFunction;
export const boxSizing: StyleFunction;
export const color: StyleFunction;
export const columnGap: StyleFunction;
export const display: StyleFunction;
export const displayPrint: StyleFunction;
export const flex: StyleFunction;
export const flexBasis: StyleFunction;
export const flexDirection: StyleFunction;
export const flexGrow: StyleFunction;
export const flexShrink: StyleFunction;
export const flexWrap: StyleFunction;
export const flexbox: StyleFunction;
export const font: StyleFunction;
export const fontFamily: StyleFunction;
export const fontSize: StyleFunction;
export const fontStyle: StyleFunction;
export const fontWeight: StyleFunction;
export const gap: StyleFunction;
export const grid: StyleFunction;
export const gridArea: StyleFunction;
export const gridAutoColumns: StyleFunction;
export const gridAutoFlow: StyleFunction;
export const gridAutoRows: StyleFunction;
export const gridColumn: StyleFunction;
export const gridRow: StyleFunction;
export const gridTemplateAreas: StyleFunction;
export const gridTemplateColumns: StyleFunction;
export const gridTemplateRows: StyleFunction;
export const height: StyleFunction;
export const justifyContent: StyleFunction;
export const justifyItems: StyleFunction;
export const justifySelf: StyleFunction;
export const left: StyleFunction;
export const letterSpacing: StyleFunction;
export const lineHeight: StyleFunction;
export const margin: StyleFunction;
export const maxHeight: StyleFunction;
export const maxWidth: StyleFunction;
export const minHeight: StyleFunction;
export const minWidth: StyleFunction;
export const order: StyleFunction;
export const outline: StyleFunction;
export const outlineColor: StyleFunction;
export const overflow: StyleFunction;
export const padding: StyleFunction;
export const palette: StyleFunction;
export const position: StyleFunction;
export const positions: StyleFunction;
export const right: StyleFunction;
export const rowGap: StyleFunction;
export const shadows: StyleFunction;
export const sizing: StyleFunction;
export const spacing: StyleFunction;
export const textAlign: StyleFunction;
export const textOverflow: StyleFunction;
export const textTransform: StyleFunction;
export const top: StyleFunction;
export const typography: StyleFunction;
export const typographyVariant: StyleFunction;
export const visibility: StyleFunction;
export const whiteSpace: StyleFunction;
export const width: StyleFunction;
export const zIndex: StyleFunction;
export const marginKeys: string[], paddingKeys: string[];
export function sizingTransform(value: number | string): number | string;
export function borderTransform(value: number | string): number | string;
export function paletteTransform(value: unknown, userValue?: unknown): unknown;
export function getPath(
	theme: object,
	path: string,
	checkVars?: boolean,
): unknown;
export function getStyleValue(
	mapping: any,
	transform: any,
	value: any,
	userValue?: any,
): any;
export function unstable_generateSizeClassNames(size: object): string[];
export function unstable_generateSpacingClassNames(
	spacing: unknown,
	smallestBreakpoint?: string,
): string[];
export function unstable_generateDirectionClasses(direction: unknown): string[];
export function unstable_traverseBreakpoints(
	breakpoints: Breakpoints,
	value: unknown,
	iterator: (
		append: (target: CSSObject, style: CSSObject) => void,
		value: any,
	) => void,
): void;

export type ContainerClassKey = keyof ContainerClasses;
export type StackClassKey = keyof StackClasses;
export type ExtractTypographyTokens<T> = {
	[K in keyof T as T[K] extends object ? K : never]: string;
};

export function unstable_resolveBreakpointValues<T>(options: {
	values: T | readonly (T | null)[] | Partial<Record<Breakpoint, T>>;
	breakpoints?: Record<string, number>;
	base?: Record<string, boolean>;
}): T | Record<string, T>;

export const systemDefaultTheme: Theme;

export function breakpoints<Props>(
	styleFunction: StyleFunction<Props>,
): StyleFunction<Props & Partial<Record<Breakpoint, Props>>>;
