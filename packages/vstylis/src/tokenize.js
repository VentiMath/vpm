import {OPENING, OTHER, Scanner, classify} from './scanner.js';

/**
 * Splits a selector or value into names, delimited groups (strings,
 * parenthesized and bracketed groups, verbatim) and single characters.
 * @param {string} value
 * @returns {string[]}
 */
export function tokenize(value) {
  const scanner = new Scanner(value);
  const tokens = [];
  while (scanner.next()) {
    const code = scanner.character;
    switch (classify(code)) {
      case OTHER:
        tokens.push(scanner.readIdentifier(scanner.position - 1));
        break;
      case OPENING:
        tokens.push(scanner.readDelimited(code));
        break;
      default:
        tokens.push(String.fromCharCode(code));
    }
  }
  return tokens;
}
