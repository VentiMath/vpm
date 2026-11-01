'use strict';
// Emotion's Babel plugin: compiles css, keyframes, injectGlobal, Global's
// styles, the css prop and styled at build time (minified, statically
// serialized where possible, labeled and source-mapped in development) and
// gives styled components stable target class names for component selectors.
const {coreTransformers, styledTransformer, transformCsslessArrayExpression, transformCsslessObjectExpression, vanillaTransformers, getStyledOptions} = require('./src/transformers.cjs');

const AUTO_LABEL_VALUES = ['dev-only', 'never', 'always'];

/** Transformers for an import source: by imported name, with options. */
const transformersFor = {
  '@emotion/css': vanillaTransformers,
  '@emotion/react': coreTransformers,
  '@emotion/styled': {default: [styledTransformer, {styledBaseImport: ['@emotion/styled/base', 'default'], isWeb: true}]},
  '@emotion/primitives': {default: [styledTransformer, {isWeb: false}]},
  '@emotion/native': {default: [styledTransformer, {isWeb: false}]},
};

/** Applies a source's transformers to every reference of its imports, last first. */
const applyTransformers = (transformers, importSource) => ({path, references, state, babel}) => {
  for (const name of Object.keys(references)) {
    const entry = transformers[name];
    if (!entry) continue;
    const [transformer, options] = Array.isArray(entry) ? entry : [entry, {}];
    for (const reference of references[name].reverse()) transformer({state, babel, path, importSource, importSpecifierName: name, options, reference});
  }
};

const defaultSources = {
  '@emotion/styled': applyTransformers({default: [styledTransformer, {styledBaseImport: ['@emotion/styled/base', 'default'], isWeb: true}]}, '@emotion/styled'),
  '@emotion/react': applyTransformers(coreTransformers, '@emotion/react'),
  '@emotion/primitives': applyTransformers({default: [styledTransformer, {styledBaseImport: ['@emotion/primitives', 'default'], isWeb: false}]}, '@emotion/primitives'),
  '@emotion/native': applyTransformers({default: [styledTransformer, {styledBaseImport: ['@emotion/native', 'default'], isWeb: false}]}, '@emotion/native'),
  '@emotion/css': applyTransformers(vanillaTransformers, '@emotion/css'),
};

/** The local name a re-exporting importMap source gives @emotion/react's css. */
function cssExportOf(reexported, importSource, mapping) {
  const cssExport = Object.keys(mapping).find(name => {
    const [packageName, exportName] = mapping[name].canonicalImport;
    return packageName === '@emotion/react' && exportName === 'css';
  });
  if (!cssExport) {
    throw new Error(
      `You have specified that '${importSource}' re-exports '${reexported}' from '@emotion/react' but it doesn't also re-export 'css' from '@emotion/react', 'css' is necessary for certain optimisations, please re-export it from '${importSource}'`,
    );
  }
  return cssExport;
}

module.exports = function emotionBabelPlugin(babel, options) {
  if (options.autoLabel !== undefined && !AUTO_LABEL_VALUES.includes(options.autoLabel)) {
    throw new Error(`The 'autoLabel' option must be undefined, or one of the following: ${AUTO_LABEL_VALUES.map(value => `"${value}"`).join(', ')}`);
  }
  const t = babel.types;
  return {
    name: '@emotion',
    // Parse JSX unless TypeScript or JSX parsing is already on.
    manipulateOptions(_, parserOptions) {
      const {plugins} = parserOptions;
      if (plugins.some(plugin => ['typescript', 'jsx'].includes(Array.isArray(plugin) ? plugin[0] : plugin))) return;
      plugins.push('jsx');
    },
    visitor: {
      ImportDeclaration(path, state) {
        const apply = state.pluginSources[path.node.source.value];
        if (apply === undefined || t.isImportNamespaceSpecifier(path.node.specifiers[0])) return;
        const references = {};
        let referenced = false;
        for (const specifier of path.node.specifiers) {
          const binding = path.scope.getBinding(specifier.local.name);
          if (!binding) return;
          const imported = specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.imported.name;
          references[imported] = binding.referencePaths;
          referenced ||= binding.referencePaths.length > 0;
        }
        if (!referenced) return;
        // Plugins that ran before may have replaced a path with itself
        // without updating the scope; traversing refreshes it.
        state.file.scope.path.traverse({Identifier() {}});
        apply({path, references, state, babel});
      },
      Program(path, state) {
        // Sources re-exporting Emotion's exports (importMap) and the jsx
        // imports that enable the css prop optimization.
        const sources = {};
        const jsxImports = [{importSource: '@emotion/react', export: 'jsx', cssExport: 'css'}];
        state.jsxReactImport = jsxImports[0];
        for (const importSource of Object.keys(state.opts.importMap || {})) {
          const mapping = state.opts.importMap[importSource];
          const transformers = {};
          for (const localName of Object.keys(mapping)) {
            const {canonicalImport, ...exportOptions} = mapping[localName];
            const [packageName, exportName] = canonicalImport;
            if (packageName === '@emotion/react' && exportName === 'jsx') {
              jsxImports.push({importSource, export: localName, cssExport: cssExportOf('jsx', importSource, mapping)});
              continue;
            }
            const packageTransformers = transformersFor[packageName];
            if (packageTransformers === undefined) throw new Error(`There is no transformer for the export '${exportName}' in '${packageName}'`);
            let extraOptions;
            if (packageName === '@emotion/react' && exportName === 'Global') extraOptions = {cssExport: cssExportOf('Global', importSource, mapping)};
            // A re-exported styled is used as is, unless styledBaseImport is given.
            else if (packageName === '@emotion/styled' && exportName === 'default') extraOptions = {styledBaseImport: undefined};
            const entry = packageTransformers[exportName];
            const [transformer, defaultOptions] = Array.isArray(entry) ? entry : [entry];
            transformers[localName] = [transformer, {...defaultOptions, ...extraOptions, ...exportOptions}];
          }
          sources[importSource] = applyTransformers(transformers, importSource);
        }
        state.pluginSources = {...defaultSources, ...sources};
        for (const node of path.node.body) {
          if (!t.isImportDeclaration(node)) continue;
          const jsxImport = jsxImports.find(candidate => node.source.value === candidate.importSource && node.specifiers.some(specifier => t.isImportSpecifier(specifier) && specifier.imported.name === candidate.export));
          if (jsxImport) {
            state.jsxReactImport = jsxImport;
            break;
          }
        }
        state.transformCssProp = state.opts.cssPropOptimization !== false;
        state.emotionSourceMap = state.opts.sourceMap !== false;
      },
      JSXAttribute(path, state) {
        if (path.node.name.name !== 'css' || !state.transformCssProp || !t.isJSXExpressionContainer(path.node.value)) return;
        if (t.isArrayExpression(path.node.value.expression)) transformCsslessArrayExpression({state, babel, path});
        else if (t.isObjectExpression(path.node.value.expression)) transformCsslessObjectExpression({state, babel, path, cssImport: state.jsxReactImport});
      },
      CallExpression: {
        exit(path, state) {
          try {
            // Styled(...).withComponent(tag, options): options as for styled.
            if (path.node.callee && path.node.callee.property && path.node.callee.property.name === 'withComponent' && (path.node.arguments.length === 1 || path.node.arguments.length === 2)) {
              path.node.arguments[1] = getStyledOptions(t, path, state);
            }
          } catch (error) {
            throw path.buildCodeFrameError(error);
          }
        },
      },
    },
  };
};
