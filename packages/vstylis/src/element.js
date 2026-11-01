/**
 * Creates an element of the syntax tree.
 * @param {string} value
 * @param {object | null} root
 * @param {object | null} parent
 * @param {string} type
 * @param {string[] | string} props
 * @param {object[] | string} children
 * @param {number} length
 * @param {object[] | undefined} siblings
 * @param {number} [line]
 * @param {number} [column]
 */
export function node(value, root, parent, type, props, children, length, siblings, line = 1, column = 1) {
  return {value, root, parent, type, props, children, line, column, length, return: '', siblings};
}

/**
 * A copy of an element with its length negated, which marks it as generated
 * (prefixer skips it), and the given fields replaced.
 * @param {object} element
 * @param {object} fields
 */
export function copy(element, fields) {
  return Object.assign(node('', null, null, '', null, null, 0, element.siblings), element, {length: -element.length}, fields);
}

/**
 * Adds an element nested in at-rules to the top-level list its outermost
 * at-rule belongs to, wrapping it in copies of those at-rules, so that it is
 * serialized (and given to rulesheet) as a rule of its own.
 * @param {object} element
 */
export function lift(element) {
  while (element.root) element = copy(element.root, {children: [element]});
  element.siblings.push(element);
}
