'use strict';
// What the plugin does with each Emotion export it finds imported.
const {addImport} = require('./imports.cjs');
const {getSourceMap} = require('./source-map.cjs');
const {getLabelFromPath} = require('./label.cjs');
const {getTargetClassName} = require('./target-class-name.cjs');
const {nodeEnvConditional, transformExpressionWithStyles} = require('./styles.cjs');

// @emotion/css: css, keyframes and injectGlobal calls.

/** A call the plugin already compiled (its argument is the NODE_ENV conditional of serialized styles). */
function isAlreadyTranspiled(path) {
  if (!path.isCallExpression()) return false;
  const first = path.get('arguments.0');
  if (!first || !first.isConditionalExpression()) return false;
  const alternate = first.get('alternate');
  if (!alternate.isObjectExpression()) return false;
  const keys = new Set(alternate.get('properties').map(property => property.node.key.name));
  return keys.has('name') && keys.has('styles');
}

const vanillaTransformer = isPure => ({state, babel, reference}) => {
  const path = reference.parentPath;
  if (isAlreadyTranspiled(path)) return;
  if (isPure) path.addComment('leading', '#__PURE__');
  const node = transformExpressionWithStyles({babel, state, path, shouldLabel: true});
  if (node) path.node.arguments[0] = node;
};

exports.vanillaTransformers = {css: vanillaTransformer(true), injectGlobal: vanillaTransformer(false), keyframes: vanillaTransformer(true)};

// @emotion/react: css calls, Global's styles prop and the css prop.

function transformCssCallExpression({state, babel, path, sourceMap, annotateAsPure = true}) {
  const node = transformExpressionWithStyles({babel, state, path, shouldLabel: true, sourceMap});
  if (node) {
    path.replaceWith(node);
    path.hoist();
  } else if (annotateAsPure && path.isCallExpression()) {
    path.addComment('leading', '#__PURE__');
  }
}

const attributeSourceMap = (path, state) => (state.emotionSourceMap && path.node.loc !== undefined ? getSourceMap(path.node.loc.start, state) : '');

/** css={[...]}: serialized at compile time where static, still an array. */
function transformCsslessArrayExpression({state, babel, path}) {
  const t = babel.types;
  const expression = path.get('value.expression');
  const sourceMap = attributeSourceMap(path, state);
  // (The callee never reaches the output.)
  expression.replaceWith(t.callExpression(t.identifier('___shouldNeverAppearCSS'), path.node.value.expression.elements));
  transformCssCallExpression({babel, state, path: expression, sourceMap, annotateAsPure: false});
  if (t.isCallExpression(expression)) expression.replaceWith(t.arrayExpression(expression.node.arguments));
}

/** css={{...}}: serialized at compile time where static, else a css() call. */
function transformCsslessObjectExpression({state, babel, path, cssImport}) {
  const t = babel.types;
  const expression = path.get('value.expression');
  const sourceMap = attributeSourceMap(path, state);
  expression.replaceWith(t.callExpression(t.identifier('___shouldNeverAppearCSS'), [path.node.value.expression]));
  transformCssCallExpression({babel, state, path: expression, sourceMap});
  if (t.isCallExpression(expression)) expression.get('callee').replaceWith(addImport(state, t, cssImport.importSource, cssImport.cssExport, 'css'));
}
exports.transformCsslessArrayExpression = transformCsslessArrayExpression;
exports.transformCsslessObjectExpression = transformCsslessObjectExpression;

function globalTransformer({state, babel, reference, importSource, options}) {
  const t = babel.types;
  if (!t.isJSXIdentifier(reference.node) || !t.isJSXOpeningElement(reference.parentPath.node)) return;
  const styles = reference.parentPath.get('attributes').find(p => t.isJSXAttribute(p.node) && p.node.name.name === 'styles');
  if (!styles || !t.isJSXExpressionContainer(styles.node.value)) return;
  if (t.isArrayExpression(styles.node.value.expression)) {
    transformCsslessArrayExpression({state, babel, path: styles});
  } else if (t.isObjectExpression(styles.node.value.expression)) {
    const cssImport = options.cssExport !== undefined ? {importSource, cssExport: options.cssExport} : {importSource: '@emotion/react', cssExport: 'css'};
    transformCsslessObjectExpression({state, babel, path: styles, cssImport});
  }
}

