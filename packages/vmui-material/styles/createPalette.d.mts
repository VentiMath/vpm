export type PaletteMode = "light" | "dark";
export interface PaletteColor {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}
export interface SimplePaletteColorOptions {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}
export interface Color {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  A100: string;
  A200: string;
  A400: string;
  A700: string;
}
export type ColorPartial = Partial<Color>;
export type PaletteColorOptions = SimplePaletteColorOptions | ColorPartial;
export type PaletteTonalOffset = number | { light: number; dark: number };
export interface CommonColors {
  black: string;
  white: string;
}
export interface TypeText {
  primary: string;
  secondary: string;
  disabled: string;
  icon?: string;
}
export interface TypeBackground {
  paper: string;
  default: string;
}
export interface TypeAction {
  active: string;
  hover: string;
  hoverOpacity: number;
  selected: string;
  selectedOpacity: number;
  disabled: string;
  disabledBackground: string;
  disabledOpacity: number;
  focus: string;
  focusOpacity: number;
  activatedOpacity: number;
}
export interface TypeObject {
  text: TypeText;
  background: TypeBackground;
  action: TypeAction;
  divider: string;
}
export interface PaletteAugmentColorOptions {
  color: PaletteColorOptions;
  name?: string | number;
  mainShade?: string | number;
  lightShade?: string | number;
  darkShade?: string | number;
}
export interface Palette extends TypeObject {
  mode: PaletteMode;
  common: CommonColors;
  grey: Color;
  contrastThreshold: number;
  tonalOffset: PaletteTonalOffset;
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;
  getContrastText(background: string): string;
  augmentColor(options: PaletteAugmentColorOptions): PaletteColor;
}
export interface PaletteOptions {
  mode?: PaletteMode;
  common?: Partial<CommonColors>;
  grey?: ColorPartial;
  contrastThreshold?: number;
  tonalOffset?: PaletteTonalOffset;
  primary?: PaletteColorOptions;
  secondary?: PaletteColorOptions;
  error?: PaletteColorOptions;
  warning?: PaletteColorOptions;
  info?: PaletteColorOptions;
  success?: PaletteColorOptions;
  text?: Partial<TypeText>;
  background?: Partial<TypeBackground>;
  action?: Partial<TypeAction>;
  divider?: string;
  getContrastText?: (background: string) => string;
  colorSpace?: string;
}
export const light: TypeObject;
export const dark: TypeObject;
export function contrastColor(background: string): string;
export default function createPalette(options?: PaletteOptions): Palette;
