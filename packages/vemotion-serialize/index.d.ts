import type * as CSS from 'csstype';
import type {RegisteredCache, SerializedStyles} from 'vemotion-utils';

export type {RegisteredCache, SerializedStyles};

/** CSS properties, with numbers for lengths (px) and unitless values. */
export type CSSProperties = CSS.PropertiesFallback<number | string>;
/** CSS properties whose values may also be fallback lists. */
export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]: CSSProperties[K] | ReadonlyArray<Extract<CSSProperties[K], string>>;
};
export type CSSPseudos = {[K in CSS.Pseudos]?: CSSObject};

export interface ArrayCSSInterpolation extends ReadonlyArray<CSSInterpolation> {}

/** A styled component used as a selector. */
export interface ComponentSelector {
  __emotion_styles: any;
}

/** keyframes(): usable as an object and, interpolated, as its name. */
export type Keyframes = {
  name: string;
  styles: string;
  anim: number;
  toString: () => string;
} & string;

export type InterpolationPrimitive = null | undefined | boolean | number | string | ComponentSelector | Keyframes | SerializedStyles | CSSObject;
export type CSSInterpolation = InterpolationPrimitive | ArrayCSSInterpolation;

export interface CSSOthersObject {
  [propertiesName: string]: CSSInterpolation;
}
/** A style object: properties, pseudo-classes, and nested selectors or at-rules. */
export interface CSSObject extends CSSPropertiesWithMultiValues, CSSPseudos, CSSOthersObject {}

export interface ArrayInterpolation<Props = unknown> extends ReadonlyArray<Interpolation<Props>> {}
export interface FunctionInterpolation<Props = unknown> {
  (props: Props): Interpolation<Props>;
}
export type Interpolation<Props = unknown> = InterpolationPrimitive | ArrayInterpolation<Props> | FunctionInterpolation<Props>;

/**
 * Serializes style arguments (a tagged template's strings and values, or
 * interpolations) against registered class names and props.
 */
export declare function serializeStyles<Props>(args: Array<TemplateStringsArray | Interpolation<Props>>, registered?: RegisteredCache, mergedProps?: Props): SerializedStyles;
