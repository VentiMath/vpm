'use strict';
// Runs FullCalendar 7.1.3's browser suite (packages/vanilla-tests) the way
// upstream runs it against the React build (FORCE_REACT=1): `fullcalendar` is
// the plain JavaScript API from packages/vanilla-w-react, built here on the
// pinned @fullcalendar/react 7.1.3 (--upstream) or on vfullcalendar-react. The
// suite and its plugins are bundled with esbuild and run with Jasmine 3.99.1 in
// headless Chromium after the same jQuery, jasmine-jquery, jquery-simulate and
// jQuery UI scripts upstream's Karma configuration loads, at its 1280x1696
// window, in America/Phoenix: a fixed non-UTC offset, as the suite's local time
// zone specs need, without daylight saving changes that shift specs built from
// the current date. Results are written per spec; compare.cjs compares the libraries.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const {verify} = require('./upstream.cjs');
const upstream = process.argv.includes('--upstream');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
verify();
const modules = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
const implementation = upstream ? path.join(modules, '@fullcalendar/react') : path.join(packages, 'vfullcalendar-react');
const engine = upstream ? path.join(modules, '@full-ui/headless-calendar/index.js') : path.join(packages, 'vfull-ui-headless-calendar/index.js');
const core = upstream ? path.join(modules, '@fullcalendar/core/protected-api.js') : path.join(packages, 'vfullcalendar-core/protected-api.js');

function materialize(root) {
  const source = path.join(__dirname, 'upstream');
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(source, dir), {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.txt')) {
        fs.mkdirSync(path.join(root, dir), {recursive: true});
        fs.copyFileSync(path.join(source, file), path.join(root, file.slice(0, -4)));
      }
    }
  };
  for (const dir of ['vanilla-tests', 'vanilla-w-react', 'icalendar', 'rrule', 'google-calendar', 'format-moment', 'format-luxon3']) walk(dir);
}

// `fullcalendar` is fullcalendar-w-react (upstream's FORCE_REACT remap):
// entries map to its sources, CSS and locales to the React package's files.
function resolver(root) {
  const vanilla = path.join(root, 'vanilla-w-react/src');
  const fileIn = (dir, name) => ['.ts', '.tsx', '/index.ts'].map(ext => path.join(dir, name + ext)).find(fs.existsSync);
  const packageFile = (base, subpath) => {
    const exports = require(path.join(base, 'package.json')).exports;
    let target = exports['./' + subpath];
    if (target === undefined) {
      const wildcard = Object.keys(exports).find(key => key.includes('*') && ('./' + subpath).startsWith(key.split('*')[0]) && ('./' + subpath).endsWith(key.split('*')[1]));
      target = wildcard && JSON.parse(JSON.stringify(exports[wildcard]).replaceAll('*', ('./' + subpath).slice(wildcard.split('*')[0].length, ('./' + subpath).length - wildcard.split('*')[1].length)));
    }
    while (target && typeof target === 'object') target = target.import ?? target.default;
    assert.ok(target, `${base} does not export ./${subpath}`);
    return path.join(base, target);
  };
  return {
    name: 'fullcalendar-react-suite',
    setup(build) {
      build.onResolve({filter: /^fullcalendar(\/|$)/}, args => {
        const subpath = args.path.slice('fullcalendar'.length + 1);
        if (subpath === '') return {path: fileIn(vanilla, 'index')};
        if (subpath === 'preact') return {path: fileIn(vanilla, 'react')};
        if (subpath.endsWith('.css')) return {path: packageFile(implementation, subpath)};
        if (subpath.startsWith('locales/')) return {path: packageFile(implementation, subpath)};
        const file = fileIn(vanilla, subpath);
        assert.ok(file, 'unmapped ' + args.path);
        return {path: file};
      });
      build.onResolve({filter: /^@fullcalendar\/react(\/|$)/}, args => ({path: packageFile(implementation, args.path.slice('@fullcalendar/react'.length + 1) || '.')}));
      build.onResolve({filter: /^@full-ui\/headless-calendar$/}, () => ({path: engine}));
      build.onResolve({filter: /^@fullcalendar\/core\/protected-api$/}, () => ({path: core}));
      build.onResolve({filter: /^vfull-ui-headless-calendar$/}, () => ({path: engine}));
      build.onResolve({filter: /^vfullcalendar-core\/protected-api$/}, () => ({path: core}));
      build.onResolve({filter: /^@fullcalendar\/(icalendar|rrule|google-calendar|format-moment|format-luxon3)$/}, args => ({path: path.join(root, args.path.slice('@fullcalendar/'.length), 'src/index.ts')}));
      // format-luxon3 depends on Luxon 3; the suite itself pins Luxon 2.
      build.onResolve({filter: /^luxon$/}, args => args.importer.includes(`${path.sep}format-luxon3${path.sep}`) ? {path: require.resolve('luxon3', {paths: [__dirname]})} : undefined);
      // One React for the calendar, the wrapper and the tests.
      build.onResolve({filter: /^(react|react-dom)(\/.*)?$/}, args => ({path: require.resolve(args.path, {paths: [__dirname]})}));
    },
  };
}

