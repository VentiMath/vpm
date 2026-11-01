import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectAlwaysWithSyncFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import {getRegisteredStyles, insertStyles, registerStyles} from 'vemotion-utils';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {ThemeContext} from './theming.js';

/** Joins class names: strings, arrays, and objects' keys with truthy values. */
function classnames(args) {
  let className = '';
  for (const arg of args) {
    if (arg == null || typeof arg === 'boolean') continue;
    let add;
    if (Array.isArray(arg)) {
      add = classnames(arg);
    } else if (typeof arg === 'object') {
      if (isDevelopment && arg.styles !== undefined && arg.name !== undefined) {
        console.error(
          'You have passed styles created with `css` from `@emotion/react` package to the `cx`.\n' +
            '`cx` is meant to compose class names (strings) so you should convert those styles to a class name by passing them to the `css` received from <ClassNames/> component.',
        );
      }
      add = Object.keys(arg).filter(key => arg[key] && key).join(' ');
    } else {
      add = arg;
    }
    if (add) className += (className ? ' ' : '') + add;
  }
  return className;
}

/** Merges two or more Emotion classes into one, in order; keeps other classes. */
function merge(registered, css, className) {
  const registeredStyles = [];
  const rawClassName = getRegisteredStyles(registered, registeredStyles, className);
  return registeredStyles.length < 2 ? className : rawClassName + css(registeredStyles);
}

function Insertion({cache, serializedArr}) {
  const rules = useInsertionEffectAlwaysWithSyncFallback(() => {
    let css = '';
    for (const serialized of serializedArr) {
      const output = insertStyles(cache, serialized, false);
      if (!isBrowser && output !== undefined) css += output;
    }
    return isBrowser ? undefined : css;
  });
  if (isBrowser || rules.length === 0) return null;
  return React.createElement('style', {'data-emotion': `${cache.key} ${serializedArr.map(serialized => serialized.name).join(' ')}`, dangerouslySetInnerHTML: {__html: rules}, nonce: cache.sheet.nonce});
}

/** Render-prop access to css (styles to a class name) and cx (merging class names). */
export const ClassNames = withEmotionCache((props, cache) => {
  let hasRendered = false;
  const serializedArr = [];
  const css = (...args) => {
    if (hasRendered && isDevelopment) throw new Error('css can only be used during render');
    const serialized = serializeStyles(args, cache.registered);
    serializedArr.push(serialized);
    // Registered now: cx may compose it.
    registerStyles(cache, serialized, false);
    return `${cache.key}-${serialized.name}`;
  };
  const cx = (...args) => {
    if (hasRendered && isDevelopment) throw new Error('cx can only be used during render');
    return merge(cache.registered, css, classnames(args));
  };
  const element = props.children({css, cx, theme: React.useContext(ThemeContext)});
  hasRendered = true;
  return React.createElement(React.Fragment, null, React.createElement(Insertion, {cache, serializedArr}), element);
});
if (isDevelopment) ClassNames.displayName = 'EmotionClassNames';
