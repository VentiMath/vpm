import type * as React from "react";
import type { Palette } from "./createPalette.cjs";
export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "button"
  | "caption"
  | "overline";
export interface TypographyStyle extends React.CSSProperties {
  [selector: string]: string | number | undefined | TypographyStyle;
}
export interface FontStyle {
  fontFamily: React.CSSProperties["fontFamily"];
  fontSize: number;
  htmlFontSize: number;
  fontWeightLight: React.CSSProperties["fontWeight"];
  fontWeightRegular: React.CSSProperties["fontWeight"];
  fontWeightMedium: React.CSSProperties["fontWeight"];
  fontWeightBold: React.CSSProperties["fontWeight"];
}
export interface FontStyleOptions extends Partial<FontStyle> {
  allVariants?: TypographyStyle;
}
export interface TypographyUtils {
  pxToRem: (pixels: number) => string;
}
export interface TypographyVariants
  extends
    Record<TypographyVariant, TypographyStyle>,
    FontStyle,
    TypographyUtils {}
export interface TypographyVariantsOptions extends Partial<
  Record<TypographyVariant, TypographyStyle> &
    FontStyleOptions &
    TypographyUtils
> {}
export type TypographyStyleOptions = TypographyStyle;
export default function createTypography(
  palette: Palette,
  options?:
    | TypographyVariantsOptions
    | ((palette: Palette) => TypographyVariantsOptions),
): TypographyVariants;
