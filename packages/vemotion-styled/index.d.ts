import type * as React from 'react';
import type {Theme} from 'vemotion-react';
import type {CreateStyled as BaseCreateStyled, CreateStyledComponent} from './types.js';
export type {ArrayInterpolation, ComponentSelector, CSSObject, FunctionInterpolation, Interpolation} from 'vemotion-serialize';
export type {CreateStyledComponent, FilteringStyledOptions, StyledComponent, StyledOptions} from './types.js';

/** styled.div, styled.svg...: styled for each element. */
export type StyledTags = {
  [Tag in keyof React.JSX.IntrinsicElements]: CreateStyledComponent<{theme?: Theme; as?: React.ElementType}, React.JSX.IntrinsicElements[Tag]>;
};
export interface CreateStyled extends BaseCreateStyled, StyledTags {}
declare const styled: CreateStyled;
export default styled;
