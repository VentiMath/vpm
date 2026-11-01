'use strict';
// FullCalendar's JSON feed event source calls requestJson(method, url, params).
// This drives the same calls through @fullcalendar/core 7.1.3's protected-api,
// the copy @fullcalendar/react 7.1.3 bundles (the one that runs in a v7
// calendar), and vfullcalendar-core, each in its own process, against a local
// server that records every request. Requests and outcomes must match, apart
// from the three URL cases vfullcalendar-core builds differently, which are
// asserted exactly.
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http'), {spawn} = require('node:child_process');
const entries = {
  core: path.join(__dirname, 'node_modules/@fullcalendar/core/protected-api.js'),
  react: path.join(__dirname, 'node_modules/@fullcalendar/react/chunks/cb8ba596.js'),
  vpm: path.resolve(__dirname, '../../packages/vfullcalendar-core/protected-api.js'),
};
const range = {start: '2026-11-01T00:00:00', end: '2026-12-13T00:00:00', timeZone: 'America/New_York'};
const cases = [
  ['GET', '/events', range],
  ['get', '/events?calendar=7', {start: range.start}],
  ['POST', '/events', range],
  ['post', '/events?calendar=7', {...range, tags: ['a', 'b'], missing: undefined, count: 3}],
  ['GET', '/events', {title: 'Ünïcode & spaces = yes', emoji: '📅'}],
  ['GET', '/events', {}],
  ['GET', '/events#week', {start: range.start}],
  ['GET', '/events?', {start: range.start}],
  ['GET', '/failure', range],
  ['GET', '/not-json', range],
  ['PUT', '/events', {start: range.start}],
];

async function child(entry, base) {
  const mod = await import(entry);
  const requestJson = mod.requestJson ?? mod.e, JsonRequestError = mod.JsonRequestError ?? mod.J;
  const out = [];
  for (const [method, url, params] of cases) {
    try {
      const [value, response] = await requestJson(method, base + url, params);
      out.push({value, status: response.status});
    } catch (error) {
      out.push({error: error.constructor.name, message: error.message, isJsonRequestError: error instanceof JsonRequestError, status: error.response?.status});
    }
  }
  try { await requestJson('GET', 'http://127.0.0.1:9/closed', {}); } catch (error) { out.push({network: error.constructor.name, isJsonRequestError: error instanceof JsonRequestError}); }
  return out;
}

if (process.argv[2] === '--child') {
  child(process.argv[3], process.argv[4]).then(result => process.stdout.write(JSON.stringify(result)), error => { process.stderr.write(error.stack); process.exit(1); });
} else {
  (async () => {
    let log = [];
    const server = http.createServer((request, response) => {
      let body = '';
      request.on('data', chunk => body += chunk).on('end', () => {
        log.push({method: request.method, url: request.url, type: request.headers['content-type'] ?? null, body});
        if (request.url.startsWith('/failure')) { response.writeHead(500); response.end('{}'); return; }
        response.writeHead(200, {'content-type': 'application/json'});
        response.end(request.url.startsWith('/not-json') ? '[{"title":' : JSON.stringify([{title: 'Seminar', start: '2026-11-03T10:00:00'}]));
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const results = {};
    try {
      for (const [library, entry] of Object.entries(entries)) {
        log = [];
        // The server runs in this process, so the child is awaited, not waited on.
        const run = spawn(process.execPath, [__filename, '--child', entry, base]);
        let stdout = '', stderr = '';
        run.stdout.on('data', chunk => stdout += chunk); run.stderr.on('data', chunk => stderr += chunk);
        const [status] = await new Promise(resolve => run.on('close', (...args) => resolve(args)));
        assert.equal(status, 0, library + '\n' + stderr);
        results[library] = {outcomes: JSON.parse(stdout), requests: log};
      }
    } finally {
      server.close();
    }
    assert.deepEqual(results.react, results.core, 'the copy @fullcalendar/react bundles behaves as @fullcalendar/core');
    const {core, vpm} = results;
    const fixed = new Map([[5, '/events'], [6, '/events?start=2026-11-01T00%3A00%3A00'], [7, '/events?start=2026-11-01T00%3A00%3A00']]);
    // Upstream's URL for a call without parameters ends in "?"; Node's fetch drops
    // an empty query before sending, Bun's sends it.
    assert.ok(['/events?', '/events'].includes(core.requests[5].url));
    assert.deepEqual(core.requests.slice(6, 8).map(r => r.url), ['/events', '/events?&start=2026-11-01T00%3A00%3A00']);
    for (let i = 0; i < core.requests.length; i++) {
      assert.deepEqual(vpm.requests[i], fixed.has(i) ? {...core.requests[i], url: fixed.get(i)} : core.requests[i], `request ${i}`);
    }
    assert.deepEqual(vpm.outcomes, core.outcomes);
    assert.equal(core.requests.length, cases.length);
    assert.deepEqual(core.outcomes.slice(8), [
      {error: 'JsonRequestError', message: 'Request failed', isJsonRequestError: true, status: 500},
      {error: 'JsonRequestError', message: 'Failure parsing JSON', isJsonRequestError: true, status: 200},
      {value: [{title: 'Seminar', start: '2026-11-03T10:00:00'}], status: 200},
      {network: 'TypeError', isJsonRequestError: false},
    ]);
    console.log(`FullCalendar JSON feed requests: ${cases.length} calls and a refused connection through @fullcalendar/core, the copy @fullcalendar/react bundles and VPM give identical requests and results, except a #fragment URL, for which upstream sends no parameters, and two URLs left without a dangling "?" or "&".`);
  })().catch(error => { console.error(error); process.exit(1); });
}
