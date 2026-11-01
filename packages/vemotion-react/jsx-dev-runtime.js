import * as ReactJSXRuntimeDev from 'react/jsx-dev-runtime';
import Emotion, {createEmotionProps, hasCss} from './src/element.js';

// The automatic JSX development runtime with the css prop.
export const Fragment = ReactJSXRuntimeDev.Fragment;
export const jsxDEV = (type, props, key, isStaticChildren, source, self) =>
  hasCss(props)
    ? ReactJSXRuntimeDev.jsxDEV(Emotion, createEmotionProps(type, props), key, isStaticChildren, source, self)
    : ReactJSXRuntimeDev.jsxDEV(type, props, key, isStaticChildren, source, self);
