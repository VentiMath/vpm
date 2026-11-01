'use strict';
// Differential comparison of vstylis with stylis 4.4.0. The reference is the
// pinned original with VPM's intentional changes applied to a copy of its
// sources (each patch must apply exactly once), so any other difference in
// behavior is a defect: the element trees (types, values, selectors, lengths,
// lines and columns) and the output of stringify, prefixer, rulesheet and
// namespace must be identical for every input. Inputs: the pinned stylesheets
// (Bootstrap, Bulma, animate.css, normalize.css) and generated nested CSS.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {pathToFileURL} = require('node:url');
const modules = path.join(__dirname, 'node_modules');
const vpm = path.resolve(__dirname, '../../packages/vstylis');
const generatedCount = Number(process.argv.find(arg => arg.startsWith('--generated='))?.slice(12) ?? 20000);

// VPM's intentional changes, applied to the original.
const patches = {
  // Properties are selected by name (prefix.js), not by a hash.
  'src/Prefixer.js': [[
    'export function prefix (value, length, children) {',
    `import {prefix as named} from ${JSON.stringify(pathToFileURL(path.join(vpm, 'src/prefix.js')).href)}\nexport function prefix (value, length, children) {\n\treturn named(value, length, children)\n`,
  ]],
  // A declaration's property ends at its first colon.
  'src/Parser.js': [
    ['\tvar parens = 0\n', '\tvar parens = 0\n\tvar colon = -1\n\tvar before = 0\n'],
    ['\t\t\tcase 58:\n\t\t\t\tlength = 1 + strlen(characters), property = previous\n', '\t\t\tcase 58:\n\t\t\t\tif (colon < 0) colon = strlen(characters), before = previous\n\t\t\t\tlength = 1 + strlen(characters), property = previous\n'],
    [
      "\t\t\t\t\t\tif (property > 0 && (strlen(characters) - length || variable === 0))\n\t\t\t\t\t\t\tappend(property > 32 ? declaration(characters + ';', rule, parent, length - 1, declarations) : declaration(replace(characters, ' ', '') + ';', rule, parent, length - 2, declarations), declarations)",
      "\t\t\t\t\t\tif (colon >= 0 && before > 0 && (strlen(characters) - colon - 1 || variable === 0))\n\t\t\t\t\t\t\tappend(before <= 32 && charat(characters, colon - 1) === 32 ? declaration(characters.slice(0, colon - 1) + characters.slice(colon) + ';', rule, parent, colon - 1, declarations) : declaration(characters + ';', rule, parent, colon, declarations), declarations)",
    ],
    ['index = offset = property = 0, variable = ampersand = 1', 'index = offset = property = 0, colon = -1, before = 0, variable = ampersand = 1'],
  ],
  // A comment ends at */ or a line break only, and keeps its text at the end
  // of the input.
  'src/Tokenizer.js': [[
    "export function commenter (type, index) {\n\twhile (next())\n\t\t// //\n\t\tif (type + character === 47 + 10)\n\t\t\tbreak\n\t\t// /*\n\t\telse if (type + character === 42 + 42 && peek() === 47)\n\t\t\tbreak\n\n\treturn '/*' + slice(index, position - 1) + '*' + from(type === 47 ? type : next())\n}",
    "export function commenter (type, index) {\n\tvar end = length, closed = 0\n\twhile (next())\n\t\tif (type === 47 ? character === 10 : character === 42 && peek() === 47) { end = position - 1, closed = 1; break }\n\tif (type === 42 && closed) next()\n\telse character = type === 42 ? 47 : 10\n\treturn '/*' + slice(index, end) + '*/'\n}",
  ]],
  // namespace: each selector starts without a scope (the original reuses the
  // element, or the previous selector's scope), and :global at the end of a
  // selector does not throw.
  'src/Middleware.js': [
    ['\t\t\telement.props = element.props.map(function (value) {\n\t\t\t\treturn combine', "\t\t\telement.props = element.props.map(function (value) {\n\t\t\t\telement = ''\n\t\t\t\treturn combine"],
    ["children[++index] = '\\f' + substr(children[index], index = 1, -1)", "children[++index] = '\\f' + substr(children[index] || '', index = 1, -1)"],
    // A case label that assigns the switched variable: JavaScriptCore (Bun,
    // Safari) compares the label with the variable after the assignment
    // instead of the switched value, scoping `a:not(.b)` as
    // `a.scope:not.scope(.b)`. The same choice, without the construct.
    [
      "\t\t\t\t\t\t\t\tcase index = sizeof(children) - 1: case 2:\n\t\t\t\t\t\t\t\t\treturn index === 2 ? value + element + element : value + element\n",
      "\t\t\t\t\t\t\t\tcase 2: case sizeof(children) - 1:\n\t\t\t\t\t\t\t\t\treturn sizeof(children) - 1 === 2 ? value + element + element : value + element\n",
    ],
  ],
};

function snapshot(elements) {
  return elements.map(element => ({
    type: element.type, value: element.value, props: element.props, length: element.length, line: element.line, column: element.column, return: element.return,
    children: Array.isArray(element.children) ? snapshot(element.children) : element.children,
  }));
}

