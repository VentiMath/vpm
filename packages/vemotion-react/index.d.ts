import * as React from 'react';
import type {EmotionCache} from 'vemotion-cache';
import type {ArrayInterpolation, ComponentSelector, CSSInterpolation, CSSObject, FunctionInterpolation, Interpolation, Keyframes, SerializedStyles} from 'vemotion-serialize';
import type {EmotionJSX, ReactJSX} from './jsx-namespace.js';

export type {EmotionCache, ArrayInterpolation, ComponentSelector, CSSObject, FunctionInterpolation, Interpolation, Keyframes, SerializedStyles};

/** The theme; applications describe theirs by augmenting this interface. */
export interface Theme {}

/** Props of a component (or element), with defaultProps made optional. */
export type PropsOf<C extends keyof ReactJSX.IntrinsicElements | React.JSXElementConstructor<any>> = ReactJSX.LibraryManagedAttributes<C, React.ComponentProps<C>>;
export type DistributiveOmit<T, U> = T extends any ? Pick<T, Exclude<keyof T, U>> : never;

export interface ThemeProviderProps {
  theme: Partial<Theme> | ((outerTheme: Theme) => Theme);
  children: React.ReactNode;
}
export interface ThemeProvider {
  (props: ThemeProviderProps): React.ReactElement;
}
export declare const ThemeProvider: ThemeProvider;
export type WithTheme<P, T> = P extends {theme: infer Theme} ? P & {theme: Exclude<Theme, undefined>} : P & {theme: T};
export declare const ThemeContext: React.Context<Theme>;
export declare function useTheme(): Theme;
export declare function withTheme<C extends React.ComponentType<React.ComponentProps<C>>>(Component: C): React.ForwardRefExoticComponent<DistributiveOmit<PropsOf<C>, 'theme'> & {theme?: Theme}>;

export declare const CacheProvider: React.Provider<EmotionCache>;
export declare function __unsafe_useEmotionCache(): EmotionCache | null;
export declare function withEmotionCache<Props, RefType = any>(
  func: (props: React.PropsWithoutRef<Props>, context: EmotionCache, ref?: React.ForwardedRef<RefType>) => React.ReactNode,
): React.FC<React.PropsWithoutRef<Props> & React.RefAttributes<RefType>> | React.ForwardRefExoticComponent<React.PropsWithoutRef<Props> & React.RefAttributes<RefType>>;

export declare function css(template: TemplateStringsArray, ...args: Array<CSSInterpolation>): SerializedStyles;
export declare function css(...args: Array<CSSInterpolation>): SerializedStyles;
export declare function keyframes(template: TemplateStringsArray, ...args: Array<CSSInterpolation>): Keyframes;
export declare function keyframes(...args: Array<CSSInterpolation>): Keyframes;

export interface GlobalProps {
  styles: Interpolation<Theme>;
}
export declare const Global: React.FC<GlobalProps & React.RefAttributes<any>> | React.ForwardRefExoticComponent<GlobalProps & React.RefAttributes<any>>;

export interface ArrayClassNamesArg extends Array<ClassNamesArg> {}
export type ClassNamesArg = undefined | null | string | boolean | {[className: string]: boolean | null | undefined} | ArrayClassNamesArg;
export interface ClassNamesContent {
  css(template: TemplateStringsArray, ...args: Array<CSSInterpolation>): string;
  css(...args: Array<CSSInterpolation>): string;
  cx(...args: Array<ClassNamesArg>): string;
  theme: Theme;
}
export interface ClassNamesProps {
  children(content: ClassNamesContent): React.ReactNode;
}
export declare const ClassNames: React.FC<ClassNamesProps & React.RefAttributes<any>> | React.ForwardRefExoticComponent<ClassNamesProps & React.RefAttributes<any>>;

/** createElement with the css prop (@jsx jsx). */
export declare const jsx: typeof React.createElement;
export declare namespace jsx {
  namespace JSX {
    type ElementType = EmotionJSX.ElementType;
    interface Element extends EmotionJSX.Element {}
    interface ElementClass extends EmotionJSX.ElementClass {}
    interface ElementAttributesProperty extends EmotionJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends EmotionJSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = EmotionJSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends EmotionJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends EmotionJSX.IntrinsicClassAttributes<T> {}
    type IntrinsicElements = EmotionJSX.IntrinsicElements;
  }
}
export {jsx as createElement};
