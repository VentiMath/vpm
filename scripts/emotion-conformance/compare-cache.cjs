'use strict';
// Differential comparison of vemotion-cache with @emotion/cache 11.14.0 on the
// server, where insert returns the CSS it would insert: generated Emotion
// styles (nesting, selectors starting with :, &, commas, at-rules, keyframes,
// placeholders, labels, comments, @import, unsafe pseudo-classes, vendor
// properties) inserted as a class and as global styles, in regular and compat
// mode, with no stylis plugins, with the default prefixer, and with
// VentiMath's two cache configurations (src/contexts/RootThemeProvider.tsx: its
// wrapInLayer('mui') plugin, after stylis-plugin-rtl 2.1.1 for right-to-left). The CSS, the
// inserted state and the distinct messages logged must be identical in
// the production build and under the development condition, except where the
// prefixer differs by design: those inputs are compared without it here, and
// regressions.cjs covers them. The original runs on stylis 4.4.0 (from
// scripts/stylis-conformance), the version vemotion-cache uses through vstylis,
// so the comparison is of the cache, not of stylis 4.2.0 and 4.4.0 (which
// parse at-rules nested in @keyframes and @font-face differently).
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process'), {pathToFileURL} = require('node:url');

function generate(count) {
  let seed = 11;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = list => list[Math.floor(random() * list.length)];
  const selectors = [':hover', '&:hover', ':focus,:active', '& + &', '.child', '& .child, :hover', 'a:not(.b, .c)', '&::placeholder', ':read-only', 'input::placeholder', '& > li:first-child', ':nth-child(2)', '[data-x="a,b"]', '@media (min-width: 600px)', '@supports (display: flex)', '@container (min-width: 1px)', '@keyframes spin', '@font-face', ':global(.g)'];
  // Properties whose prefixes Emotion and VPM agree on.
  const declarations = ['color:red', 'display:flex', 'display:inline-flex', 'display:block', 'transform:scale(1.2)', 'transition:transform 1s', 'user-select:none', 'flex:1', 'flex-direction:column', 'order:2', 'align-items:center', 'flex-grow:1', 'flex-shrink:0', 'flex-basis:10px', 'justify-content:center', 'position:sticky', 'position:absolute', 'width:max-content', 'height:fit-content', 'min-width:stretch', 'animation:spin 1s', 'appearance:none', 'background:url(a.png)', 'cursor:grab', 'writing-mode:vertical-lr', 'margin-inline-start:4px', 'text-decoration:underline', 'mask:none', 'columns:2', 'filter:blur(1px)', 'label:Box', 'label:Card;color:blue', '--x:{a}', 'content:"a;b"', 'padding:0 4px', 'margin-left:4px', 'padding:1px 2px 3px 4px', 'float:left', 'text-align:right', 'border-left-width:2px', 'left:0'];
  const block = depth => {
    let out = '';
    for (let i = 0, n = 1 + Math.floor(random() * 4); i < n; i++) {
      const r = random();
      if (r < 0.6 || depth > 2) out += pick(declarations) + ';';
      else if (r < 0.65) out += pick(['/* c */', '/* emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason */']);
      else if (r < 0.68) out += '@import url(x.css);';
      else out += pick(selectors) + '{' + block(depth + 1) + '}';
    }
    return out;
  };
  const cases = [];
  for (let i = 0; i < count; i++) cases.push({styles: block(0) + (random() < 0.05 ? '/*# sourceMappingURL=data:application/json;charset=utf-8;base64,e30= */' : ''), global: random() < 0.25});
  return cases;
}

// VentiMath's plugin wrapping each top-level rule in @layer mui (copied from
// its RootThemeProvider.tsx, as a caller).
const wrapInLayer = layerName => node => {
  if (node.root) return;
  const child = {...node, parent: node, root: node};
  Object.assign(node, {children: [child], length: 6, parent: null, props: [layerName], return: '', root: null, type: '@layer', value: `@layer ${layerName}`});
};

