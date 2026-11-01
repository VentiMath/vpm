import {MOZ, MS, WEBKIT} from './constants.js';

// Vendor-prefixed forms of declarations, chosen by the property's name.
// Each rule receives the whole declaration (`name:value;`), the name's
// length and the declarations around it, and returns the prefixed
// declarations followed by the original.

const webkit = value => WEBKIT + value + value;
const webkitMs = value => WEBKIT + value + MS + value + value;
const allVendors = value => WEBKIT + value + MOZ + value + MS + value + value;

/** Older -webkit-mask-composite keywords, by standard keyword. */
const maskCompositeKeywords = {add: 'source-over', subtract: 'source-out', intersect: 'source-in', exclude: 'xor'};

/**
 * The other declaration of a grid item's placement on the same axis.
 * @param {object[] | undefined} children
 * @param {string} name e.g. grid-row-end
 */
const sibling = (children, name) => children?.find(element => element.props === name);

/**
 * IE's grid item placement for a start line, with the span to a matching end
 * line: -ms-grid-row and -ms-grid-row-span, or -ms-grid-column and
 * -ms-grid-column-span.
 */
function gridStart(value, length, children) {
  const axis = value.slice(5, length - 6); // row | column
  const end = sibling(children, 'grid-' + axis + '-end');
  const start = MS + value.replace('-start', '') + value;
  if (!end) return start;
  if (value.includes('span') || end.value.includes('span')) return value;
  const span = +end.value.match(/\d+/) - +value.match(/\d+/);
  return start + MS + 'grid-' + axis + '-span:' + span + ';';
}

/** IE's span for an end line, unless the start line declares it. */
function gridEnd(value, length, children) {
  const axis = value.slice(5, length - 4);
  if (sibling(children, 'grid-' + axis + '-start')) return value;
  return MS + value.replace('-end', '-span').replace('span ', '') + value;
}

/** Sizes: intrinsic keywords under their older vendor names. */
function size(value, length, children) {
  if (value.length - 1 - length <= 6) return value;
  switch (value.charCodeAt(length + 1)) {
    case 109: // (m)ax-content, (m)in-content
      if (value.charCodeAt(length + 4) !== 45) return value;
    // falls through
    case 102: // (f)ill-available, (f)it-content
      return value.replace(/(.+:)(.+)-([^]+)/, '$1' + WEBKIT + '$2-$3' + '$1' + MOZ + (value.charCodeAt(length + 3) === 108 ? '$3' : '$2-$3')) + value;
    case 115: // (s)tretch
      return value.includes('stretch') ? prefix(value.replace('stretch', 'fill-available'), length, children) + value : value;
    default:
      return value;
  }
}

const rules = new Map();
const define = (names, rule) => {
  for (const name of names.split(' ')) rules.set(name, rule);
};

