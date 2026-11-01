'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
if (!process.argv.includes('--child')) {
  const outputs = ['upstream', 'vpm'].map(variant => {
    const run = spawnSync(process.execPath, [__filename, '--child', variant], {encoding: 'utf8', timeout: 60000});
    assert.equal(run.status, 0, run.stderr || run.stdout);return JSON.parse(run.stdout);
  });
  assert.deepEqual(outputs[1].html, outputs[0].html);
  assert.ok(outputs[1].calls > 0);assert.equal(outputs[1].calls, outputs[0].calls);
  console.log(`React 19/MUI 7: ${outputs[0].html.length} rendered cases match through ${outputs[0].calls} instrumented clsx calls.`);
} else {
  const root = path.resolve(__dirname, 'node_modules'), reference = require.resolve('clsx', {paths: [root]});
  const source = process.argv.at(-1) === 'vpm' ? require('../../packages/vclsx') : require(reference);
  let calls = 0;const instrumented = (...args) => {calls++;return source(...args);};instrumented.clsx = instrumented;
  require(reference);require.cache[reference].exports = instrumented;
  const React = require('./node_modules/react'), {renderToStaticMarkup} = require('./node_modules/react-dom/server');
  const {Button, Chip, Alert, Box} = require('./node_modules/@mui/material');
  const html = [];
  for (const disabled of [false, true]) for (const variant of ['text', 'outlined', 'contained']) {
    html.push(renderToStaticMarkup(React.createElement(Button, {disabled, variant, className: instrumented('caller-button', disabled && 'caller-disabled')}, 'Practice')));
  }
  for (const color of ['primary', 'success', 'error']) html.push(renderToStaticMarkup(React.createElement(Chip, {color, label: 'Math', className: 'caller-chip'})));
  html.push(renderToStaticMarkup(React.createElement(Alert, {severity: 'warning', className: 'caller-alert'}, 'Reminder')));
  html.push(renderToStaticMarkup(React.createElement(Box, {className: instrumented('FusePageSimple-header', ['w-full', {active: true}])}, 'Header')));
  process.stdout.write(JSON.stringify({html, calls}));
}
