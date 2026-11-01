'use strict';
// React is a peer the workspace does not install; Emotion's suite (scripts/
// emotion-conformance) covers the components. These cover the helpers.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');

test('static properties are copied onto wrappers, except React\'s', async () => {
  const {default: hoist} = await import(path.join(__dirname, '../src/hoist-statics.js'));
  class Base { static fromBase = 'base'; }
  class Component extends Base { static fetchData = () => 'data'; static displayName = 'Component'; static propTypes = {}; }
  Component[Symbol.for('custom')] = 1;
  const wrapper = {$$typeof: Symbol.for('react.forward_ref'), render() {}, displayName: 'Wrapper'};
  assert.equal(hoist(wrapper, Component), wrapper);
  assert.equal(wrapper.fetchData(), 'data');
  assert.equal(wrapper.fromBase, 'base');
  assert.equal(wrapper[Symbol.for('custom')], 1);
  assert.equal(wrapper.displayName, 'Wrapper');
  assert.equal(wrapper.propTypes, undefined);
  assert.equal(hoist(wrapper, 'div'), wrapper);
});

test('labels come from the first component name in a stack trace', async () => {
  const {getLabelFromStackTrace} = await import(path.join(__dirname, '../src/label.js'));
  const v8 = 'Error\n    at createEmotionProps (x.js:1:1)\n    at Object.jsx (x.js:2:2)\n    at My$Card (app.js:3:3)\n    at renderWithHooks (react.js:4:4)';
  assert.equal(getLabelFromStackTrace(v8), 'My-Card');
  assert.equal(getLabelFromStackTrace('createEmotionProps@x.js:1:1\nPanel@app.js:2:2'), 'Panel');
  assert.equal(getLabelFromStackTrace('Error\n    at renderWithHooks (react.js:1:1)\n    at Later (app.js:2:2)'), undefined);
  assert.equal(getLabelFromStackTrace(undefined), undefined);
});

test('application rendering owns themes, global sheets and class-name traversal', () => {
  const {spawnSync} = require('node:child_process');
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/emotion-conformance/react-lifecycle.cjs')], {encoding: 'utf8', timeout: 120000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