function outputs(library, css) {
  const result = {};
  const attempt = (key, run) => { try { result[key] = run(); } catch (error) { result[key] = 'throws ' + error.message; } };
  const {compile, serialize, stringify, middleware, prefixer, rulesheet, namespace} = library;
  attempt('tree', () => JSON.stringify(snapshot(compile(css))));
  attempt('stringify', () => serialize(compile(css), stringify));
  attempt('prefixer', () => serialize(compile(css), middleware([prefixer, stringify])));
  attempt('rulesheet', () => { const rules = []; serialize(compile(css), middleware([prefixer, stringify, rulesheet(rule => rules.push(rule))])); return JSON.stringify(rules); });
  attempt('namespace', () => serialize(compile('.scope{' + css + '}'), middleware([namespace, stringify])));
  return result;
}

function generated(count) {
  let seed = 12345;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = list => list[Math.floor(random() * list.length)];
  const selectors = ['.a', 'a', '&', '&:hover', '& + &', '.b &', ':is(&:hover, .c &)', ':where(&)', '&::placeholder', '&:read-only', 'a:not(.b, .c)', 'div > p', '& ~ .x', '[data-a="x,y"]', '.a, .b', '&.c, p:first-child', ':global(.g)', 'input::placeholder', '@media (min-width: 1px)', '@supports (display: grid)', '@container (min-width: 1px)', '@layer base', '@scope (.a)', '@keyframes k', '@font-face', '@page :first'];
  const properties = ['color', 'display', 'flex', 'flex-wrap', 'gap', 'grid-gap', 'transform', 'translate', 'user-select', 'width', 'height', 'max-width', 'mask-composite', 'position', 'transition', 'background', 'background-image', 'grid-row', 'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end', 'grid-template-columns', 'appearance', 'writing-mode', 'align-self', 'justify-content', 'scroll-margin-top', 'scroll-padding-top', 'cursor', '--custom', '--x', 'content', 'font-family', 'backdrop-filter'];
  const values = ['red', 'flex', 'inline-flex', 'grid', 'wrap', '1px 2px', 'rotate(1deg)', 'none', 'max-content', 'stretch', 'fill-available', 'fit-content', 'add, subtract', 'sticky', 'transform 1s', 'image-set("a.png" 1x)', 'url(a:b.png)', '1 / 3', 'span 2', '2', 'vertical-lr', 'horizontal-tb', 'flex-start', 'space-between', '10px', 'grab', '{a}', '', '"a;b"', 'var(--a, 1px)', 'calc(1px + 2px)', '1px!important', 'a:b', 'rgba(0, 0, 0, .5)', 'a\\:b', '\\31 0'];
  const space = () => pick(['', ' ', '\n  ', '  ']);
  const block = depth => {
    let out = '';
    for (let i = 0, count = 1 + Math.floor(random() * 4); i < count; i++) {
      const r = random();
      if (r < 0.55 || depth > 2) out += space() + pick(properties) + space() + ':' + space() + pick(values) + (random() < 0.9 ? ';' : '');
      else if (r < 0.62) out += space() + pick(['/* c */', '// line\n', '/**/']);
      else out += space() + pick(selectors) + space() + '{' + block(depth + 1) + space() + '}';
    }
    return out;
  };
  const inputs = [];
  for (let i = 0; i < count; i++) inputs.push(random() < 0.5 ? block(0) : pick(selectors.filter(s => !s.includes('&'))) + '{' + block(1) + '}');
  return inputs;
}

(async () => {
  assert.equal(require('./node_modules/stylis/package.json').version, '4.4.0');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'stylis-compare-'));
  try {
    fs.cpSync(path.join(modules, 'stylis/src'), path.join(temporary, 'src'), {recursive: true});
    fs.copyFileSync(path.join(modules, 'stylis/index.js'), path.join(temporary, 'index.js'));
    fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}\n');
    for (const [file, replacements] of Object.entries(patches)) {
      let source = fs.readFileSync(path.join(temporary, file), 'utf8');
      for (const [from, to] of replacements) {
        assert.equal(source.split(from).length, 2, `${file}: patch must apply once: ${from.slice(0, 60)}`);
        source = source.replace(from, () => to);
      }
      fs.writeFileSync(path.join(temporary, file), source);
    }
    const reference = await import(pathToFileURL(path.join(temporary, 'index.js')).href);
    const library = await import(pathToFileURL(path.join(vpm, 'index.js')).href);

    const stylesheets = [];
    for (const directory of ['bootstrap/dist/css', 'bulma/css', 'animate.css', 'normalize.css']) {
      for (const name of fs.readdirSync(path.join(modules, directory))) {
        if (name.endsWith('.css') && !name.includes('.min.')) stylesheets.push(path.join(directory, name));
      }
    }
    const inputs = [...stylesheets.map(file => [file, fs.readFileSync(path.join(modules, file), 'utf8')]), ...generated(generatedCount).map((css, index) => ['generated ' + index, css])];
    let bytes = 0;
    const differences = [];
    for (const [name, css] of inputs) {
      bytes += css.length;
      const expected = outputs(reference, css), actual = outputs(library, css);
      for (const key of Object.keys(expected)) if (expected[key] !== actual[key]) differences.push({name, key, css: css.slice(0, 300), expected: expected[key].slice(0, 300), actual: actual[key].slice(0, 300)});
    }
    for (const difference of differences.slice(0, 10)) console.log(difference);
    console.log(`${inputs.length} inputs (${stylesheets.length} stylesheets, ${generatedCount} generated; ${(bytes / 1e6).toFixed(1)} MB): ${differences.length} differences in trees or output from stylis 4.4.0 with VPM's changes.`);
    assert.equal(differences.length, 0);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
