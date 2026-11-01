'use strict';
// Defects in Emotion 11.14's packages, reproduced with the pinned originals
// and checked in VPM's.
const assert = require('node:assert/strict'), path = require('node:path'), {pathToFileURL} = require('node:url');
const packages = path.resolve(__dirname, '../../packages');
const load = async name => (await import(pathToFileURL(path.join(packages, name, 'index.js')).href)).default;

(async () => {
  const {serializeStyles} = require('./node_modules/@emotion/serialize');
  const found = [];

  // 1. @emotion/hash keeps only each UTF-16 code unit's low byte, so styles
  // that differ by characters with the same low byte (中 U+4E2D, 伭 U+4F2D)
  // get the same class name: the second component renders the first's styles.
  const first = serializeStyles([{'&::before': {content: '"中"'}}]), second = serializeStyles([{'&::before': {content: '"伭"'}}]);
  assert.notEqual(first.styles, second.styles);
  assert.equal(first.name, second.name);
  const hash = await load('vemotion-hash');
  assert.notEqual(hash(first.styles), hash(second.styles));
  assert.equal(hash('something'), require('./node_modules/@emotion/hash').default('something'));
  const vpmSerialize = (await import(pathToFileURL(path.join(packages, 'vemotion-serialize/index.js')).href)).serializeStyles;
  assert.notEqual(vpmSerialize([{'&::before': {content: '"中"'}}]).name, vpmSerialize([{'&::before': {content: '"伭"'}}]).name);
  found.push(`two styles differing by 中/伭 share class css-${first.name}`);

  // 2. @emotion/unitless lacks gridArea and lineClamp, which take numbers.
  assert.equal(serializeStyles([{gridArea: 2, lineClamp: 3}]).styles, 'grid-area:2px;line-clamp:3px;');
  const unitless = await load('vemotion-unitless');
  assert.deepEqual([unitless.gridArea, unitless.lineClamp], [1, 1]);
  assert.equal(vpmSerialize([{gridArea: 2, lineClamp: 3}]).styles, 'grid-area:2;line-clamp:3;');
  found.push('gridArea: 2 and lineClamp: 3 serialized with px');

  // 3. @emotion/memoize recomputes undefined results on every call.
  const original = require('./node_modules/@emotion/memoize').default, memoize = await load('vemotion-memoize');
  for (const [library, expected] of [[original, 2], [memoize, 1]]) {
    let calls = 0;
    const nothing = library(() => { calls++; });
    nothing('a');
    nothing('a');
    assert.equal(calls, expected);
  }
  found.push('undefined results recomputed by memoize');

  // 4. @emotion/serialize decides units with the key as written, so unitless
  // properties written in kebab-case get px in production (development only
  // warns that kebab-case is unsupported).
  assert.equal(serializeStyles([{'font-weight': 600, 'line-height': 1.5, opacity: 0.5}]).styles, 'font-weight:600px;line-height:1.5px;opacity:0.5;');
  assert.equal(vpmSerialize([{'font-weight': 600, 'line-height': 1.5, opacity: 0.5}]).styles, 'font-weight:600;line-height:1.5;opacity:0.5;');
  found.push('font-weight: 600 and line-height: 1.5 written in kebab-case serialized with px');

  // 5. A fallback list counts as one only when its first value is a string;
  // numbers first make it a selector block.
  assert.equal(serializeStyles([{width: [100, '50%']}]).styles, 'width{100;50%;}');
  assert.equal(vpmSerialize([{width: [100, '50%']}]).styles, 'width:100px;width:50%;');
  found.push('the fallback list width: [100, "50%"] serialized as width{100;50%;}');

  // 6. @emotion/is-prop-valid rejects current HTML attributes, so styled
  // elements drop them: invoker commands, dialog closedBy, shadow parts,
  // declarative shadow roots, <link> image candidates, noModule, React 19's
  // precedence.
  {
    const original = require('./node_modules/@emotion/is-prop-valid').default, isPropValid = await load('vemotion-is-prop-valid');
    const attributes = ['command', 'commandFor', 'closedBy', 'part', 'exportParts', 'shadowRootMode', 'imageSrcSet', 'imageSizes', 'noModule', 'precedence', 'blocking', 'transformOrigin'];
    assert.deepEqual(attributes.filter(original), []);
    assert.deepEqual(attributes.filter(isPropValid), attributes);
    assert.equal(isPropValid('as'), false);
    found.push(`${attributes.length} current HTML and SVG attributes not forwarded by styled elements (command, commandFor, part, shadowRootMode...)`);
  }

  // 7. @emotion/cache's prefixer (a copy of stylis 4.0.13's) selects
  // properties by a hash of the name's length and first four characters, so
  // properties sharing a hash with a prefixed one get invented declarations;
  // align-self gives IE an invalid value; and justify-content: space-between
  // loses -ms-flex-pack (the replacement pattern spans both prefixed forms).
  {
    const original = require('./node_modules/@emotion/cache').default, {default: createCache} = await import(pathToFileURL(path.join(packages, 'vemotion-cache/index.js')).href);
    let id = 0;
    const css = (create, styles) => { const cache = create({key: 'css'}); return cache.insert('.a', {name: 'r' + id++, styles}, cache.sheet, false); };
    const cases = {
      'flex-wrap:wrap;': ['.a{-webkit-box-flex-wrap:wrap;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;}', '.a{flex-wrap:wrap;}'],
      'color-scheme:dark;': ['.a{-webkit-print-color-scheme:dark;color-scheme:dark;}', '.a{color-scheme:dark;}'],
      'align-self:flex-start;': ['.a{-webkit-align-self:flex-start;-ms-flex-item-align:flex-start;align-self:flex-start;}', '.a{-webkit-align-self:flex-start;-ms-flex-item-align:start;align-self:flex-start;}'],
      'justify-content:space-between;': ['.a{-webkit-box-pack:justify;-webkit-justify-content:space-between;justify-content:space-between;}', '.a{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between;}'],
    };
    for (const [styles, [before, after]] of Object.entries(cases)) {
      assert.equal(css(original, styles), before, styles);
      assert.equal(css(createCache, styles), after, styles);
    }
    found.push("@emotion/cache's prefixer: -webkit-box-flex-wrap and other invented declarations, -ms-flex-item-align:flex-start, and justify-content: space-between without -ms-flex-pack");
  }

  // 8. @emotion/styled reads the theme context only when the theme prop is
  // null: a styled component whose theme prop comes and goes changes the
  // order of its hooks, which React reports (hook-order.cjs).
  {
    const messages = require('./hook-order.cjs')();
    assert.equal(messages.upstream.length, 1, JSON.stringify(messages));
    assert.match(messages.upstream[0], /change in the order of Hooks/);
    assert.deepEqual(messages.vpm, []);
    found.push('a styled component whose theme prop comes and goes changing the order of its hooks (React warns)');
  }

  // 9. @emotion/utils's declarations import @emotion/sheet, which it does not
  // depend on: installed on its own (pnpm, or any isolated install), its types
  // fail to compile.
  {
    const fs = require('node:fs'), os = require('node:os'), {compile} = require('../platform-types.cjs');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emotion-utils-alone-'));
    try {
      const errors = {};
      for (const [library, target, name] of [['upstream', path.join(__dirname, 'node_modules/@emotion/utils'), '@emotion/utils'], ['vpm', path.join(packages, 'vemotion-utils'), 'vemotion-utils']]) {
        // The package and its declared dependencies, as an isolated install lays them out.
        const root = path.join(directory, library), modules = path.join(root, 'node_modules');
        fs.mkdirSync(path.join(modules, '@emotion'), {recursive: true});
        fs.cpSync(target, path.join(modules, name), {recursive: true, dereference: true});
        for (const dependency of Object.keys(require(path.join(target, 'package.json')).dependencies || {})) fs.cpSync(path.join(packages, dependency), path.join(modules, dependency), {recursive: true, dereference: true});
        const file = path.join(root, 'app.ts');
        fs.writeFileSync(file, `import type {EmotionCache} from '${name}';\nexport declare const cache: EmotionCache;\n`);
        errors[library] = compile({files: [file], compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'Bundler', types: [], skipLibCheck: false}}).output.match(/error TS\d+: [^\n]*/g) || [];
      }
      assert.ok(errors.upstream.some(error => /TS2307: Cannot find module '@emotion\/sheet'/.test(error)), JSON.stringify(errors));
      assert.deepEqual(errors.vpm, []);
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
    found.push("@emotion/utils's types needing @emotion/sheet, which it does not depend on (TS2307 when installed alone)");
  }

  console.log(`Reproduced in Emotion 11.14 and fixed (${found.length}):\n- ${found.join('\n- ')}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
