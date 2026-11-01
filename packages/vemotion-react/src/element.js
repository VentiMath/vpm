import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectAlwaysWithSyncFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import {getRegisteredStyles, insertStyles, registerStyles} from 'vemotion-utils';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {getLabelFromStackTrace} from './label.js';
import {ThemeContext} from './theming.js';

// The element a css prop renders through: it serializes the css prop with
// the element's registered class names, inserts the styles and renders the
// original element with the class.

const TYPE = '__EMOTION_TYPE_PLEASE_DO_NOT_USE__';
const LABEL = '__EMOTION_LABEL_PLEASE_DO_NOT_USE__';
const hasOwn = Object.prototype.hasOwnProperty;

/** The props of the css prop element for an element of `type`. */
export function createEmotionProps(type, props) {
  if (isDevelopment && typeof props.css === 'string' && props.css.includes(':')) {
    throw new Error(`Strings are not allowed as css prop values, please wrap it in a css template literal from '@emotion/react' like this: css\`${props.css}\``);
  }
  const emotionProps = {};
  for (const key in props) if (hasOwn.call(props, key)) emotionProps[key] = props[key];
  emotionProps[TYPE] = type;
  // Opt-in runtime labels, unless the Babel plugin labeled the styles.
  if (isDevelopment && globalThis.EMOTION_RUNTIME_AUTO_LABEL && props.css && (typeof props.css !== 'object' || typeof props.css.name !== 'string' || !props.css.name.includes('-'))) {
    const label = getLabelFromStackTrace(new Error().stack);
    if (label) emotionProps[LABEL] = label;
  }
  return emotionProps;
}

/** Inserts styles; on the server, renders them in a style element. */
function Insertion({cache, serialized, isStringTag}) {
  registerStyles(cache, serialized, isStringTag);
  const rules = useInsertionEffectAlwaysWithSyncFallback(() => insertStyles(cache, serialized, isStringTag));
  if (isBrowser || rules === undefined) return null;
  let names = serialized.name;
  for (let next = serialized.next; next !== undefined; next = next.next) names += ' ' + next.name;
  return React.createElement('style', {'data-emotion': `${cache.key} ${names}`, dangerouslySetInnerHTML: {__html: rules}, nonce: cache.sheet.nonce});
}

const Emotion = withEmotionCache((props, cache, ref) => {
  let cssProp = props.css;
  // A class name from Emotion's css() (the vanilla package) stands for its styles.
  if (typeof cssProp === 'string' && cache.registered[cssProp] !== undefined) cssProp = cache.registered[cssProp];
  const WrappedComponent = props[TYPE];
  const registeredStyles = [cssProp];
  let className = '';
  if (typeof props.className === 'string') className = getRegisteredStyles(cache.registered, registeredStyles, props.className);
  else if (props.className != null) className = `${props.className} `;
  let serialized = serializeStyles(registeredStyles, undefined, React.useContext(ThemeContext));
  if (isDevelopment && !serialized.name.includes('-') && props[LABEL]) serialized = serializeStyles([serialized, 'label:' + props[LABEL] + ';']);
  className += `${cache.key}-${serialized.name}`;
  const newProps = {};
  for (const key in props) {
    if (hasOwn.call(props, key) && key !== 'css' && key !== TYPE && (!isDevelopment || key !== LABEL)) newProps[key] = props[key];
  }
  newProps.className = className;
  if (ref) newProps.ref = ref;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Insertion, {cache, serialized, isStringTag: typeof WrappedComponent === 'string'}),
    React.createElement(WrappedComponent, newProps),
  );
});
if (isDevelopment) Emotion.displayName = 'EmotionCssPropInternal';

export default Emotion;
export const hasCss = props => props != null && hasOwn.call(props, 'css');
