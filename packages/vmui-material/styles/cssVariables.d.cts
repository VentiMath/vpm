import type { Palette, PaletteColor, CommonColors, TypeBackground, TypeText, TypeAction } from "./createPalette.cjs";
import type { ZIndex } from "./createTheme.cjs";
import type { TypographyVariant } from "./createTypography.cjs";
/** Opted into by themeCssVarsAugmentation, or by application module augmentation. */
export interface CssThemeVariables {}
type Role = "primary" | "secondary" | "error" | "warning" | "info" | "success";
type Status = Exclude<Role, "primary" | "secondary">;
type Channels<K extends string> = { [P in K as `${P}Channel`]: string };
export interface CssVarsPalette extends Palette {
  common: CommonColors & { background:string; onBackground:string } & Channels<"background"|"onBackground">;
  background: TypeBackground & Channels<"default"|"paper">;
  text: TypeText & Channels<"primary"|"secondary">;
  action: TypeAction & Channels<"active"|"selected">;
  primary: PaletteColor & Channels<keyof PaletteColor>;
  secondary: PaletteColor & Channels<keyof PaletteColor>;
  error: PaletteColor & Channels<keyof PaletteColor>;
  warning: PaletteColor & Channels<keyof PaletteColor>;
  info: PaletteColor & Channels<keyof PaletteColor>;
  success: PaletteColor & Channels<keyof PaletteColor>;
  dividerChannel: string;
  Alert: Record<`${Status}${"Color"|"FilledBg"|"FilledColor"|"StandardBg"|"IconColor"}`,string>;
  AppBar: { defaultBg:string; darkBg?:string; darkColor?:string };
  Avatar: { defaultBg:string };
  Button: { inheritContainedBg:string; inheritContainedHoverBg:string };
  Chip: { defaultBorder:string; defaultAvatarColor:string; defaultIconColor:string };
  FilledInput: { bg:string; hoverBg:string; disabledBg:string };
  Input: { autofillWebkitBoxShadow:string };
  LinearProgress: Record<`${Role}Bg`,string>;
  Slider: Record<`${Role}Track`,string>;
  Skeleton: { bg:string };
  SnackbarContent: { bg:string; color:string };
  SpeedDialAction: { fabHoverBg:string };
  StepConnector: { border:string };
  StepContent: { border:string };
  Switch: { defaultColor:string; defaultDisabledColor:string } & Record<`${Role}DisabledColor`,string>;
  TableCell: { border:string };
  Tooltip: { bg:string };
}
type VariableValues<T> = { [K in keyof T]: T[K] extends object ? VariableValues<T[K]> : string };
export interface ThemeVars {
  palette: VariableValues<Omit<CssVarsPalette,"mode"|"contrastThreshold"|"tonalOffset"|"getContrastText"|"augmentColor">>;
  shadows: string[];
  zIndex: VariableValues<ZIndex>;
  shape: { borderRadius:string };
  spacing: string;
  font: Record<TypographyVariant,string>;
  opacity: Record<"inputPlaceholder"|"inputUnderline"|"switchTrackDisabled"|"switchTrack",string>;
  overlays: string[];
}