function run(createCache, cases, plugins) {
  const logged = [], original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    return cases.map(({styles, global}, index) => {
      logged.length = 0;
      const outputs = [];
      for (const compat of [false, true]) {
        try {
          const cache = createCache({key: 'css', ...(plugins ? {stylisPlugins: plugins} : {})});
          if (compat) cache.compat = true;
          const serialized = {name: 'n' + index, styles};
          const css = cache.insert(global ? '' : '.css-n' + index, serialized, cache.sheet, !global);
          outputs.push([css, cache.inserted['n' + index]]);
        } catch (error) {
          outputs.push(['throws', error.message]);
        }
      }
      // VPM isolates custom-plugin caches and development diagnostics between
      // requests. Each request can therefore repeat a warning upstream's
      // shared cache suppresses. Compare exact CSS/state and exact warning
      // text, while retaining the separately reported repetition difference.
      return {value: JSON.stringify([outputs, [...new Set(logged)].sort()]), warnings: logged.length};
    });
  } finally {
    console.error = original;
  }
}

if (process.argv[2] === '--child') {
  (async () => {
    const count = Number(process.argv[3]);
    const Module = require('node:module'), resolve = Module._resolveFilename;
    const stylis = path.resolve(__dirname, '../stylis-conformance/node_modules/stylis/dist/umd/stylis.js');
    assert.equal(require(path.resolve(__dirname, '../stylis-conformance/node_modules/stylis/package.json')).version, '4.4.0');
    Module._resolveFilename = function (request, parent, ...rest) {
      return request === 'stylis' && parent?.filename?.includes(`${path.sep}@emotion${path.sep}cache${path.sep}`) ? stylis : resolve.call(this, request, parent, ...rest);
    };
    const upstream = require('@emotion/cache').default;
    // stylis-plugin-rtl imports stylis: stylis 4.4.0 beside the original,
    // vstylis beside VPM (a second instance of the plugin's module).
    const rtlModule = require.resolve('stylis-plugin-rtl');
    const upstreamRtl = require('stylis-plugin-rtl').default;
    delete require.cache[rtlModule];
    const vstylis = path.resolve(__dirname, '../../packages/vstylis/index.js');
    const previous = Module._resolveFilename;
    Module._resolveFilename = function (request, parent, ...rest) {
      return request === 'stylis' && parent?.filename === rtlModule ? vstylis : previous.call(this, request, parent, ...rest);
    };
    const vpmRtl = require('stylis-plugin-rtl').default;
    assert.notEqual(upstreamRtl, vpmRtl);
    const {default: vpm} = await import(pathToFileURL(path.resolve(__dirname, '../../packages/vemotion-cache/index.js')).href);
    const report = {};
    const configurations = [
      ['no plugins', () => []],
      ['default prefixer', () => undefined],
      ['VentiMath ltr', () => [wrapInLayer('mui')]],
      ['VentiMath rtl', rtl => [rtl, wrapInLayer('mui')]],
    ];
    for (const [label, plugins] of configurations) {
      const expected = run(upstream, generate(count), plugins(upstreamRtl)), actual = run(vpm, generate(count), plugins(vpmRtl));
      const differences = expected.flatMap(({value}, index) => (value === actual[index].value ? [] : [{index, expected: value.slice(0, 500), actual: actual[index].value.slice(0, 500)}]));
      report[label] = {differences: differences.length, warningRepetitionsChanged: expected.filter((item, i) => item.warnings !== actual[i].warnings).length, examples: differences.slice(0, 3)};
    }
    process.stdout.write(JSON.stringify(report));
  })();
} else {
  const count = 10000;
  for (const [build, flags] of [['production', []], ['development', ['--conditions=development']]]) {
    const result = spawnSync(process.execPath, [...flags, __filename, '--child', String(count)], {encoding: 'utf8', timeout: 600000});
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    for (const [label, {differences, warningRepetitionsChanged, examples}] of Object.entries(report)) {
      for (const example of examples) console.log(build, label, example);
      console.log(`${build}, ${label}: ${count} generated styles (class and global, regular and compat mode), ${differences} CSS/state/distinct-warning differences from @emotion/cache 11.14.0; ${warningRepetitionsChanged} cases repeat diagnostics across isolated caches.`);
    }
    assert.ok(Object.values(report).every(({differences}) => differences === 0));
  }
}
