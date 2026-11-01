import isBrowser from '#is-browser';

// Registration and insertion of serialized styles in an Emotion cache.

/**
 * Splits a className into the styles registered for its Emotion classes
 * (pushed onto registeredStyles) and the other class names (returned, each
 * followed by a space).
 * @param {Record<string, string | undefined>} registered
 * @param {string[]} registeredStyles
 * @param {string} classNames
 * @returns {string}
 */
export function getRegisteredStyles(registered, registeredStyles, classNames) {
  let rawClassName = '';
  for (const className of classNames.split(' ')) {
    if (registered[className] !== undefined) registeredStyles.push(`${registered[className]};`);
    else if (className) rawClassName += `${className} `;
  }
  return rawClassName;
}

/**
 * Records a class's styles so that components composing it can find them.
 * Styles of string-tag components (`<div className>`) are not needed later,
 * except on the server in compat mode, where @emotion/server tells global
 * styles from class styles by registration.
 */
export function registerStyles(cache, serialized, isStringTag) {
  const className = `${cache.key}-${serialized.name}`;
  if ((isStringTag === false || (!isBrowser && cache.compat !== undefined)) && cache.registered[className] === undefined) {
    cache.registered[className] = serialized.styles;
  }
}

/**
 * Registers and inserts serialized styles (and the keyframes and other
 * styles chained after them) once per cache. On the server, returns the CSS
 * inserted, for rendering inline.
 * @returns {string | undefined}
 */
export function insertStyles(cache, serialized, isStringTag) {
  registerStyles(cache, serialized, isStringTag);
  if (cache.inserted[serialized.name] !== undefined) return undefined;
  const className = `${cache.key}-${serialized.name}`;
  let css = '';
  for (let current = serialized; current !== undefined; current = current.next) {
    const output = cache.insert(current === serialized ? `.${className}` : '', current, cache.sheet, true);
    if (!isBrowser && output !== undefined) css += output;
  }
  return !isBrowser && css.length !== 0 ? css : undefined;
}
