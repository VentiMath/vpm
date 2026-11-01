import isPropValid from 'vemotion-is-prop-valid';

// Which props a styled component passes on to what it renders.

const forwardToComponent = key => key !== 'theme';

/**
 * DOM elements (lower-case tags) get only DOM attributes and event handlers;
 * components get every prop but the theme.
 */
export const getDefaultShouldForwardProp = tag => (typeof tag === 'string' && tag.charCodeAt(0) > 96 ? isPropValid : forwardToComponent);

/**
 * The options' shouldForwardProp, combined with the one a styled component
 * being styled again was created with.
 */
export function composeShouldForwardProps(tag, options, isReal) {
  let shouldForwardProp;
  if (options) {
    const fromOptions = options.shouldForwardProp;
    shouldForwardProp = tag.__emotion_forwardProp && fromOptions ? prop => tag.__emotion_forwardProp(prop) && fromOptions(prop) : fromOptions;
  }
  if (typeof shouldForwardProp !== 'function' && isReal) shouldForwardProp = tag.__emotion_forwardProp;
  return shouldForwardProp;
}
