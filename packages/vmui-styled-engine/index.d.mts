import type * as React from "react";
import type { Interpolation, SerializedStyles } from "vemotion-serialize";
import type { StyledComponent } from "vemotion-styled";
export { default } from "vemotion-styled";
export type {
  CreateStyled,
  StyledComponent,
  StyledOptions,
  StyledTags,
} from "vemotion-styled";
export { ThemeContext, keyframes, css } from "vemotion-react";
export type {
  CSSProperties,
  CSSPropertiesWithMultiValues,
  CSSPseudos,
  CSSOthersObject,
  ArrayCSSInterpolation,
  CSSObject,
  ComponentSelector,
  Keyframes,
  InterpolationPrimitive,
  CSSInterpolation,
  FunctionInterpolation,
  ArrayInterpolation,
  Interpolation,
  SerializedStyles,
} from "vemotion-serialize";
export type MUIStyledComponent<
  C extends {},
  S extends {} = {},
  J extends {} = {},
> = StyledComponent<C, S, J>;
export interface GlobalStylesProps<Theme = {}> {
  styles: Interpolation<Theme>;
  defaultTheme?: object;
}
export function GlobalStyles<Theme = {}>(
  props: GlobalStylesProps<Theme>,
): React.ReactElement;
export interface StyledEngineProviderProps {
  children?: React.ReactNode;
  injectFirst?: false;
  enableCssLayer?: false;
}
export function StyledEngineProvider(
  props: StyledEngineProviderProps,
): React.ReactElement;
export function internal_mutateStyles(
  tag: React.ElementType,
  processor: (styles: any[]) => any[],
): void;
export function internal_serializeStyles<Props>(
  styles: Interpolation<Props>,
): SerializedStyles;

/** MUI supplies its Theme and common props to the underlying style factory. */
export interface CreateStyledComponent<
  C extends {},
  S extends {} = {},
  J extends {} = {},
  T extends object = {},
> {
  <Extra extends {} = {}>(
    ...styles: Array<Interpolation<C & S & Extra & { theme: T }>>
  ): StyledComponent<C & Extra, S, J>;
  <Extra extends {} = {}>(
    template: TemplateStringsArray,
    ...styles: Array<Interpolation<C & S & Extra & { theme: T }>>
  ): StyledComponent<C & Extra, S, J>;
}
export interface FilteringStyledOptions<P, F extends keyof P = keyof P> {
  label?: string;
  target?: string;
  shouldForwardProp?(name: PropertyKey): name is F;
}
export interface CreateMUIStyled<
  Common extends {},
  Options,
  Theme extends object,
> {
  <C extends React.ElementType, F extends keyof React.ComponentPropsWithRef<C>>(
    component: C,
    options: Options &
      FilteringStyledOptions<React.ComponentPropsWithRef<C>, F>,
  ): CreateStyledComponent<
    Common,
    Pick<React.ComponentPropsWithRef<C>, F>,
    {},
    Theme
  >;
  <C extends React.ElementType>(
    component: C,
    options?: Options & {
      label?: string;
      target?: string;
      shouldForwardProp?: (name: PropertyKey) => boolean;
    },
  ): CreateStyledComponent<Common, React.ComponentPropsWithRef<C>, {}, Theme>;
}
