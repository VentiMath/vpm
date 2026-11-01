import * as React from 'react';
import {ThemeContext} from 'vemotion-react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectAlwaysWithSyncFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import {getRegisteredStyles, insertStyles, registerStyles} from 'vemotion-utils';
import isBrowser from '#is-browser';

function StyleInsertion({cache, serialized, isStringTag}) {
  registerStyles(cache, serialized, isStringTag);
  const rules = useInsertionEffectAlwaysWithSyncFallback(() => insertStyles(cache, serialized, isStringTag));
  if (isBrowser || rules === undefined) return null;
  const names = [];
  for (let node = serialized; node !== undefined; node = node.next) names.push(node.name);
  return React.createElement('style', {
    'data-emotion': `${cache.key} ${names.join(' ')}`,
    nonce: cache.sheet.nonce,
    dangerouslySetInnerHTML: {__html: rules},
  });
}

function resolveStyle(definition, styles, props, theme, cache) {
  const interpolations = [];
  const externalClass = props.className;
  const prefix = typeof externalClass === 'string'
    ? getRegisteredStyles(cache.registered, interpolations, externalClass)
    : externalClass == null ? '' : `${externalClass} `;
  let input = props;
  if (props.theme == null) {
    input = {};
    for (const name in props) input[name] = props[name];
    input.theme = theme;
  }
  const serialized = serializeStyles(styles.concat(interpolations), cache.registered, input);
  const target = definition.options?.target;
  return {serialized, className: prefix + cache.key + '-' + serialized.name + (target === undefined ? '' : ' ' + target)};
}

export function renderStyled(definition, styles, props, cache, ref) {
  // Always subscribe, including renders with an explicit theme prop.
  const theme = React.useContext(ThemeContext);
  const {serialized, className} = resolveStyle(definition, styles, props, theme, cache);
  const {element, forwarded} = definition.destination(props);
  forwarded.className = className;
  if (ref) forwarded.ref = ref;
  return React.createElement(React.Fragment, null,
    React.createElement(StyleInsertion, {cache, serialized, isStringTag: typeof element === 'string'}),
    React.createElement(element, forwarded));
}
