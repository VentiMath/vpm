export * from './src/constants.js';
export {compile} from './src/parser.js';
export {serialize, stringify} from './src/serializer.js';
export {middleware, namespace, prefixer, rulesheet} from './src/middleware.js';
export {prefix} from './src/prefix.js';
export {tokenize} from './src/tokenize.js';
export {copy, lift, node} from './src/element.js';

/**
 * The length of a string (kept for plugins written against stylis).
 * @param {string} value
 * @returns {number}
 */
export const strlen = value => value.length;
