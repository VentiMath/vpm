import type { Theme as SystemTheme, ThemeOptions as SystemThemeOptions, CSSObject } from "vmui-system";
import type { Palette, PaletteOptions } from "./createPalette.mjs";
import type { TypographyVariants, TypographyVariantsOptions } from "./createTypography.mjs";
import type { Transitions, TransitionsOptions } from "./createTransitions.mjs";
export interface Mixins { toolbar: CSSObject; [name:string]: CSSObject | ((...args:any[])=>CSSObject) }
export interface ZIndex { mobileStepper:number; fab:number; speedDial:number; appBar:number; drawer:number; modal:number; snackbar:number; tooltip:number }
export interface ColorSchemeOptions { palette?:PaletteOptions; opacity?:Record<string,number>; overlays?:string[] }
export interface CssVariablesOptions {
 cssVarPrefix?:string; rootSelector?:string;
 colorSchemeSelector?:"media"|"class"|"data"|(string & {});
 disableCssColorScheme?:boolean;
 shouldSkipGeneratingVar?:(keys:string[],value:unknown)=>boolean;
}
export interface ThemeOptions extends Omit<SystemThemeOptions,"palette"|"typography"|"shadows"|"zIndex"> {
 palette?:PaletteOptions;
 typography?:TypographyVariantsOptions | ((palette:Palette)=>TypographyVariantsOptions);
 transitions?:TransitionsOptions; shadows?:string[]; zIndex?:Partial<ZIndex>;
 mixins?:Partial<Mixins>; motion?:{reducedMotion?:"never"|"always"|"user"};
 cssVariables?:boolean | CssVariablesOptions; defaultColorScheme?:string;
 colorSchemes?:Record<string,boolean | ColorSchemeOptions>;
}
import type { CssThemeVariables, CssVarsPalette, ThemeVars } from "./cssVariables.mjs";
export type { CssThemeVariables, CssVarsPalette, ThemeVars } from "./cssVariables.mjs";
type CssVarState = CssThemeVariables extends { enabled:true } ? { vars:ThemeVars } : { vars?:ThemeVars };
export interface Theme extends SystemTheme, CssVarState {
 palette:Palette & (CssThemeVariables extends {enabled:true} ? CssVarsPalette : {}); typography:TypographyVariants; transitions:Transitions;
 shadows:string[]; zIndex:ZIndex; mixins:Mixins;
 motion:{reducedMotion:"never"|"always"|"user"};
 alpha:(color:string,value:number)=>string;
 lighten:(color:string,value:number)=>string;
 darken:(color:string,value:number)=>string;
 cssVarPrefix?:string; rootSelector?:string; colorSchemeSelector?:string; defaultColorScheme?:string;
 colorSchemes?:Record<string,ColorSchemeOptions & {palette:Palette}>;
 generateThemeVars?:()=>NonNullable<Theme["vars"]>;
 generateStyleSheets?:()=>CSSObject[];
 generateSpacing?:()=>Theme["spacing"];
 getCssVar?:(field:string,...fallbacks:string[])=>string;
 getColorSchemeSelector?:(scheme:string)=>string;
}
export default function createTheme(options?:ThemeOptions,...overrides:object[]):Theme;
