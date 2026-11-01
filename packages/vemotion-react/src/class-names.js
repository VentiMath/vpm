import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {getRegisteredStyles} from 'vemotion-utils';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {useTheme} from './theming.js';
import {StyleBatch, StyleInsertion} from './style-batch.js';

// Iterative traversal preserves left-to-right class order without a depth
// limit imposed by the JS call stack. Shared arrays are valid; cycles are not.
function classTokens(values) {
  const tokens = [], frames = [{values, index: 0}], ancestors = new Set([values]);
  while (frames.length) {
    const frame = frames.at(-1);
    if (frame.index === frame.values.length) {ancestors.delete(frame.values); frames.pop(); continue;}
    const value = frame.values[frame.index++];
    if (!value || typeof value === 'boolean') continue;
    if (Array.isArray(value)) {
      if (ancestors.has(value)) throw new TypeError('Class name arrays must not contain cycles');
      ancestors.add(value); frames.push({values: value, index: 0});
    } else if (typeof value === 'object') {
      if (isDevelopment && value.styles !== undefined && value.name !== undefined) console.error(
        'You have passed styles created with `css` from `@emotion/react` package to the `cx`.\n' +
        '`cx` is meant to compose class names (strings) so you should convert those styles to a class name by passing them to the `css` received from <ClassNames/> component.');
      for (const key of Object.keys(value)) if (key && value[key]) tokens.push(key);
    } else tokens.push('' + value);
  }
  return tokens.join(' ');
}

class ClassNameSession {
  constructor(cache) {
    this.cache = cache;
    this.batch = new StyleBatch(cache);
    this.closed = false;
    this.css = (...styles) => {
      this.check('css');
      return this.batch.add(serializeStyles(styles, cache.registered));
    };
    this.cx = (...names) => {
      this.check('cx');
      const joined = classTokens(names), registered = [];
      const plain = getRegisteredStyles(cache.registered, registered, joined);
      return registered.length < 2 ? joined : plain + this.css(registered);
    };
  }
  check(operation) {
    if (isDevelopment && this.closed) throw new Error(`${operation} can only be used during render`);
  }
}

export const ClassNames = withEmotionCache(({children}, cache) => {
  const theme = useTheme(), session = new ClassNameSession(cache);
  let child;
  try {child = children({css: session.css, cx: session.cx, theme});}
  finally {session.closed = true;}
  return React.createElement(React.Fragment, null, React.createElement(StyleInsertion, {batch: session.batch}), child);
});
if (isDevelopment) ClassNames.displayName = 'EmotionClassNames';
