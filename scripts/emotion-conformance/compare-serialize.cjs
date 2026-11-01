'use strict';
// Differential comparison of vemotion-serialize with @emotion/serialize 1.3.3
// over generated style arguments: objects (nested selectors, fallback arrays,
// numbers, booleans, null, custom properties, vendor keys), arrays, template
// literals, functions of props, other serialized styles, keyframes, labels and
// registered class names. The name, styles and keyframes chain of each result,
// the messages logged and any error thrown must be identical, in the
// development and production builds (run once per export condition). The
// inputs leave out what VPM changes (kebab-case keys with numbers, fallback
// arrays starting with a number, z-index in kebab-case, gridArea, non-ASCII
// text); regressions.cjs covers those.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process'), {pathToFileURL} = require('node:url');

function generate(count) {
  let seed = 2026;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = list => list[Math.floor(random() * list.length)];
  const keys = ['color', 'width', 'height', 'lineHeight', 'zIndex', 'opacity', 'flex', 'flexGrow', 'margin', 'padding', 'fontSize', 'fontWeight', 'msTransform', 'WebkitLineClamp', 'MozAppearance', '--gap', '--Theme-color', 'background-color', 'animation', 'animationName', 'content', 'display', 'transition'];
  const values = () => pick([0, 1, 1.5, 16, -2, 'red', 'auto', '10px', '"x"', "'y'", 'none', 'counter(item)', 'url(a.png)', true, false, null, undefined, '', 'calc(100% - 4px)', 'unquoted']);
  const selectors = ['&:hover', '& .child', '@media (min-width: 600px)', ':focus', '&::before', '@supports (display: grid)', 'undefined'];
  const keyframes = () => ({name: 'animation-' + Math.floor(random() * 1e6).toString(36), styles: '@keyframes x{from{opacity:0;}to{opacity:1;}}', anim: 1, toString() { return `_EMO_${this.name}_${this.styles}_EMO_`; }});
  const serialized = () => ({name: 'abc' + Math.floor(random() * 100), styles: 'color:blue;label:inner;', next: random() < 0.5 ? {name: 'kf', styles: '@keyframes kf{}'} : undefined});
  const registered = {'css-registered': 'color:green;', 'css-other': 'width:10px;'};
  const object = depth => {
    const result = {};
    for (let i = 0, n = 1 + Math.floor(random() * 5); i < n; i++) {
      const r = random();
      if (r < 0.5 || depth > 2) result[pick(keys)] = values();
      else if (r < 0.6) result[pick(keys)] = [pick(['red', '-webkit-box', 'flex', 'auto']), pick(['blue', 'flex', 10, '1fr'])];
      else if (r < 0.65) result[pick(selectors)] = [object(depth + 1), object(depth + 1)];
      else if (r < 0.7) result.animation = pick([keyframes(), `${keyframes()} 1s infinite`]);
      else if (r < 0.75) result[pick(selectors)] = 'css-registered';
      else result[pick(selectors)] = object(depth + 1);
    }
    return result;
  };
  const interpolation = depth => {
    const r = random();
    if (r < 0.35 || depth > 2) return object(depth);
    if (r < 0.45) return [interpolation(depth + 1), interpolation(depth + 1)];
    if (r < 0.55) return props => (props?.on ? object(depth + 1) : 'color:red;');
    if (r < 0.62) return serialized();
    if (r < 0.68) return keyframes();
    if (r < 0.74) return pick(['css-registered', 'css-other', 'unregistered', 'label:Box;', 'color:red;label:Card;']);
    if (r < 0.8) return pick([true, false, null, undefined, 0]);
    return object(depth);
  };
  const cases = [];
  for (let i = 0; i < count; i++) {
    const withRegistered = random() < 0.5, withProps = random() < 0.5;
    if (random() < 0.3) {
      const strings = Object.assign(['color:red;', ';label:Template;', ';'], {raw: ['color:red;', ';label:Template;', ';']});
      cases.push({args: [strings, interpolation(1), interpolation(1)], registered: withRegistered ? registered : undefined, props: withProps ? {on: random() < 0.5} : undefined});
    } else {
      const args = [];
      for (let j = 0, n = 1 + Math.floor(random() * 3); j < n; j++) args.push(interpolation(0));
      cases.push({args, registered: withRegistered ? registered : undefined, props: withProps ? {on: random() < 0.5} : undefined});
    }
  }
  return cases;
}

const chain = next => { const out = []; for (; next; next = next.next) out.push([next.name, next.styles]); return out; };
function run(serializeStyles, cases) {
  const logged = [], original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    return cases.map(({args, registered, props}) => {
      logged.length = 0;
      try {
        const result = serializeStyles(args, registered, props);
        return JSON.stringify([result.name, result.styles, chain(result.next), String(result), [...logged]]);
      } catch (error) {
        return JSON.stringify(['throws', error.message, [...logged]]);
      }
    });
  } finally {
    console.error = original;
  }
}

if (process.argv[2] === '--child') {
  (async () => {
    const count = Number(process.argv[3]);
    const upstream = require('@emotion/serialize').serializeStyles; // by name, so the export condition applies
    const {serializeStyles: vpm} = await import(pathToFileURL(path.resolve(__dirname, '../../packages/vemotion-serialize/index.js')).href);
    const expected = run(upstream, generate(count)), actual = run(vpm, generate(count));
    const differences = expected.flatMap((value, index) => (value === actual[index] ? [] : [{index, expected: value.slice(0, 400), actual: actual[index].slice(0, 400)}]));
    process.stdout.write(JSON.stringify({count, differences: differences.length, examples: differences.slice(0, 5)}));
  })();
} else {
  const count = 20000;
  for (const [build, flags] of [['production', []], ['development', ['--conditions=development']]]) {
    const result = spawnSync(process.execPath, [...flags, __filename, '--child', String(count)], {encoding: 'utf8', timeout: 300000});
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    for (const example of report.examples) console.log(build, example);
    console.log(`${build}: ${report.count} generated style arguments, ${report.differences} differences from @emotion/serialize 1.3.3.`);
    assert.equal(report.differences, 0);
  }
}
