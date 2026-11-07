'use strict';
// Runs vitest test files (jsdom) against the pinned original (upstream: true)
// or vfullcalendar-react. The files import the built package as ../dist; that
// directory links to the package under test. React, react-dom and VPM's two
// calendar packages resolve to single copies, so the tests and the calendar
// share one React.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process');
const modules = path.join(__dirname, 'node_modules'), packages = process.env.CALENDAR_PACKAGES_DIR || path.resolve(__dirname, '../../packages');

exports.runVitest = function runVitest({upstream, files, env = {}}) {
  const implementation = upstream ? path.join(modules, '@fullcalendar/react') : path.join(packages, 'vfullcalendar-react');
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-react-vitest-')));
  try {
    fs.mkdirSync(path.join(temporary, 'tests'));
    for (const [name, source] of Object.entries(files)) fs.copyFileSync(source, path.join(temporary, 'tests', name));
    fs.symlinkSync(implementation, path.join(temporary, 'dist'), 'dir');
    fs.symlinkSync(modules, path.join(temporary, 'node_modules'), 'dir');
    const alias = {
      react: path.join(modules, 'react'), 'react-dom': path.join(modules, 'react-dom'),
      'vfull-ui-headless-calendar': path.join(packages, 'vfull-ui-headless-calendar/index.js'),
      'vfullcalendar-core/protected-api': path.join(packages, 'vfullcalendar-core/protected-api.js'),
    };
    const include = Object.keys(files).filter(name => /\.(test\.tsx|tsx)$/.test(name) && name !== 'utils.ts').map(name => 'tests/' + name);
    // Upstream's configuration (jsdom, globals). In upstream's repository ../dist
    // is the package's own build, which vitest processes itself, so
    // vi.resetModules() re-evaluates it (one test relies on that). The original
    // installed here sits in node_modules, so it is inlined.
    fs.writeFileSync(path.join(temporary, 'vitest.config.mjs'), `export default {
  resolve: {alias: ${JSON.stringify(alias)}, dedupe: ['react', 'react-dom']},
  test: {environment: 'jsdom', include: ${JSON.stringify(include)}, globals: true, server: {deps: {inline: [/@fullcalendar[\\\\/]react/, /vfullcalendar-react/]}}},
};\n`);
    const report = path.join(temporary, 'report.json');
    // UTC, as upstream's CI runs: some tests build dates from the current time,
    // and on a day a local zone changes offset their expected counts are off.
    const result = spawnSync(process.execPath, [path.join(modules, 'vitest/vitest.mjs'), 'run', '--root', temporary, '--config', path.join(temporary, 'vitest.config.mjs'), '--reporter=json', '--outputFile=' + report],
      {cwd: temporary, encoding: 'utf8', timeout: 600000, env: {...process.env, TZ: 'UTC', ...env}});
    let stats;
    try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
      throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
    }
    if (!stats.numTotalTests || stats.testResults.some(suite => suite.status === 'failed' && !suite.assertionResults.length)) {
      throw new Error('Calendar suite did not load: ' + JSON.stringify(stats.testResults) + '\n' + result.stderr.slice(-6000));
    }
    return stats;
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
};
