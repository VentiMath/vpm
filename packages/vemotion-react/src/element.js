import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {getRegisteredStyles} from 'vemotion-utils';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {getLabelFromStackTrace} from './label.js';
import {useTheme} from './theming.js';
import {StyleBatch, StyleInsertion} from './style-batch.js';

// These names are part of Emotion's JSX/Babel boundary.
const TYPE = '__EMOTION_TYPE_PLEASE_DO_NOT_USE__';
const LABEL = '__EMOTION_LABEL_PLEASE_DO_NOT_USE__';
export const hasCss = props => props != null && Object.hasOwn(props, 'css');
export function createEmotionProps(type, props) {
  if (isDevelopment && typeof props.css === 'string' && props.css.includes(':')) {
    throw new Error(`Strings are not allowed as css prop values, please wrap it in a css template literal from '@emotion/react' like this: css\`${props.css}\``);
  }
  const result = Object.fromEntries(Object.entries(props));
  result[TYPE] = type;
  if (isDevelopment && globalThis.EMOTION_RUNTIME_AUTO_LABEL && props.css &&
    (typeof props.css !== 'object' || typeof props.css.name !== 'string' || !props.css.name.includes('-'))) {
    const label = getLabelFromStackTrace(new Error().stack);
    if (label) result[LABEL] = label;
  }
  return result;
}

function planElement(cache, theme, props, ref) {
  const component = props[TYPE];
  const input = typeof props.css === 'string' && cache.registered[props.css] !== undefined ? cache.registered[props.css] : props.css;
  const arguments_ = [input];
  const existing = typeof props.className === 'string'
    ? getRegisteredStyles(cache.registered, arguments_, props.className)
    : props.className == null ? '' : `${props.className} `;
  let serialized = serializeStyles(arguments_, undefined, theme);
  if (isDevelopment && props[LABEL] && !serialized.name.includes('-')) serialized = serializeStyles([serialized, `label:${props[LABEL]};`]);
  const batch = new StyleBatch(cache, true);
  const forwarded = Object.create(null);
  for (const key of Object.keys(props)) {
    if (key !== 'css' && key !== TYPE && (!isDevelopment || key !== LABEL)) forwarded[key] = props[key];
  }
  forwarded.className = existing + batch.add(serialized, typeof component === 'string');
  if (ref) forwarded.ref = ref;
  return {component, forwarded, batch};
}

const Emotion = withEmotionCache((props, cache, ref) => {
  const plan = planElement(cache, useTheme(), props, ref);
  return React.createElement(React.Fragment, null,
    React.createElement(StyleInsertion, {batch: plan.batch}),
    React.createElement(plan.component, plan.forwarded));
});
if (isDevelopment) Emotion.displayName = 'EmotionCssPropInternal';
export default Emotion;
