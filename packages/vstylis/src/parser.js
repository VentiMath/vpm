import {COMMENT, DECLARATION, RULESET} from './constants.js';
import {node} from './element.js';
import {Scanner, WHITESPACE, classify} from './scanner.js';

/**
 * Parses CSS, with nesting, into a flat list of top-level elements: nested
 * rules become rules of their own with their selectors resolved against the
 * enclosing ones, and declarations inside conditional at-rules nested in a
 * rule are wrapped in a rule with the enclosing selectors.
 * @param {string} css
 * @returns {object[]}
 */
export function compile(css) {
  const scanner = new Scanner(css);
  const elements = [];
  parse(scanner, {selector: '', root: null, parent: null, owner: null, selectors: [''], rules: elements, inheritedLength: 0, points: [0], declarations: elements});
  return elements;
}

/**
 * Conditional group at-rules (@media, @supports, @document, @container,
 * @layer, @scope, @starting-style) hold rules or, inside a rule, declarations
 * of that rule. Other at-rules (@keyframes, @font-face, @page...) hold their
 * own blocks.
 * @param {number} initial first character of the at-rule's name
 * @param {string} text the at-rule's prelude, from `@`
 */
function isConditionalGroup(initial, text) {
  switch (initial) {
    case 100: case 109: case 115: // d(ocument) m(edia) s(upports|cope|tarting-style)
      return true;
    case 99: // c(ontainer)
      return text.charCodeAt(3) === 110 || text.charCodeAt(2) === 97;
    case 108: // l(ayer)
      return text.charCodeAt(2) === 97;
    default:
      return false;
  }
}

/**
 * Builds a rule (or at-rule) element. Its selectors are the statement's
 * comma-separated segments (ending at `points`), each resolved against every
 * enclosing selector: a segment containing `&` (marked by a negative point)
 * replaces `&` with the enclosing selector, others are its descendants.
 */
function ruleset(scanner, text, root, parent, count, nameEnd, selectors, points, type, props, children, length, siblings) {
  const contexts = nameEnd === 0 ? selectors : [''];
  let start = nameEnd;
  let index = 0;
  for (let i = 0; i < count; i++) {
    const point = points[i];
    const end = Math.abs(point);
    const segment = text.slice(start, end);
    start = end + 1;
    for (const context of contexts) {
      const selector = (point > 0 ? context + ' ' + segment : segment.replace(/&\f/g, context)).trim();
      if (selector) props[index++] = selector;
    }
  }
  return node(text, root, parent, nameEnd === 0 ? RULESET : type, props, children, length, siblings, scanner.line, scanner.column);
}

/**
 * Parses statements until the end of the current block.
 *
 * context.selector: the enclosing statement's text; context.root: the
 * innermost enclosing at-rule; context.parent: the enclosing element;
 * context.owner: the rule declarations belong to (null at the top level);
 * context.selectors: the enclosing rule's resolved selectors; context.rules:
 * the list rules are added to; context.inheritedLength: the enclosing
 * statement's length, inherited by rules without a colon of their own;
 * context.points: shared scratch space for selector boundaries;
 * context.declarations: the list declarations and comments are added to.
 */
