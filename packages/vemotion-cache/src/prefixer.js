import {DECLARATION, KEYFRAMES, MOZ, MS, RULESET, WEBKIT, copy, prefix as stylisPrefix, serialize} from 'vstylis';

// Emotion's vendor prefixes: stylis's rules for the properties Emotion has
// always prefixed, without grid prefixing (Emotion leaves grid to authors),
// selected by property name. Emotion 11.14 bundles a copy of stylis 4.0.13's
// prefixer, which selects properties by a hash of the name's length and first
// four characters, so properties sharing a hash got invented declarations
// (flex-wrap gained -webkit-box-flex-wrap); those are no longer written.

/** Properties whose rules are stylis's own. */
const STYLIS_RULES = new Set(
  `color-adjust animation animation-delay animation-direction animation-duration animation-fill-mode
  animation-iteration-count animation-name animation-play-state animation-timing-function
  text-decoration filter clip-path backface-visibility backdrop-filter column box-decoration-break
  background-clip columns column-count column-fill column-gap column-rule column-rule-color
  column-rule-style column-rule-width column-span column-width mask mask-image mask-mode mask-clip
  mask-size mask-repeat mask-origin mask-position appearance user-select transform hyphens
  text-size-adjust writing-mode flex flex-direction order align-items align-content flex-shrink
  flex-basis flex-grow transition cursor background background-image margin-inline-start
  margin-inline-end padding-inline-start padding-inline-end width height min-width min-height
  max-width max-height inline-size block-size min-inline-size min-block-size max-inline-size
  max-block-size position`
    .trim()
    .split(/\s+/),
);

/**
 * @param {string} value the declaration, `name:value;`
 * @param {number} length the name's length
 * @returns {string}
 */
export function prefix(value, length) {
  const name = value.slice(0, length);
  switch (name) {
    case 'mask-composite':
      // Emotion keeps the standard keywords.
      return WEBKIT + value + value;
    case 'align-self': {
      // IE's -ms-flex-item-align (no grid alignment).
      return WEBKIT + value + MS + 'flex-item-' + value.replace(/flex-|-self/g, '') + value;
    }
    case 'justify-content':
      return value.replace(/(.+:)(flex-)?(.*)/, WEBKIT + 'box-pack:$3' + MS + 'flex-pack:$3').replace(/space-between/g, 'justify') + WEBKIT + value + value;
    case 'display':
      // flex and inline-flex (no -ms-grid).
      return /^display:\s*(inline-)?flex\s*(!important\s*)?;?$/.test(value) ? stylisPrefix(value, length) : value;
    default:
      return STYLIS_RULES.has(name) ? stylisPrefix(value, length) : value;
  }
}

const SELECTOR_VARIANTS = /(::plac\w+|:read-\w+)/;

/**
 * The prefixer Emotion's caches use by default. Vendor forms of
 * ::placeholder and :read-only/:read-write are written before the rule, each
 * a rule of its own.
 */
export function prefixer(element, index, children, callback) {
  if (element.length < 0 || element.return) return undefined;
  switch (element.type) {
    case DECLARATION:
      element.return = prefix(element.value, element.length);
      return undefined;
    case KEYFRAMES:
      return serialize([copy(element, {value: element.value.replace('@', '@' + WEBKIT)})], callback);
    case RULESET:
      if (!element.length) return undefined;
      return element.props
        .map(selector => {
          switch (SELECTOR_VARIANTS.exec(selector)?.[0]) {
            case ':read-only': case ':read-write':
              return serialize([copy(element, {props: [selector.replace(/:(read-\w+)/, ':' + MOZ + '$1')]})], callback);
            case '::placeholder':
              return serialize(
                [
                  copy(element, {props: [selector.replace(/:(plac\w+)/, ':' + WEBKIT + 'input-$1')]}),
                  copy(element, {props: [selector.replace(/:(plac\w+)/, ':' + MOZ + '$1')]}),
                  copy(element, {props: [selector.replace(/:(plac\w+)/, MS + 'input-$1')]}),
                ],
                callback,
              );
            default:
              return '';
          }
        })
        .join('');
  }
  return undefined;
}
