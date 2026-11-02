'use strict';
// Bundle size of a typical application entry (calendar, day and time grids,
// interaction and the classic theme) with each library, minified by
// esbuild for browsers, with React and react-dom left external. Sizes are
// deterministic for these inputs; `--verify-current` rebuilds and compares with
// the recorded results.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const fixture = path.resolve(__dirname, '../../../scripts/fullcalendar-react-conformance');
const packages = path.resolve(__dirname, '../..');
const esbuild = require(path.join(fixture, 'node_modules/esbuild'));
const entry = name => `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import FullCalendar from '${name}';
import dayGridPlugin from '${name}/daygrid';
import timeGridPlugin from '${name}/timegrid';
import interactionPlugin from '${name}/interaction';
import classicThemePlugin from '${name}/themes/classic';
createRoot(document.getElementById('calendar')).render(createElement(FullCalendar, {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin],
  initialView: 'dayGridMonth', timeZone: 'America/New_York', events: { url: '/api/events' },
}));
`;
async function measure(library) {
  const name = library === 'upstream' ? '@fullcalendar/react' : 'vfullcalendar-react';
  const alias = library === 'upstream' ? {} : {'vfullcalendar-react': path.join(packages, 'vfullcalendar-react'), 'vfull-ui-headless-calendar': path.join(packages, 'vfull-ui-headless-calendar'), 'vfullcalendar-core': path.join(packages, 'vfullcalendar-core')};
  const result = await esbuild.build({stdin: {contents: entry(name), resolveDir: fixture, loader: 'js'}, bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2020',
    write: false, metafile: true, external: ['react', 'react-dom', 'react/*', 'react-dom/*'], alias, nodePaths: [path.join(fixture, 'node_modules')], logLevel: 'error',
    define: {'process.env.NODE_ENV': '"production"'}});
  const code = result.outputFiles[0].contents;
  const inputs = Object.keys(result.metafile.inputs);
  return {bytes: code.length, gzip: zlib.gzipSync(code, {level: 9}).length, modules: inputs.length,
    polyfillModules: inputs.filter(file => /temporal-(polyfill|spec|utils)/.test(file)).length};
}
(async () => {
  const results = {upstream: await measure('upstream'), vpm: await measure('vpm')};
  const file = path.join(__dirname, 'results/bundle.json');
  if (process.argv.includes('--verify-current')) assert.deepEqual(results, JSON.parse(fs.readFileSync(file, 'utf8')).results);
  else if (process.argv.includes('--write')) fs.writeFileSync(file, JSON.stringify({recordedAt: new Date().toISOString().slice(0, 10), esbuild: esbuild.version, results}, null, 2) + '\n');
  console.table(results);
})().catch(error => { console.error(error); process.exit(1); });