function parse(scanner, context) {
  const {selector, root, parent, owner, selectors, rules, inheritedLength, points, declarations} = context;
  // The statement being read.
  let text = '';
  let count = 0; // selector boundaries recorded in points
  let nameEnd = 0; // length of an at-rule's name, 0 for other statements
  let type = ''; // an at-rule's name, with any vendor prefix
  let initial = 0; // first character of an at-rule's name
  let length = inheritedLength; // position after the last colon (or the at-rule's name)
  let colon = -1; // index of the first colon, which ends a declaration's property
  let beforeColon = 0; // the character before that colon
  let ampersand = 1; // -1 while the current selector segment contains &
  let parens = 0; // depth inside a selector or value function
  let custom = false; // reading a custom property (--name), whose value may contain blocks
  let braces = 0; // depth of blocks inside a custom property's value
  let previous = 0;
  let character = 0;

  const resetStatement = () => {
    text = type = '';
    count = nameEnd = 0;
    colon = -1;
    beforeColon = 0;
    ampersand = 1;
    custom = false;
    braces = 0;
    length = inheritedLength;
  };

  const declaration = () => {
    if (ampersand === -1) text = text.replace(/\f/g, '');
    if (colon < 0 || beforeColon === 0) return;
    if (text.length === colon + 1 && !(custom && braces === 0)) return; // no value
    let value = text;
    let nameLength = colon;
    if (beforeColon <= 32 && text.charCodeAt(colon - 1) === 32) {
      value = text.slice(0, colon - 1) + text.slice(colon);
      nameLength--;
    }
    value += ';';
    declarations.push(node(value, owner, parent, DECLARATION, value.slice(0, nameLength), value.slice(nameLength + 1, -1), nameLength, declarations, scanner.line, scanner.column));
  };

  const block = () => {
    let props, children;
    const element = ruleset(scanner, text, root, parent, count, nameEnd, selectors, points, type, (props = []), (children = []), length, rules);
    rules.push(element);
    if (character !== 123) return;
    if (nameEnd === 0) {
      // A rule: nested rules join the same list, resolved against this one.
      parse(scanner, {selector: text, root, parent: element, owner: element, selectors: props, rules, inheritedLength: length, points, declarations: children});
    } else if (isConditionalGroup(initial, text)) {
      // Inside a rule, declarations go into a rule with its selectors.
      let target = children;
      let implicit = null;
      if (owner) {
        target = [];
        implicit = ruleset(scanner, selector, element, element, 0, 0, selectors, points, type, selectors, target, length, children);
        children.push(implicit);
      }
      parse(scanner, {selector, root: element, parent: element, owner: implicit, selectors, rules: children, inheritedLength: length, points, declarations: target});
    } else {
      parse(scanner, {selector: text, root: element, parent: element, owner: element, selectors: [''], rules: children, inheritedLength: 0, points, declarations: children});
    }
  };

  for (;;) {
    previous = character;
    character = scanner.next();

    // Braces inside a custom property's value are part of the value; the
    // block's closing brace ends the property and the block.
    if (custom && (character === 123 || character === 125)) {
      if (character === 123 || braces > 0) {
        braces += character === 123 ? 1 : -1;
        text += String.fromCharCode(character);
        continue;
      }
      custom = false; // an empty value before the block's end is dropped
    }

    switch (character) {
      case 40: // (
        // A function in a selector or value keeps its arguments' spacing and
        // commas; url( and parentheses elsewhere are read verbatim.
        if (previous !== 108 && (text.charCodeAt(length - 1) | 0) === 58) {
          parens++;
          text += '(';
        } else {
          text += scanner.readDelimited(character);
        }
        continue;
      case 41: // )
        parens--;
        text += ')';
        continue;
      case 34: case 39: case 91: // " ' [
        text += scanner.readDelimited(character);
        continue;
      case 9: case 10: case 13: case 32:
        text += parens > 0 ? String.fromCharCode(character) : scanner.skipWhitespace(previous);
        continue;
      case 92: // \
        text += scanner.readEscape(scanner.position - 1);
        continue;
      case 47: { // /
        const next = scanner.peek();
        if (next !== 42 && next !== 47) {
          text += '/';
          continue;
        }
        const comment = scanner.readComment();
        declarations.push(node(comment.text, root, parent, COMMENT, comment.block ? '/' : '\n', comment.text.slice(2, -2), 0, declarations, scanner.line, scanner.column));
        // A comment between words still separates them.
        if ((classify(previous || 1) === WHITESPACE || classify(scanner.peek() || 1) === WHITESPACE) && text && !text.endsWith(' ')) text += ' ';
        continue;
      }
      case 123: case 125: case 59: case 0: { // { } ; end
        if (character === 123) points[count++] = text.length * ampersand;
        if (parens > 0 && character) {
          text += String.fromCharCode(character);
          continue;
        }
        if (character === 59 && nameEnd > 0) {
          // An at-rule statement (@import, @charset, @layer a, b...).
          text += ';';
          block();
        } else if (character === 123) {
          block();
        } else {
          declaration();
          if (character !== 59) return rules;
        }
        resetStatement();
        continue;
      }
      case 58: // :
        length = text.length + 1;
        if (colon < 0) {
          colon = text.length;
          beforeColon = previous;
        }
        break;
    }

    text += String.fromCharCode(character);
    if (custom) continue;
    switch (character) {
      case 38: // &
        if (nameEnd > 0) {
          ampersand = 1;
        } else {
          text += '\f';
          ampersand = -1;
        }
        break;
      case 44: // ,
        if (parens > 0) break;
        points[count++] = (text.length - 1) * ampersand;
        ampersand = 1;
        break;
      case 64: // @
        if (scanner.peek() === 45) text += scanner.readDelimited(scanner.next());
        initial = scanner.peek();
        type = text += scanner.readIdentifier(scanner.position);
        nameEnd = length = type.length;
        character = 65; // the name is not whitespace, a colon or a delimiter
        break;
      case 45: // -
        if (previous === 45 && text.length === 2) custom = true;
        break;
    }
  }
}
