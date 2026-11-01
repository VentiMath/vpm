import {COMMENT} from 'vstylis';

// Emotion's own stylis plugins.

/**
 * Splits a nested rule's selector at top-level commas. A selector starting
 * with `:` gets an `&` (Emotion resolves `:hover` against the parent rule, as
 * `&:hover`). Reports which selectors contain an `&` (the `&\f` stylis marks)
 * outside strings, parentheses and brackets.
 * @param {string} value
 * @returns {{selectors: string[], ampersands: boolean[]}}
 */
function splitSelectors(value) {
  const selectors = [];
  const ampersands = [];
  let current = '';
  let ampersand = false;
  const start = index => {
    current = value.charCodeAt(index) === 58 ? '&\f' : '';
    ampersand = current !== '';
  };
  start(0);
  for (let i = 0; i < value.length; i++) {
    const character = value[i];
    if (character === '"' || character === "'" || character === '(' || character === '[') {
      // A delimited group, verbatim.
      const end = closingIndex(value, i);
      current += value.slice(i, end);
      i = end - 1;
    } else if (character === ',') {
      selectors.push(current);
      ampersands.push(ampersand);
      start(i + 1);
    } else {
      if (character === '&' && value[i + 1] === '\f') ampersand = true;
      current += character;
    }
  }
  selectors.push(current);
  ampersands.push(ampersand);
  return {selectors, ampersands};
}

/** The index after the group opened at `index` (nested groups and escapes skipped). */
function closingIndex(value, index) {
  const open = value[index];
  const close = open === '(' ? ')' : open === '[' ? ']' : open;
  for (let i = index + 1; i < value.length; i++) {
    const character = value[i];
    if (character === '\\') i++;
    else if (character === close) return i + 1;
    else if ((character === '"' || character === "'") && open !== '"' && open !== "'") i = closingIndex(value, i) - 1;
    else if (character === '(' && open === '(') i = closingIndex(value, i) - 1;
  }
  return value.length;
}

// Rules whose selectors were already resolved here.
const resolved = new WeakSet();

/**
 * Resolves nested selectors as Emotion 10 did: one starting with `:` applies
 * to the parent rule (`&:hover`), and each comma-separated selector against
 * each of the parent rule's selectors.
 */
export function compat(element) {
  // A positive length means the rule or its parent has a pseudo selector; a
  // negative one marks a rule written by a plugin.
  if (element.type !== 'rule' || !element.parent || element.length < 1) return;
  const value = element.value;
  let parent = element.parent;
  // The rule stylis inserts for declarations at each nesting level shares its
  // selectors with its parent rule, already resolved.
  const implicit = element.column === parent.column && element.line === parent.line;
  while (parent.type !== 'rule') {
    parent = parent.parent;
    if (!parent) return;
  }
  if (element.props.length === 1 && value.charCodeAt(0) !== 58 && !resolved.has(parent)) return;
  if (implicit) return;
  resolved.add(element);
  const {selectors, ampersands} = splitSelectors(value);
  const parentSelectors = parent.props;
  let k = 0;
  for (let i = 0; i < selectors.length; i++) {
    for (const parentSelector of parentSelectors) {
      element.props[k++] = ampersands[i] ? selectors[i].replace(/&\f/g, parentSelector) : `${parentSelector} ${selectors[i]}`;
    }
  }
}

/** Drops `label:` declarations, which only name the class. */
export function removeLabel(element) {
  if (element.type === 'decl' && element.value.charCodeAt(0) === 108 && element.value.charCodeAt(2) === 98) {
    element.return = '';
    element.value = '';
  }
}

const IGNORE_FLAG = 'emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason';
const isIgnoringComment = element => element.type === COMMENT && element.children.includes(IGNORE_FLAG);

/**
 * Development: warns about :first-child, :nth-child and :nth-last-child,
 * which server rendering breaks (style elements become children), unless a
 * comment just before the rule carries the ignore flag.
 */
export function createUnsafeSelectorsAlarm(cache) {
  return (element, index, children) => {
    if (element.type !== 'rule' || cache.compat) return;
    const unsafe = element.value.match(/(:first|:nth|:nth-last)-child/g);
    if (!unsafe) return;
    // Comments before a nested rule are children of the rule stylis inserts
    // for declarations, its parent; at the top level they are siblings.
    const comments = element.parent ? element.parent.children : children;
    for (let i = comments.length - 1; i >= 0; i--) {
      const node = comments[i];
      if (node.line < element.line) break;
      if (node.column < element.column) {
        if (isIgnoringComment(node)) return;
        break;
      }
    }
    for (const pseudoClass of unsafe) {
      console.error(`The pseudo class "${pseudoClass}" is potentially unsafe when doing server-side rendering. Try changing it to "${pseudoClass.split('-child')[0]}-of-type".`);
    }
  };
}

const isImportRule = element => element.type.charCodeAt(1) === 105 && element.type.charCodeAt(0) === 64; // @i(mport)

/** Removes an element from further processing. */
function nullify(element) {
  element.type = '';
  element.value = '';
  element.return = '';
  element.children = '';
  element.props = '';
}

/** Development: reports and drops @import rules that are nested or follow other rules. */
export function incorrectImportAlarm(element, index, children) {
  if (!isImportRule(element)) return;
  if (element.parent) {
    console.error("`@import` rules can't be nested inside other rules. Please move it to the top level and put it before regular rules. Keep in mind that they can only be used within global styles.");
    nullify(element);
    return;
  }
  for (let i = index - 1; i >= 0; i--) {
    if (!isImportRule(children[i])) {
      console.error("`@import` rules can't be after other rules. Please put your `@import` rules before your other rules.");
      nullify(element);
      return;
    }
  }
}
