'use strict';
const assert = require('node:assert/strict'), {spawnSync} = require('node:child_process');
if (process.argv[2] === '--child') {
  const library = process.argv[3], browser = process.argv[4] === 'browser';
  let page, frame;
  if (browser) {
    const {JSDOM} = require('./node_modules/jsdom');
    page = new JSDOM('<!doctype html><head></head><body></body>');
    frame = new JSDOM('<!doctype html><head></head><body></body>');
    global.window = page.window; global.document = page.window.document; global.HTMLElement = page.window.HTMLElement;
  }
  const tree = require('./consumer-tree.cjs')(library);
  try {
    const React = tree.require('react'), h = React.createElement;
    const api = tree.require('@emotion/react');
    const results = {};
    if (!browser) {
      const render = tree.require('react-dom/server').renderToStaticMarkup;
      let color = 'red';
      const declaration = () => ({color});
      function Reader() {return h('output', null, api.useTheme().color);}
      const element = h(api.ThemeProvider, {theme: declaration}, h(Reader));
      results.first = render(element);
      color = 'blue'; results.second = render(element);
      let nested = ['first', {middle: true, absent: false}, 'last'];
      for (let i = 0; i < 20000; i++) nested = [nested];
      try {results.deep = render(h(api.ClassNames, null, ({cx}) => h('output', null, cx(nested))));}
      catch (error) {results.deepError = error.name;}
      const cycle = []; cycle.push(cycle);
      try {render(h(api.ClassNames, null, ({cx}) => h('output', null, cx(cycle))));}
      catch (error) {results.cycle = {name: error.name, message: error.message};}
      // Reusing an array in sibling branches is valid, not an ancestor cycle.
      const shared = ['one', 'two'];
      results.shared = render(h(api.ClassNames, null, ({cx}) => h('output', null, cx(shared, shared))));
    } else {
      const createCache = tree.require('@emotion/cache').default;
      const cache = createCache({key: 'frame', container: frame.window.document.head, speedy: false});
      const styles = {body: {color: 'red'}}, name = api.css(styles).name;
      const add = (document, color) => {
        const style = document.createElement('style'); style.setAttribute('data-emotion', 'frame-global ' + name);
        style.textContent = 'body{color:' + color + ';}'; document.head.appendChild(style); return style;
      };
      const outside = add(document, 'purple');
      const inside = add(frame.window.document, 'red');
      const root = tree.require('react-dom/client').createRoot(frame.window.document.body.appendChild(frame.window.document.createElement('div')));
      const flush = tree.require('react-dom').flushSync;
      const element = styles => h(api.CacheProvider, {value: cache}, h(api.Global, {styles}));
      flush(() => root.render(element(styles)));
      results.hydrated = inside.getAttribute('data-emotion') === 'frame-global';
      results.outsidePreserved = outside.parentNode === document.head;
      results.mountedStyles = frame.window.document.head.querySelectorAll('style').length;
      flush(() => root.render(element({body: {color: 'blue'}})));
      results.updatedStyles = frame.window.document.head.querySelectorAll('style').length;
      results.blue = frame.window.document.head.textContent.includes('color:blue');
      flush(() => root.unmount());
      results.remainingStyles = frame.window.document.head.querySelectorAll('style').length;
      cache.sheet.flush();
      const componentCache = createCache({key: 'component', container: frame.window.document.head, speedy: false});
      const container = frame.window.document.body.appendChild(frame.window.document.createElement('div'));
      const failures = [];
      const client = tree.require('react-dom/client').createRoot(container, {onUncaughtError: error => failures.push(error.message)});
      const components = color => h(api.CacheProvider, {value: componentCache}, h(React.Fragment, null,
        api.jsx('button', {css: {color}}, 'css prop'),
        h(api.ClassNames, null, ({css}) => h('output', {className: css({color})}, 'class names'))));
      flush(() => client.render(components('red')));
      assert.equal(container.children.length, 2);
      flush(() => client.render(components('blue')));
      assert.equal(container.children.length, 2);
      assert.ok(frame.window.document.head.textContent.includes('color:blue'));
      flush(() => client.unmount());
      assert.deepEqual(failures, [], 'browser insertion effects return cleanup functions or undefined, never CSS');
      componentCache.sheet.flush();
    }
    process.stdout.write(JSON.stringify(results));
  } finally {tree.cleanup(); page?.window.close(); frame?.window.close();}
} else {
  const results = {};
  for (const mode of ['server', 'browser']) for (const library of ['upstream', 'vpm']) {
    const result = spawnSync(process.execPath, ['--preserve-symlinks', __filename, '--child', library, mode], {
      encoding: 'utf8', timeout: 120000, env: {...process.env, NODE_ENV: 'production'},
    });
    assert.equal(result.status, 0, `${library}/${mode}\n${result.stderr}`);
    results[library + '/' + mode] = JSON.parse(result.stdout);
  }
  const original = results['upstream/server'], actual = results['vpm/server'];
  assert.equal(original.first, '<output>red</output>');
  assert.equal(original.second, '<output>red</output>', 'control reproduces shared function-theme result across independent renders');
  assert.equal(actual.second, '<output>blue</output>');
  assert.equal(actual.first, original.first);
  if (!process.versions.bun || original.deepError) assert.equal(original.deepError, 'RangeError');
  else assert.equal(original.deep, actual.deep); // Bun tolerates a deeper native stack.
  assert.equal(actual.deep, '<output>first middle last</output>');
  assert.equal(actual.cycle.name, 'TypeError'); assert.match(actual.cycle.message, /cycles/);
  assert.equal(original.cycle.name, 'RangeError');
  assert.equal(actual.shared, '<output>one two one two</output>'); assert.equal(actual.shared, original.shared);
  assert.deepEqual(results['vpm/browser'], {hydrated: true, outsidePreserved: true, mountedStyles: 1, updatedStyles: 1, blue: true, remainingStyles: 0});
  assert.equal(results['upstream/browser'].outsidePreserved, false);
  assert.equal(results['upstream/browser'].hydrated, false);
  assert.equal(results['upstream/browser'].remainingStyles, 1);
  console.log('React lifecycle controls: isolated function themes, deep/shared/cyclic class arrays, document-scoped Global hydration, updates and cleanup.');
}
