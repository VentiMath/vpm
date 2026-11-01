import * as React from 'react';
import Emotion, {createEmotionProps, hasCss} from './element.js';

/** createElement with the css prop (for the classic JSX runtime: @jsx jsx). */
export function jsx(type, props, ...children) {
  if (!hasCss(props)) return React.createElement(type, props, ...children);
  return React.createElement(Emotion, createEmotionProps(type, props), ...children);
}
