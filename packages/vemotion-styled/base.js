import * as React from 'react';
import {ThemeContext, withEmotionCache} from 'vemotion-react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectAlwaysWithSyncFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import {getRegisteredStyles, insertStyles, registerStyles} from 'vemotion-utils';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {composeShouldForwardProps, getDefaultShouldForwardProp} from './src/forward.js';

const ILLEGAL_ESCAPE_SEQUENCE_ERROR = `You have illegal escape sequence in your template literal, most likely inside content's property value.
Because you write your CSS inside a JavaScript string you actually have to do double escaping, so for example "content: '\\00d7';" should become "content: '\\\\00d7';".
You can read more about this here:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#ES2018_revision_of_illegal_escape_sequences`;

/** Inserts styles; on the server, renders them in a style element. */
function Insertion({cache, serialized, isStringTag}) {
  registerStyles(cache, serialized, isStringTag);
  const rules = useInsertionEffectAlwaysWithSyncFallback(() => insertStyles(cache, serialized, isStringTag));
  if (isBrowser || rules === undefined) return null;
  let names = serialized.name;
  for (let next = serialized.next; next !== undefined; next = next.next) names += ' ' + next.name;
  return React.createElement('style', {'data-emotion': `${cache.key} ${names}`, dangerouslySetInnerHTML: {__html: rules}, nonce: cache.sheet.nonce});
}

/**
 * styled(tag, options) returns a function taking styles (a template literal
 * or interpolations) that creates the styled component. Styling a styled
 * component again extends its styles and renders its base tag.
 */
export default function createStyled(tag, options) {
  if (isDevelopment && tag === undefined) throw new Error('You are trying to create a styled element with an undefined component.\nYou may have forgotten to import it.');
  const isReal = tag.__emotion_real === tag;
  const baseTag = (isReal && tag.__emotion_base) || tag;
  const identifierName = options?.label;
  const targetClassName = options?.target;
  const shouldForwardProp = composeShouldForwardProps(tag, options, isReal);
  const defaultShouldForwardProp = shouldForwardProp || getDefaultShouldForwardProp(baseTag);
  // The `as` prop replaces the rendered tag unless it is forwarded.
  const shouldUseAs = !defaultShouldForwardProp('as');

  return function (...args) {
    const styles = isReal && tag.__emotion_styles !== undefined ? tag.__emotion_styles.slice(0) : [];
    if (identifierName !== undefined) styles.push(`label:${identifierName};`);
    const strings = args[0];
    if (strings == null || strings.raw === undefined) {
      styles.push(...args);
    } else {
      if (isDevelopment && strings[0] === undefined) console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
      styles.push(strings[0]);
      for (let i = 1; i < args.length; i++) {
        if (isDevelopment && strings[i] === undefined) console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR);
        styles.push(args[i], strings[i]);
      }
    }

    const Styled = withEmotionCache((props, cache, ref) => {
      const FinalTag = (shouldUseAs && props.as) || baseTag;
      // The theme from context unless given as a prop. Read on every render,
      // so the hooks called stay the same when the prop comes and goes.
      const contextTheme = React.useContext(ThemeContext);
      let mergedProps = props;
      if (props.theme == null) {
        mergedProps = {};
        for (const key in props) mergedProps[key] = props[key];
        mergedProps.theme = contextTheme;
      }
      let className = '';
      const classInterpolations = [];
      if (typeof props.className === 'string') className = getRegisteredStyles(cache.registered, classInterpolations, props.className);
      else if (props.className != null) className = `${props.className} `;
      const serialized = serializeStyles(styles.concat(classInterpolations), cache.registered, mergedProps);
      className += `${cache.key}-${serialized.name}`;
      if (targetClassName !== undefined) className += ` ${targetClassName}`;
      const finalShouldForwardProp = shouldUseAs && shouldForwardProp === undefined ? getDefaultShouldForwardProp(FinalTag) : defaultShouldForwardProp;
      const newProps = {};
      for (const key in props) {
        if (shouldUseAs && key === 'as') continue;
        if (finalShouldForwardProp(key)) newProps[key] = props[key];
      }
      newProps.className = className;
      if (ref) newProps.ref = ref;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Insertion, {cache, serialized, isStringTag: typeof FinalTag === 'string'}),
        React.createElement(FinalTag, newProps),
      );
    });

    Styled.displayName = identifierName !== undefined ? identifierName : `Styled(${typeof baseTag === 'string' ? baseTag : baseTag.displayName || baseTag.name || 'Component'})`;
    Styled.defaultProps = tag.defaultProps;
    Styled.__emotion_real = Styled;
    Styled.__emotion_base = baseTag;
    Styled.__emotion_styles = styles;
    Styled.__emotion_forwardProp = shouldForwardProp;
    // As a selector: its target class (from the Babel plugin).
    Object.defineProperty(Styled, 'toString', {
      value() {
        if (targetClassName === undefined && isDevelopment) return 'NO_COMPONENT_SELECTOR';
        return `.${targetClassName}`;
      },
    });
    Styled.withComponent = (nextTag, nextOptions) =>
      createStyled(nextTag, {...options, ...nextOptions, shouldForwardProp: composeShouldForwardProps(Styled, nextOptions, true)})(...styles);
    return Styled;
  };
}
