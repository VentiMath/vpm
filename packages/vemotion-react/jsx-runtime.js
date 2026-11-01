import * as ReactJSXRuntime from 'react/jsx-runtime';
import Emotion, {createEmotionProps, hasCss} from './src/element.js';

// The automatic JSX runtime with the css prop (jsxImportSource: '@emotion/react').
export const Fragment = ReactJSXRuntime.Fragment;
export const jsx = (type, props, key) => (hasCss(props) ? ReactJSXRuntime.jsx(Emotion, createEmotionProps(type, props), key) : ReactJSXRuntime.jsx(type, props, key));
export const jsxs = (type, props, key) => (hasCss(props) ? ReactJSXRuntime.jsxs(Emotion, createEmotionProps(type, props), key) : ReactJSXRuntime.jsxs(type, props, key));