async function bundle(root) {
  const src = path.join(root, 'vanilla-tests/src');
  const tests = [];
  const walk = (dir, depth) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, depth + 1);
      else if (depth >= 1 && /\.tsx?$/.test(entry.name)) tests.push('./' + path.relative(src, file).split(path.sep).join('/'));
    }
  };
  walk(src, 0);
  tests.sort();
  fs.writeFileSync(path.join(src, 'index.ts'), "import './lib/global.css'\nimport './lib/global'\n" + tests.map(test => `import '${test.replace(/\.tsx?$/, '')}'`).join('\n') + '\n');
  await require('esbuild').build({
    entryPoints: [path.join(src, 'index.ts')], bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    outfile: path.join(root, 'out/suite.js'), jsx: 'automatic', jsxImportSource: 'react', logLevel: 'error',
    define: {'process.env.NODE_ENV': '"development"'}, nodePaths: [modules], plugins: [resolver(root)],
    // Upstream's Rollup build injects these helpers into each test module from
    // lib/global-utils (rollup-presets.ts); esbuild's inject does the same.
    inject: [path.join(src, 'lib/global-utils.ts')],
    loader: {'.woff': 'file', '.woff2': 'file', '.svg': 'file'},
  });
  return tests.length;
}

async function run(root) {
  const scripts = ['jquery', 'jasmine-jquery', 'jquery-simulate', 'components-jqueryui'].map(name => require.resolve(name, {paths: [__dirname]}));
  const jasmine = path.join(modules, 'jasmine-core/lib/jasmine-core');
  const files = {'/jasmine.js': path.join(jasmine, 'jasmine.js'), '/jasmine-html.js': path.join(jasmine, 'jasmine-html.js'), '/boot0.js': path.join(jasmine, 'boot0.js'),
    '/suite.js': path.join(root, 'out/suite.js'), '/suite.css': path.join(root, 'out/suite.css')};
  scripts.forEach((file, i) => { files[`/lib${i}.js`] = file; });
  const page = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/suite.css"></head><body>
<script src="/jasmine.js"></script><script src="/jasmine-html.js"></script><script src="/boot0.js"></script>
<script>
  const env = jasmine.getEnv();
  env.configure({random: false, stopOnSpecFailure: false});
  window.__specs = []; window.__done = null;
  // Karma's client configuration. --no-gcal skips the Google Calendar tests,
  // which call Google's live API, as upstream's CI does.
  window.__karma__ = {config: {cliArgs: ['--no-gcal']}};
  env.addReporter({
    specDone: r => window.__specs.push({name: r.fullName, status: r.status, message: (r.failedExpectations[0] || {}).message || ''}),
    jasmineDone: r => { window.__done = {status: r.overallStatus, incomplete: r.incompleteReason || null, globalErrors: (r.failedExpectations || []).map(e => e.message)}; },
  });
</script>
${scripts.map((_, i) => `<script src="/lib${i}.js"></script>`).join('')}
<script src="/suite.js"></script>
<script>env.execute();</script></body></html>`;
  const server = http.createServer((request, response) => {
    const url = request.url.split('?')[0];
    if (url === '/') { response.writeHead(200, {'content-type': 'text/html'}); response.end(page); return; }
    const file = files[url];
    if (!file || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {'content-type': url.endsWith('.css') ? 'text/css' : 'text/javascript'});
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const {chromium} = require('playwright-core');
  // CHROME_PATH, a system Chrome (CI runners), or else Playwright's own browser.
  const pwBrowsers = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const executablePath = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync)
    || (fs.existsSync(pwBrowsers) ? fs.readdirSync(pwBrowsers) : []).filter(d => d.startsWith('chromium-'))
      .flatMap(d => ['chrome-linux64', 'chrome-linux'].map(sub => path.join(pwBrowsers, d, sub, 'chrome'))).find(fs.existsSync);
  const browser = await chromium.launch({executablePath, args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 1696}, timezoneId: 'America/Phoenix', locale: 'en-US'});
    const tab = await context.newPage();
    const console = [];
    tab.on('pageerror', error => console.push('pageerror: ' + error.message));
    await tab.goto(`http://127.0.0.1:${server.address().port}/`);
    await tab.waitForFunction(() => window.__done !== null, null, {timeout: 1800000, polling: 1000});
    return {...await tab.evaluate(() => ({specs: window.__specs, done: window.__done})), console};
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-browser-suite-'));
  try {
    materialize(root);
    const files = await bundle(root);
    const started = Date.now();
    const result = await run(root);
    const counts = {};
    for (const spec of result.specs) counts[spec.status] = (counts[spec.status] || 0) + 1;
    const report = {library: upstream ? 'upstream' : 'vpm', files, seconds: Math.round((Date.now() - started) / 1000), counts, done: result.done, pageErrors: result.console, specs: result.specs};
    if (output) fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
    console.log(`${upstream ? 'Upstream' : 'VPM'} FullCalendar browser suite: ${files} files, ${result.specs.length} specs: ${JSON.stringify(counts)} in ${report.seconds}s.`);
  } finally {
    if (!process.env.KEEP) fs.rmSync(root, {recursive: true, force: true}); else console.log('kept', root);
  }
})().catch(error => { console.error(error); process.exit(1); });
