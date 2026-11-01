'use strict';
// Each defect reproduced with the original @full-ui/headless-calendar 7.1.3 (on
// temporal-polyfill 1.0.1), then checked in vfull-ui-headless-calendar. Each
// library runs in a fresh process with TZ=America/New_York.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const entries = {
  upstream: path.join(__dirname, 'node_modules/@full-ui/headless-calendar/index.js'),
  vpm: path.resolve(__dirname, '../../packages/vfull-ui-headless-calendar/index.js'),
};

async function child(entry) {
  const H = await import(entry);
  const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
  const env = timeZone => new H.DateEnv({timeZone, calendarSystem: 'gregory', locale, weekTextLong: 'Week'});
  const out = {};
  // Morocco's Ramadan suspensions of +01:00: the polyfill's own transition
  // search misses them, so where it runs (no native Temporal: Node, the iOS 15
  // WebView, older browsers) a Casablanca calendar is an hour off during those
  // weeks. With a native Temporal (Bun), the polyfill defers to it.
  out.nativeTemporal = typeof globalThis.Temporal === 'object';
  const casablanca = env('Africa/Casablanca'), may17 = Date.UTC(2020, 4, 17, 15, 0, 0);
  out.casablanca = {
    marker: casablanca.timestampToMarker(may17).toISOString(),
    instant: new Date(casablanca.toDate(new Date(Date.UTC(2020, 4, 17, 9, 0, 0))).valueOf()).toISOString(),
    iso: casablanca.formatIso(new Date(Date.UTC(2020, 4, 17, 9, 0, 0))),
  };
  // Years 0-99 passed to Date.UTC and the Date constructor are read as 1900-1999.
  const utc = env('UTC');
  out.twoDigitYears = {
    parsed: H.parseMarker('0050-06-01').marker.toISOString(),
    addYears: utc.addYears(new Date(Date.UTC(2024, 0, 1)), -1990).toISOString(),
    startOfYear: utc.startOfYear(H.parseMarker('0099-12-31').marker).toISOString(),
    local: env('local').toDate(H.arrayToUtcDate([2024, 0, 1])).getFullYear() + '/' + H.arrayToLocalDate([50, 0, 1]).getFullYear(),
  };
  // Offsets are rounded hours and minutes separately: Denver's local mean time
  // (-6:59:56, until 1883) printed as "-06:60".
  out.offsetRounding = {
    denver: env('America/Denver').formatIso(new Date(Date.UTC(1880, 0, 1))),
    format: [H.formatTimeZoneOffset(-419.9333, true), H.formatTimeZoneOffset(59.6)],
  };
  // The local zone's array-to-date conversion dropped milliseconds, so toDate and
  // formatting lost them while formatIso kept them.
  const local = env('local'), marker = local.createMarker(Date.UTC(2024, 5, 1, 12, 0, 0, 750));
  const fractional = new H.NativeDateFormatter({hour: 'numeric', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
  out.localMilliseconds = {
    toDate: local.toDate(marker).toISOString(),
    formatted: H.joinDateTimeFormatParts(local.formatToParts(marker, fractional)),
    iso: local.formatIso(marker),
  };
  // What a browser bundle must load for named time zones.
  const fs = require('node:fs');
  // ES module resolution: relative paths, and package exports under the
  // "import" and "default" conditions.
  const resolve = (specifier, from) => {
    if (specifier.startsWith('.')) return path.resolve(path.dirname(from), specifier);
    const parts = specifier.split('/'), name = parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
    const subpath = '.' + specifier.slice(name.length);
    for (let dir = path.dirname(from); ; dir = path.dirname(dir)) {
      const root = path.join(dir, 'node_modules', name);
      if (fs.existsSync(path.join(root, 'package.json'))) {
        let target = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).exports[subpath];
        while (typeof target === 'object') target = target.import ?? target.default;
        return path.join(root, target);
      }
      assert.notEqual(dir, path.dirname(dir), 'unresolved ' + specifier);
    }
  };
  const graph = new Set(), visit = file => {
    if (graph.has(file)) return;
    graph.add(file);
    for (const [, specifier] of fs.readFileSync(file, 'utf8').matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g)) visit(resolve(specifier, file));
  };
  visit(entry);
  out.graph = {modules: graph.size, bytes: [...graph].reduce((sum, file) => sum + fs.statSync(file).size, 0)};
  return out;
}

if (process.argv[2] === '--child') {
  child(process.argv[3]).then(result => process.stdout.write(JSON.stringify(result)), error => { process.stderr.write(error.stack); process.exit(1); });
} else {
  const results = {};
  for (const [library, entry] of Object.entries(entries)) {
    const run = spawnSync(process.execPath, [__filename, '--child', entry], {encoding: 'utf8', env: {...process.env, TZ: 'America/New_York'}, timeout: 120000});
    assert.equal(run.status, 0, library + '\n' + run.stderr);
    results[library] = JSON.parse(run.stdout);
  }
  const {upstream, vpm} = results;
  const casablanca = {marker: '2020-05-17T15:00:00.000Z', instant: '2020-05-17T09:00:00.000Z', iso: '2020-05-17T09:00:00Z'};
  assert.deepEqual(upstream.casablanca, upstream.nativeTemporal ? casablanca : {marker: '2020-05-17T16:00:00.000Z', instant: '2020-05-17T08:00:00.000Z', iso: '2020-05-17T09:00:00+01:00'});
  assert.deepEqual(vpm.casablanca, casablanca);
  assert.deepEqual(upstream.twoDigitYears, {parsed: '1950-06-01T00:00:00.000Z', addYears: '1934-01-01T00:00:00.000Z', startOfYear: '1999-01-01T00:00:00.000Z', local: '2024/1950'});
  assert.deepEqual(vpm.twoDigitYears, {parsed: '0050-06-01T00:00:00.000Z', addYears: '0034-01-01T00:00:00.000Z', startOfYear: '0099-01-01T00:00:00.000Z', local: '2024/50'});
  assert.deepEqual(upstream.offsetRounding, {denver: '1880-01-01T00:00:00-06:60', format: ['-06:60', 'GMT+0:60']});
  assert.deepEqual(vpm.offsetRounding, {denver: '1880-01-01T00:00:00-07:00', format: ['-07:00', 'GMT+1']});
  assert.deepEqual(upstream.localMilliseconds, {toDate: '2024-06-01T12:00:00.000Z', formatted: '8:00:00.000AM', iso: '2024-06-01T08:00:00.750-04:00'});
  assert.deepEqual(vpm.localMilliseconds, {toDate: '2024-06-01T12:00:00.750Z', formatted: '8:00:00.750AM', iso: '2024-06-01T08:00:00.750-04:00'});
  assert(upstream.graph.modules > 1 && vpm.graph.modules === 1, JSON.stringify(results));
  console.log(`Reproduced and fixed: Casablanca an hour off during Morocco's Ramadan suspensions (${upstream.nativeTemporal ? 'not on this runtime, whose native Temporal the polyfill uses' : 'the polyfill\'s own implementation'}), years 0-99 read as 1900-1999, offsets printed as ":60", and local-time milliseconds dropped. Named time zones need ${upstream.graph.modules} modules (${(upstream.graph.bytes / 1024).toFixed(0)} KiB) upstream and ${vpm.graph.modules} (${(vpm.graph.bytes / 1024).toFixed(0)} KiB) here.`);
}
