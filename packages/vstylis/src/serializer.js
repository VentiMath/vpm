import {COMMENT, DECLARATION, IMPORT, KEYFRAMES, LAYER, NAMESPACE, RULESET} from './constants.js';

/**
 * Serializes elements with a middleware. Elements added to the list while it
 * is serialized (lifted by a plugin) are serialized too.
 * @param {object[]} children
 * @param {Function} callback
 * @returns {string}
 */
export function serialize(children, callback) {
  let output = '';
  for (let index = 0; index < children.length; index++) output += callback(children[index], index, children, callback) || '';
  return output;
}

/**
 * The middleware that prints elements as CSS. Comments are dropped; rules
 * and blocks without content print nothing.
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 * @param {Function} callback
 * @returns {string}
 */
export function stringify(element, index, children, callback) {
  switch (element.type) {
    case LAYER:
      if (element.children.length) break;
    // @layer a, b; is a statement
    // falls through
    case IMPORT: case NAMESPACE: case DECLARATION:
      return (element.return = element.return || element.value);
    case COMMENT:
      return '';
    case KEYFRAMES:
      return (element.return = element.value + '{' + serialize(element.children, callback) + '}');
    case RULESET:
      if (!(element.value = element.props.join(','))) return '';
  }
  const content = serialize(element.children, callback);
  return content ? (element.return = element.value + '{' + content + '}') : '';
}
