'use strict';
// @emotion/styled reads the theme context only when the theme prop is null,
// so a styled component whose theme prop comes and goes calls a different
// number of hooks; React's development build reports "a change in the order
// of Hooks". Renders such a component with the original and with VPM's
// packages (React 16.14 and react-test-renderer, as Emotion's suite uses) and
// prints the messages React logged for each.
//
// VPM's packages import React by name, so they run from a tree that links them
// beside the fixture's React (node --preserve-symlinks).
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process');

if (process.argv[2] === '--child') {
  (async () => {
    const [library, modules] = process.argv.slice(3);
    const React = require(path.join(modules, 'react'));
    const renderer = require(path.join(modules, 'react-test-renderer'));
    const styled = library === 'upstream' ? require(path.join(modules, '@emotion/styled')).default : (await import(path.join(modules, 'vemotion-styled/index.js'))).default;
    const Box = styled.div({color: 'red'});
    const messages = [];
    console.error = (...args) => messages.push(args.map(String).join(' '));
    const root = renderer.create(React.createElement(Box, {theme: {spacing: 1}}));
    root.update(React.createElement(Box, null));
    root.update(React.createElement(Box, {theme: {spacing: 2}}));
    process.stdout.write(JSON.stringify(messages.filter(message => /order of Hooks/.test(message)).map(message => message.split('\n')[0])));
  })().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
} else {
  module.exports = function hookOrderMessages() {
    const fixture = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emotion-hook-order-'));
    try {
      const modules = path.join(directory, 'node_modules');
      fs.mkdirSync(modules);
      for (const name of fs.readdirSync(fixture)) if (!name.startsWith('.')) fs.symlinkSync(path.join(fixture, name), path.join(modules, name), 'dir');
      for (const name of fs.readdirSync(packages).filter(name => name.startsWith('vemotion-') || name === 'vstylis')) fs.symlinkSync(path.join(packages, name), path.join(modules, name), 'dir');
      const results = {};
      for (const library of ['upstream', 'vpm']) {
        const run = spawnSync(process.execPath, ['--preserve-symlinks', __filename, '--child', library, modules], {encoding: 'utf8', timeout: 120000, env: {...process.env, NODE_ENV: 'development'}});
        if (run.status !== 0) throw new Error(library + '\n' + run.stderr);
        results[library] = JSON.parse(run.stdout);
      }
      return results;
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  };
}