exports.coreTransformers = {
  // Never called: importing jsx only marks the css prop for optimization.
  jsx: () => {},
  css: ({state, babel, reference}) => transformCssCallExpression({babel, state, path: reference.parentPath}),
  Global: globalTransformer,
};

// styled: the options argument (a target class name and label) and the styles.

/** styled(tag, options): target and label added to the options, by NODE_ENV for the label. */
function getStyledOptions(t, path, state) {
  const autoLabel = state.opts.autoLabel || 'dev-only';
  const optionsArgument = path.node.arguments.length >= 2 ? path.node.arguments[1] : null;
  const known = optionsArgument && t.isObjectExpression(optionsArgument)
    ? new Set(optionsArgument.properties.filter(p => t.isObjectProperty(p) && !p.computed).map(p => (t.isIdentifier(p.key) ? p.key.name : p.key.value)))
    : new Set();
  const production = [];
  let development = null;
  if (!known.has('target')) production.push(t.objectProperty(t.identifier('target'), t.stringLiteral(getTargetClassName(state))));
  const label = autoLabel !== 'never' && !known.has('label') ? getLabelFromPath(path, state, t) : null;
  if (label) {
    const labelNode = t.objectProperty(t.identifier('label'), t.stringLiteral(label));
    if (autoLabel === 'always') production.push(labelNode);
    else if (autoLabel === 'dev-only') development = [labelNode];
  }
  const spread = (...objects) => t.callExpression(state.file.addHelper('extends'), [t.objectExpression([]), ...objects]);
  if (optionsArgument) {
    // Already compiled (withComponent calls are visited again).
    if (t.isConditionalExpression(optionsArgument) && t.isBinaryExpression(optionsArgument.test) && t.buildMatchMemberExpression('process.env.NODE_ENV')(optionsArgument.test.left)) return optionsArgument;
    if (!t.isObjectExpression(optionsArgument)) {
      const productionNode = spread(t.objectExpression(production), optionsArgument);
      return development ? nodeEnvConditional(t, productionNode, t.cloneNode(spread(t.objectExpression(production.concat(development)), optionsArgument))) : productionNode;
    }
    production.unshift(...optionsArgument.properties);
  }
  return development ? nodeEnvConditional(t, t.objectExpression(production), t.cloneNode(t.objectExpression(production.concat(development)))) : t.objectExpression(production);
}
exports.getStyledOptions = getStyledOptions;

function styledTransformer({state, babel, path, importSource, reference, importSpecifierName, options: {styledBaseImport, isWeb}}) {
  const t = babel.types;
  // styled from @emotion/styled becomes @emotion/styled/base's (the element
  // shorthands are not needed once member calls are rewritten).
  const styledIdentifier = () => {
    if (!styledBaseImport || (styledBaseImport[0] === importSource && styledBaseImport[1] === importSpecifierName)) return t.cloneNode(reference.node);
    if (path.node) {
      const specifiers = path.get('specifiers');
      const specifier = importSpecifierName === 'default' ? specifiers.find(p => p.isImportDefaultSpecifier()) : specifiers.find(p => p.node.local.name === importSpecifierName);
      if (specifier) specifier.remove();
      if (!path.get('specifiers').length) path.remove();
    }
    return addImport(state, t, styledBaseImport[0], styledBaseImport[1], 'styled');
  };
  let createStyled = null;
  if (t.isMemberExpression(reference.parent) && reference.parent.computed === false) {
    // styled.div -> styled("div"); styled.View (native, primitives) keeps the member.
    if (reference.parent.property.name.charCodeAt(0) > 96) reference.parentPath.replaceWith(t.callExpression(styledIdentifier(), [t.stringLiteral(reference.parent.property.name)]));
    else reference.replaceWith(styledIdentifier());
    createStyled = reference.parentPath;
  } else if (reference.parentPath && t.isCallExpression(reference.parentPath) && reference.parent.callee === reference.node) {
    reference.replaceWith(styledIdentifier());
    createStyled = reference.parentPath;
  }
  if (!createStyled) return;
  const withStyles = createStyled.parentPath;
  const node = transformExpressionWithStyles({path: withStyles, state, babel, shouldLabel: false});
  if (node && isWeb) withStyles.node.arguments[0] = node;
  withStyles.addComment('leading', '#__PURE__');
  if (isWeb) createStyled.node.arguments[1] = getStyledOptions(t, createStyled, state);
}
exports.styledTransformer = styledTransformer;
