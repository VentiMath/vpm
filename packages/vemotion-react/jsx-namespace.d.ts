import type {} from 'react';
import type {Interpolation} from 'vemotion-serialize';
import type {Theme} from './index.js';

/** A css prop for components whose className accepts a string. */
type WithConditionalCSSProp<P> = 'className' extends keyof P ? (string extends P['className' & keyof P] ? {css?: Interpolation<Theme>} : {}) : {};

/** React's JSX types. */
export declare namespace ReactJSX {
  type ElementType = React.JSX.ElementType;
  interface Element extends React.JSX.Element {}
  interface ElementClass extends React.JSX.ElementClass {}
  interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
  interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
  type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
  interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
  type IntrinsicElements = React.JSX.IntrinsicElements;
}

/** React's JSX types with the css prop on elements and className-accepting components. */
export declare namespace EmotionJSX {
  type ElementType = React.JSX.ElementType;
  interface Element extends React.JSX.Element {}
  interface ElementClass extends React.JSX.ElementClass {}
  interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
  interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
  type LibraryManagedAttributes<C, P> = P extends unknown ? WithConditionalCSSProp<P> & React.JSX.LibraryManagedAttributes<C, P> : never;
  interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
  interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
  type IntrinsicElements = {
    [K in keyof React.JSX.IntrinsicElements]: React.JSX.IntrinsicElements[K] & {css?: Interpolation<Theme>};
  };
}
