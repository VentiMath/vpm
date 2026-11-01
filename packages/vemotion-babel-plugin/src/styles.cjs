'use strict';
// Compile-time work on style arguments: minifying template literals,
// serializing static styles, and appending labels and source maps.
const {compile} = require('vstylis');
const {serializeStyles} = require('vemotion-serialize');
const {getLabelFromPath} = require('./label.cjs');
const {getSourceMap} = require('./source-map.cjs');

const CSS_OBJECT_STRINGIFIED_ERROR =
  "You have tried to stringify object returned from `css` function. It isn't supposed to be used directly (e.g. as value of the `className` prop), but rather handed to emotion so it can handle it (e.g. as value of `css` prop).";

/** process.env.NODE_ENV === "production" ? production : development */
const nodeEnvConditional = (t, production, development) =>
  t.conditionalExpression(t.binaryExpression('===', t.memberExpression(t.memberExpression(t.identifier('process'), t.identifier('env')), t.identifier('NODE_ENV')), t.stringLiteral('production')), production, development);
exports.nodeEnvConditional = nodeEnvConditional;

// Minifying: the template's CSS (interpolations as xxxN:xxx placeholders)
// goes through stylis's parser and is printed back without whitespace, with
// comments dropped except /* ... @... */ ones, which plugins such as
// stylis-plugin-rtl read (/* @noflip */).

/** A rule stylis inserts for declarations at a nesting level, at its parent's position. */
const isAutoInsertedRule = element => element.type === 'rule' && element.parent && element.line === element.parent.line && element.column === element.parent.column;

/** Re-nests stylis's flat element list as written. */
function toInputTree(elements, tree) {
  for (const element of elements) {
    if (!element.parent) tree.push(element);
    else if (!isAutoInsertedRule(element)) element.parent.children.push(element);
    if (Array.isArray(element.children)) {
      const children = element.children;
      element.children = [];
      toInputTree(children, tree);
    }
  }
  return tree;
}

function stringifyTree(elements) {
  return elements
    .map(element => {
      switch (element.type) {
        case 'import': case 'decl':
          return element.value;
        case 'comm':
          return element.props === '/' && element.value.includes('@') ? element.value : '';
        case 'rule':
          return `${element.value.replace(/&\f/g, '&')}{${stringifyTree(element.children)}}`;
        default:
          return `${element.value}{${stringifyTree(element.children)}}`;
      }
    })
    .join('');
}

/** The minified CSS split back into string literals and the interpolated expressions. */
function withExpressions(css, expressions, t) {
  const placeholder = /xxx(\d+):xxx/g;
  const parts = [];
  let cursor = 0;
  let match;
  let first = true;
  while ((match = placeholder.exec(css)) !== null) {
    parts.push(t.stringLiteral(first && match.index === 0 ? '' : css.slice(cursor, match.index)));
    parts.push(expressions[+match[1]]);
    cursor = match.index + match[0].length;
    first = false;
  }
  if (first) return css === '' ? [] : [t.stringLiteral(css)];
  parts.push(t.stringLiteral(css.slice(cursor)));
  return parts.filter(node => node.value !== '');
}

/** Replaces tag`...` with tag(...minified strings and expressions). */
function minify(path, t) {
  const quasi = path.node.quasi;
  const strings = quasi.quasis.map(quasi => quasi.value.cooked);
  const raw = strings.map((string, i) => (i < strings.length - 1 ? `${string}xxx${i}:xxx` : string)).join('').trim();
  const minified = stringifyTree(toInputTree(compile(raw), []));
  path.replaceWith(t.callExpression(path.node.tag, withExpressions(minified, quasi.expressions || [], t)));
}

/** A static style object as CSS, or the object itself when any part is dynamic. */
function simplifyObject(node, t) {
  let css = '';
  for (const property of node.properties) {
    if (
      !t.isObjectProperty(property) ||
      property.computed ||
      (!t.isIdentifier(property.key) && !t.isStringLiteral(property.key)) ||
      (!t.isStringLiteral(property.value) && !t.isNumericLiteral(property.value) && !t.isObjectExpression(property.value))
    ) {
      return node;
    }
    const key = property.key.name || property.key.value;
    if (key === 'styles') return node;
    if (t.isObjectExpression(property.value)) {
      const child = simplifyObject(property.value, t);
      if (!t.isStringLiteral(child)) return node;
      css += `${key}{${child.value}}`;
      continue;
    }
    css += serializeStyles([{[key]: property.value.value}]).styles;
  }
  return t.stringLiteral(css);
}

/** Merges adjacent string literals. */
function joinStringLiterals(expressions, t) {
  const joined = [];
  for (const expression of expressions) {
    const last = joined[joined.length - 1];
    if (t.isStringLiteral(expression) && t.isStringLiteral(last)) last.value += expression.value;
    else joined.push(expression);
  }
  return joined;
}

// Calls whose first argument is TypeScript's or Babel's compiled tagged
// template (a template object), which arguments cannot be appended to.

/** TypeScript: tag(_a || (_a = __makeTemplateObject([...], [...])), ...) */
function typeScriptTemplateObject(path) {
  if (path.node.arguments.length === 0) return null;
  const first = path.get('arguments')[0];
  if (
    first.isLogicalExpression() &&
    first.get('left').isIdentifier() &&
    first.get('right').isAssignmentExpression() &&
    first.get('right.right').isCallExpression() &&
    first.get('right.right.callee').isIdentifier() &&
    first.node.right.right.callee.name.includes('makeTemplateObject') &&
    first.node.right.right.arguments.length === 2
  ) {
    return first.get('right.right');
  }
  return null;
}