define('color-adjust', value => WEBKIT + 'print-' + value + value);
define(
  'animation animation-delay animation-direction animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state animation-timing-function ' +
    'text-decoration filter clip-path backface-visibility backdrop-filter column box-decoration-break background-clip ' +
    'columns column-count column-fill column-gap column-rule column-rule-color column-rule-style column-rule-width column-span column-width ' +
    'mask mask-image mask-mode mask-clip mask-size mask-repeat mask-origin mask-position',
  webkit,
);
define('mask-composite', (value, length) => {
  const keywords = value.slice(length).replace(/\b(add|subtract|intersect|exclude)\b/g, keyword => maskCompositeKeywords[keyword]);
  return WEBKIT + value.slice(0, length) + keywords + value;
});
define('tab-size', value => MOZ + value + value);
define('appearance user-select transform hyphens text-size-adjust', allVendors);
define('writing-mode', (value, length) => {
  switch (value.charCodeAt(length + 11)) {
    case 114: // vertical-l(r)
      return WEBKIT + value + MS + value.replace(/[svh]\w+-[tblr]{2}/, 'tb') + value;
    case 108: // vertical-r(l)
      return WEBKIT + value + MS + value.replace(/[svh]\w+-[tblr]{2}/, 'tb-rl') + value;
    case 45: // horizontal(-)tb
      return WEBKIT + value + MS + value.replace(/[svh]\w+-[tblr]{2}/, 'lr') + value;
    default:
      return webkitMs(value);
  }
});
define('flex flex-direction scroll-snap-type', webkitMs);
define('order', value => WEBKIT + value + MS + 'flex-' + value + value);
define('align-items', value => WEBKIT + value + value.replace(/(\w+).+(:[^]+)/, WEBKIT + 'box-$1$2' + MS + 'flex-$1$2') + value);
define('align-self', value => {
  const keyword = value.replace(/flex-|-self/g, '');
  return WEBKIT + value + MS + 'flex-item-' + keyword + (/flex-|baseline/.test(value) ? '' : MS + 'grid-row-' + keyword) + value;
});
define('align-content', value => WEBKIT + value + MS + 'flex-line-pack' + value.replace(/align-content|flex-|-self/g, '') + value);
define('flex-shrink', value => WEBKIT + value + MS + value.replace('shrink', 'negative') + value);
define('flex-basis', value => WEBKIT + value + MS + value.replace('basis', 'preferred-size') + value);
define('flex-grow', value => WEBKIT + 'box-' + value.replace('-grow', '') + WEBKIT + value + MS + value.replace('grow', 'positive') + value);
define('transition', value => WEBKIT + value.replace(/([^-])(transform)/g, '$1' + WEBKIT + '$2') + value);
define('cursor', value => value.replace(/(zoom-|grab)/, WEBKIT + '$1').replace(/(image-set)/, WEBKIT + '$1').replace(value, '') + value);
define('background background-image', value => value.replace(/(image-set\([^]*)/, WEBKIT + '$1' + '$`$1'));
define('justify-content', value => value.replace(/(.+:)(flex-)?(.*)/, WEBKIT + 'box-pack:$3' + MS + 'flex-pack:$3').replace(/space-between/, 'justify') + WEBKIT + value + value);
define('justify-self', (value, length) => (/flex-|baseline/.test(value) ? value : MS + 'grid-column-align' + value.slice(length) + value));
define('grid-template-columns grid-template-rows', value => MS + value.replace('template-', '') + value);
define('grid-row-start grid-column-start', gridStart);
define('grid-row-end grid-column-end', gridEnd);
define('margin-inline-start margin-inline-end padding-inline-start padding-inline-end', value => value.replace(/(.+)-inline(.+)/, WEBKIT + '$1$2') + value);
define('width height min-width min-height max-width max-height inline-size block-size min-inline-size min-block-size max-inline-size max-block-size', size);
define('grid-column grid-row', value =>
  value.replace(/(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/, (_, name, start, span, keyword, count, rest) =>
    MS + name + ':' + start + rest + (span ? MS + name + '-span:' + (keyword ? count : +count - +start) + rest : '') + value,
  ),
);
define('position', (value, length) => (value.charCodeAt(length + 6) === 121 ? value.replace(':', ':' + WEBKIT) + value : value)); // stick(y)
define('display', value => {
  const inline = value.charCodeAt(14) === 45;
  switch (value.charCodeAt(inline ? 18 : 11)) {
    case 120: // (inline-)fle(x)
      return value.replace(/(.+:)([^;\s!]+)(;|(\s+)?!.+)?/, '$1' + WEBKIT + (inline ? 'inline-' : '') + 'box$3' + '$1' + WEBKIT + '$2$3' + '$1' + MS + '$2box$3') + value;
    case 100: // (inline-)gri(d)
      return value.replace(':', ':' + MS) + value;
    default:
      return value;
  }
});
define('scroll-margin scroll-margin-top scroll-margin-right scroll-margin-bottom scroll-margin-left', value => value.replace('scroll-', 'scroll-snap-') + value);

/**
 * Adds vendor-prefixed forms of a declaration.
 * @param {string} value the declaration, `name:value;`
 * @param {number} length the length of its name
 * @param {object[]} [children] the declarations of the same rule
 * @returns {string}
 */
export function prefix(value, length, children) {
  const rule = rules.get(value.slice(0, length));
  return rule ? rule(value, length, children) : value;
}
