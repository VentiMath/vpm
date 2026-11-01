import {DECLARATION, KEYFRAMES, MOZ, MS, RULESET, WEBKIT} from './constants.js';
import {copy, lift} from './element.js';
import {prefix} from './prefix.js';
import {serialize} from './serializer.js';
import {tokenize} from './tokenize.js';

/**
 * Combines middleware into one, concatenating their output.
 * @param {Function[]} collection
 * @returns {Function}
 */
export function middleware(collection) {
  return (element, index, children, callback) => {
    let output = '';
    for (const plugin of collection) output += plugin(element, index, children, callback) || '';
    return output;
  };
}

/**
 * Calls back with each top-level rule's CSS once it is printed (after
 * stringify), for insertion one rule at a time.
 * @param {(rule: string) => void} callback
 * @returns {Function}
 */
export function rulesheet(callback) {
  return element => {
    if (!element.root && element.return) callback(element.return);
  };
}

const SELECTOR_VARIANTS = /(::plac\w+|:read-\w+)/;

/** Vendor forms of a selector using ::placeholder or :read-only/:read-write. */
function selectorVariants(selector, variant) {
  if (variant === '::placeholder') {
    return [
      selector.replace(/:(plac\w+)/, ':' + WEBKIT + 'input-$1'),
      selector.replace(/:(plac\w+)/, ':' + MOZ + '$1'),
      selector.replace(/:(plac\w+)/, MS + 'input-$1'),
    ];
  }
  if (variant === ':read-only' || variant === ':read-write') return [selector.replace(/:(read-\w+)/, ':' + MOZ + '$1')];
  return [];
}

/**
 * Adds vendor-prefixed declarations, @-webkit-keyframes, and rules for the
 * vendor forms of ::placeholder and :read-only/:read-write. Each form of such
 * a selector becomes a rule of its own (a browser drops a whole rule for one
 * selector it does not know), added to the top-level list.
 */
export function prefixer(element, index, children, callback) {
  if (element.length < 0 || element.return) return;
  switch (element.type) {
    case DECLARATION:
      element.return = prefix(element.value, element.length, children);
      return;
    case KEYFRAMES:
      return serialize([copy(element, {value: element.value.replace('@', '@' + WEBKIT)})], callback);
    case RULESET: {
      if (!element.length) return; // no colon in the selector or around it
      const selectors = element.props;
      for (const selector of selectors) {
        const variant = SELECTOR_VARIANTS.exec(selector)?.[0];
        const forms = selectorVariants(selector, variant);
        if (!forms.length) continue;
        for (const form of [...forms, selector]) lift(copy(element, {props: [form]}));
        element.props = selectors.filter(other => !SELECTOR_VARIANTS.test(other));
      }
      return '';
    }
  }
}

/**
 * Scopes nested selectors for isolation (the first selector is the scope):
 * `:global(selector)` escapes the scope.
 */
export function namespace(element) {
  if (element.type !== RULESET) return;
  element.props = element.props.map(selector => {
    let scope = '';
    return tokenize(selector)
      .map((token, index, tokens) => {
        switch (token.charCodeAt(0) | 0) {
          case 12: // \f
            return token.slice(1);
          case 0: case 40: case 43: case 62: case 126: // ( + > ~
            return token;
          case 58: // :
            if (tokens[++index] === 'global') {
              tokens[index] = '';
              tokens[index + 1] = '\f' + (tokens[index + 1] ?? '').slice(1, -1);
              index = 1;
            }
          // falls through
          case 32:
            return index === 1 ? '' : token;
          default: {
            if (index === 0) {
              scope = token;
              return tokens.length > 1 ? '' : token;
            }
            const last = tokens.length - 1;
            if (index === last || index === 2) return last === 2 ? token + scope + scope : token + scope;
            return token;
          }
        }
      })
      .join('');
  });
}