/** Babel: tag(_templateObject(), ...), where _templateObject returns a cached template object. */
function isBabelTemplateObject(path) {
  if (path.node.arguments.length === 0) return false;
  const first = path.get('arguments')[0];
  if (!first.isCallExpression() || !first.get('callee').isIdentifier()) return false;
  const name = first.node.callee.name;
  if (!name.includes('templateObject')) return false;
  const binding = path.scope.getBinding(name).path;
  if (!binding.isFunction()) return false;
  const body = binding.get('body.body');
  if (!body[0].isVariableDeclaration()) return false;
  const init = body[0].get('declarations')[0].get('init');
  if (!init.isCallExpression()) return false;
  const args = init.get('arguments');
  return args.length > 0 && args.length <= 2 && args.every(arg => arg.isArrayExpression());
}

/** Appends CSS (a string, or an expression of one) to a call's arguments. */
function appendToArguments(t, path, expression) {
  const lastIndex = path.node.arguments.length - 1;
  const last = path.node.arguments[lastIndex];
  if (t.isStringLiteral(last)) {
    if (typeof expression === 'string') path.node.arguments[lastIndex].value += expression;
    else path.node.arguments[lastIndex] = t.binaryExpression('+', last, expression);
    return;
  }
  const templateObject = typeScriptTemplateObject(path);
  if (templateObject) {
    // Both the cooked and raw strings of the template object.
    for (const array of templateObject.get('arguments')) {
      const elements = array.get('elements');
      const lastElement = elements[elements.length - 1];
      lastElement.replaceWith(typeof expression === 'string' ? t.stringLiteral(lastElement.node.value + expression) : t.binaryExpression('+', lastElement.node, t.cloneNode(expression)));
    }
  } else if (!isBabelTemplateObject(path)) {
    path.node.arguments.push(typeof expression === 'string' ? t.stringLiteral(expression) : expression);
  }
}

/**
 * Prepares a css-like call (or tagged template): minifies templates,
 * serializes static objects, and appends a label and source map. For fully
 * static styles, returns serialized styles for the production and
 * development builds to replace the call with.
 */
exports.transformExpressionWithStyles = ({babel, state, path, shouldLabel, sourceMap = ''}) => {
  const autoLabel = state.opts.autoLabel || 'dev-only';
  const t = babel.types;
  if (t.isTaggedTemplateExpression(path)) {
    if (!sourceMap && state.emotionSourceMap && path.node.quasi.loc !== undefined) sourceMap = getSourceMap(path.node.quasi.loc.start, state);
    minify(path, t);
  }
  if (!t.isCallExpression(path)) return undefined;

  const canAppendStrings = path.node.arguments.every(arg => arg.type !== 'SpreadElement');
  for (const argument of path.get('arguments')) {
    if (t.isObjectExpression(argument)) argument.replaceWith(simplifyObject(argument.node, t));
  }
  path.node.arguments = joinStringLiterals(path.node.arguments, t);
  if (!sourceMap && canAppendStrings && state.emotionSourceMap && path.node.loc !== undefined) sourceMap = getSourceMap(path.node.loc.start, state);
  const label = shouldLabel && autoLabel !== 'never' ? getLabelFromPath(path, state, t) : null;

  if (path.node.arguments.length === 1 && t.isStringLiteral(path.node.arguments[0])) {
    // Static styles: serialized now.
    const css = path.node.arguments[0].value.replace(/;$/, '');
    let serialized = serializeStyles([`${css}${label && autoLabel === 'always' ? `;label:${label};` : ''}`]);
    const production = t.objectExpression([t.objectProperty(t.identifier('name'), t.stringLiteral(serialized.name)), t.objectProperty(t.identifier('styles'), t.stringLiteral(serialized.styles))]);
    if (!state.emotionStringifiedCssId) {
      // Once per file: the toString of development styles, which explains
      // that they are not class names.
      const uid = state.file.scope.generateUidIdentifier('__EMOTION_STRINGIFIED_CSS_ERROR__');
      state.emotionStringifiedCssId = uid;
      const declaration = t.functionDeclaration(uid, [], t.blockStatement([t.returnStatement(t.stringLiteral(CSS_OBJECT_STRINGIFIED_ERROR))]));
      declaration._compact = true;
      state.file.path.unshiftContainer('body', [declaration]);
    }
    if (label && autoLabel === 'dev-only') serialized = serializeStyles([`${css};label:${label};`]);
    const development = t.objectExpression([
      t.objectProperty(t.identifier('name'), t.stringLiteral(serialized.name)),
      t.objectProperty(t.identifier('styles'), t.stringLiteral(serialized.styles + sourceMap)),
      t.objectProperty(t.identifier('toString'), t.cloneNode(state.emotionStringifiedCssId)),
    ]);
    return nodeEnvConditional(t, production, development);
  }

  if (canAppendStrings && label) {
    const labelString = `;label:${label};`;
    if (autoLabel === 'dev-only') appendToArguments(t, path, nodeEnvConditional(t, t.stringLiteral(''), t.stringLiteral(labelString)));
    else if (autoLabel === 'always') appendToArguments(t, path, labelString);
  }
  if (sourceMap) appendToArguments(t, path, nodeEnvConditional(t, t.stringLiteral(''), t.stringLiteral(sourceMap)));
  return undefined;
};
