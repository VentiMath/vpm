'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Router = require('..');
const upstream = require('./fixtures/load.cjs')();
const { METHODS } = require('node:http');

function run(router, url = '/', method = 'GET', fields = {}) {
  const req = { url, method, ...fields };
  return new Promise((resolve, reject) => {
    const headers = Object.create(null);
    let settled = false;
    const timer = setTimeout(() => reject(new Error('router did not settle')), 3000);
    function settle(result) {
      if (settled) return reject(new Error('router settled twice'));
      settled = true; clearTimeout(timer); resolve({ req, headers, ...result });
    }
    const res = { setHeader(name, value) { headers[name.toLowerCase()] = value; }, end(body) { settle({ body }); } };
    try { router(req, res, error => settle({ error, fellThrough: true })); }
    catch (error) { clearTimeout(timer); reject(error); }
  });
}
const plain = value => JSON.parse(JSON.stringify(value));

for (const [name, Factory] of [['upstream', upstream], ['vrouter', Router]]) {
  test(name + ': callable constructor, prototype, chainable registration', () => {
    const router = new Factory();
    assert.equal(typeof router, 'function'); assert.ok(router instanceof Factory);
    assert.equal(router.use((req, res, next) => next()), router);
    assert.equal(router.get('/', (req, res) => res.end()), router);
    assert.equal(router.param('id', () => {}), router);
    const route = router.route('/x'); assert.ok(route instanceof Factory.Route);
    assert.equal(route.get(() => {}), route); assert.equal(route.all(() => {}), route);
    assert.throws(() => router({}, {}), /callback is required/);
  });

  test(name + ': all HTTP methods, HEAD fallback and explicit HEAD', async () => {
    for (const method of METHODS) {
      const router = Factory(); router[method.toLowerCase()]('/x', (req, res) => res.end(method));
      assert.equal((await run(router, '/x', method)).body, method);
    }
    const router = Factory(); router.get('/x', (req, res) => res.end('get'));
    assert.equal((await run(router, '/x', 'HEAD')).body, 'get');
    router.route('/y').get((req, res) => res.end('get')).head((req, res) => res.end('head'));
    assert.equal((await run(router, '/y', 'HEAD')).body, 'head');
  });

  test(name + ': OPTIONS collects unique sorted methods and lets middleware override', async () => {
    const router = Factory(); router.get('/x', () => {}); router.post('/x', () => {}); router.get('/x', () => {});
    const result = await run(router, '/x', 'OPTIONS');
    assert.equal(result.body, 'GET, HEAD, POST'); assert.equal(result.headers.allow, result.body);
    assert.equal(result.headers['content-length'], 15);
    assert.equal((await run(router, '/missing', 'OPTIONS')).fellThrough, true);
    router.use((req, res) => res.end('custom'));
    assert.equal((await run(router, '/x', 'OPTIONS')).body, 'custom');
  });

  test(name + ': nested mounts restore URL, parent params, baseUrl and next', async () => {
    const parent = Factory(), child = Factory({ mergeParams: true });
    const seen = [];
    child.get('/:id', (req, res, next) => { seen.push([req.url, req.baseUrl, req.originalUrl, plain(req.params)]); next(); });
    parent.use('/teams/:team', child);
    parent.use((req, res, next) => { seen.push([req.url, req.baseUrl, plain(req.params)]); next(); });
    const next = () => {}; const params = { original: true };
    const result = await run(parent, '/teams/red/42?q=1', 'GET', { baseUrl: '/api', params, next });
    assert.deepEqual(seen, [['/42?q=1', '/api/teams/red', '/teams/red/42?q=1', { team: 'red', id: '42' }], ['/teams/red/42?q=1', '/api', {}]]);
    assert.equal(result.req.params, params); assert.equal(result.req.next, next); assert.equal(result.req.baseUrl, '/api');
    assert.equal(result.req.url, '/teams/red/42?q=1');
  });

  test(name + ': mergeParams offsets numbered regex captures', async () => {
    const parent = Factory(), child = Factory({ mergeParams: true });
    parent.use(/^\/team\/([^/]+)/, child);
    child.get(/^\/([^/]+)\/([^/]+)$/, (req, res) => res.end(plain(req.params)));
    assert.deepEqual((await run(parent, '/team/red/42/edit')).body, { 0: 'red', 1: '42', 2: 'edit' });
  });

  test(name + ': mount boundaries, absolute URLs, query strings and missing URL', async () => {
    const router = Factory(); router.use('/foo', (req, res) => res.end([req.url, req.baseUrl]));
    assert.equal((await run(router, '/foobar')).fellThrough, true);
    assert.deepEqual((await run(router, '/foo?x=1')).body, ['/?x=1', '/foo']);
    assert.deepEqual((await run(router, 'http://example.test/foo/bar?q=1')).body, ['http://example.test/bar?q=1', '/foo']);
    assert.equal((await run(router, '/', 'GET', { url: undefined })).fellThrough, true);
  });

  test(name + ': path arrays, nesting, optional segments, wildcard arrays and decoding', async () => {
    const router = Factory();
    router.get(['/users/:id{/:action}', /^\/other\/([^/]+)$/], (req, res) => res.end(plain(req.params)));
    router.get('/files/*parts', (req, res) => res.end(plain(req.params)));
    assert.deepEqual((await run(router, '/users/a%2Fb')).body, { id: 'a/b' });
    assert.deepEqual((await run(router, '/users/42/edit')).body, { id: '42', action: 'edit' });
    assert.deepEqual((await run(router, '/other/abc')).body, { 0: 'abc' });
    assert.deepEqual((await run(router, '/files/a%20b/c')).body, { parts: ['a b', 'c'] });
    const bad = await run(router, '/users/%E0%A4');
    assert.equal(bad.error.status, 400); assert.match(bad.error.message, /Failed to decode param/);
  });

  test(name + ': case and trailing slash options', async () => {
    const loose = Factory(), strict = Factory({ caseSensitive: true, strict: true });
    for (const router of [loose, strict]) router.get('/Foo/', (req, res) => res.end('ok'));
    for (const path of ['/foo', '/Foo/', '/FOO/']) assert.equal((await run(loose, path)).body, 'ok');
    assert.equal((await run(strict, '/Foo/')).body, 'ok');
    for (const path of ['/foo/', '/Foo']) assert.equal((await run(strict, path)).fellThrough, true);
  });

  test(name + ': route/router exit signals and error handler arity', async () => {
    const parent = Factory(), child = Factory(); const seen = [];
    child.get('/x', (req, res, next) => next('route'), () => assert.fail('skipped route'));
    child.get('/x', (req, res, next) => { seen.push('second'); next('router'); });
    child.use(() => assert.fail('skipped router'));
    parent.use(child); parent.use((req, res) => res.end('parent'));
    assert.equal((await run(parent, '/x')).body, 'parent'); assert.deepEqual(seen, ['second']);
    const errors = Factory(); const error = new Error('test');
    errors.use((req, res, next) => next(error));
    errors.use(() => assert.fail('normal handler skipped'));
    errors.use((err, req, res, next) => { assert.equal(err, error); next(); });
    errors.use((req, res) => res.end('recovered'));
    assert.equal((await run(errors)).body, 'recovered');
  });

  test(name + ': native promise rejection and throwing handlers/parameters', async () => {
    for (const mode of ['request', 'error', 'param']) {
      const router = Factory(); const error = new Error(mode);
      if (mode === 'request') router.get('/:id', async () => { throw error; });
      if (mode === 'error') { router.use(() => { throw new Error('first'); }); router.use(async (err, req, res, next) => { throw error; }); }
      if (mode === 'param') { router.param('id', async () => { throw error; }); router.get('/:id', () => assert.fail()); }
      assert.equal((await run(router, '/x')).error, error);
    }
    const router = Factory(); router.use(() => Promise.reject());
    assert.equal((await run(router)).error.message, 'Rejected promise');
  });

  test(name + ': parameters run once per value, preserve edits, and propagate route skips', async () => {
    const router = Factory(); let calls = 0;
    router.param('id', (req, res, next, value, key) => { calls++; assert.equal(key, 'id'); req.params.id = value.toUpperCase(); next(); });
    router.use('/:id', (req, res, next) => { assert.equal(req.params.id, 'ABC'); next(); });
    router.get('/:id', (req, res) => res.end(req.params.id));
    assert.equal((await run(router, '/abc')).body, 'ABC'); assert.equal(calls, 1);
    const skipped = Factory(); skipped.param('id', (req, res, next) => next('route'));
    skipped.get('/:id', () => assert.fail()); skipped.use((req, res) => res.end('skipped'));
    assert.equal((await run(skipped, '/x')).body, 'skipped');
  });

  test(name + ': deep synchronous stacks yield without overflow', async () => {
    const router = Factory(); let count = 0;
    const fn = (req, res, next) => { count++; next(); };
    router.use(Array(1500).fill(fn)); router.get('/', Array(1500).fill(fn), (req, res) => res.end(count));
    assert.equal((await run(router)).body, 3000);
  });
}

test('prototype-like parameter names are ordinary own data and callbacks', async () => {
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const router = Router(); let calls = 0;
    router.param(key, (req, res, next, value) => { calls++; assert.equal(value, 'abc'); next(); });
    router.get('/:' + key, (req, res) => {
      assert.equal(Object.getPrototypeOf(req.params), null); res.end(req.params[key]);
    });
    assert.equal((await run(router, '/abc')).body, 'abc'); assert.equal(calls, 1);
  }
});

test('mergeParams preserves __proto__ data and leaves captured numeric params unchanged', async () => {
  const router = Router({ mergeParams: true });
  router.get(/^\/([^/]+)$/, (req, res) => res.end(plain(req.params)));
  const parent = Object.assign(Object.create(null), { 0: 'parent', __ignored: true }); parent.__proto__ = 'data';
  const result = await run(router, '/child', 'GET', { params: parent });
  assert.deepEqual(result.body, JSON.parse('{"0":"parent","1":"child","__ignored":true,"__proto__":"data"}'));
  assert.deepEqual(plain(router.stack[0].params), { 0: 'child' });
  assert.equal(Object.getPrototypeOf(parent), null);
});

for (const flags of ['g', 'y', 'gy']) test('RegExp /' + flags + ' state is isolated across requests', async () => {
  const pattern = new RegExp('^/([^/]+)$', flags); pattern.lastIndex = 12;
  const router = Router(); router.get(pattern, (req, res) => res.end(req.params[0]));
  for (let i = 0; i < 4; i++) assert.equal((await run(router, '/hello')).body, 'hello');
  assert.equal(pattern.lastIndex, 12);
  pattern.compile('^/changed$', flags);
  assert.equal((await run(router, '/hello')).body, 'hello');
});

for (const [pattern, url, expected] of [
  [/^\/\((a)$/, '/(a', { 0: 'a' }],
  [/^\/[(](a)[)]$/, '/(a)', { 0: 'a' }],
  [/^\/(?<=\/)(a)(?<word>b)(?:c)(d)(?=e)e$/, '/abcde', { 0: 'a', word: 'b', 1: 'd' }],
  [/^\/(?<\u0061>a)(b)$/, '/ab', { a: 'a', 0: 'b' }],
  [/^\/(?<__proto__>a)$/, '/a', JSON.parse('{"__proto__":"a"}')],
  [/^\/(a)?(b)$/, '/b', { 1: 'b' }],
]) test('RegExp capture names: ' + pattern, async () => {
  const router = Router(); router.get(pattern, (req, res) => res.end(plain(req.params)));
  assert.deepEqual((await run(router, url)).body, expected);
});

test('RegExp /v nested character classes do not introduce captures', async () => {
  const router = Router(); router.get(new RegExp('^/[[a-z]--[x]](b)$', 'v'), (req, res) => res.end(plain(req.params)));
  assert.deepEqual((await run(router, '/ab')).body, { 0: 'b' });
});

for (const mode of ['request', 'error', 'param']) {
  test(mode + ': then getter is read once, correct receiver, no dependency helper', async () => {
    const router = Router(); let reads = 0; const error = new Error('rejected');
    const thenable = { get then() {
      reads++;
      if (reads !== 1) throw new Error('second read');
      const then = function (fulfilled, reject) { assert.equal(this, thenable); assert.equal(fulfilled, null); reject(error); };
      then.call = () => assert.fail('own call property');
      return then;
    } };
    const old = process.env.NO_DEPRECATION; process.env.NO_DEPRECATION = 'router';
    try {
      if (mode === 'request') router.use(() => thenable);
      if (mode === 'error') { router.use(() => { throw new Error('first'); }); router.use((err, req, res, next) => thenable); }
      if (mode === 'param') { router.param('id', () => thenable); router.get('/:id', () => assert.fail()); }
      assert.equal((await run(router, '/x')).error, error); assert.equal(reads, 1);
    } finally { if (old === undefined) delete process.env.NO_DEPRECATION; else process.env.NO_DEPRECATION = old; }
  });
  test(mode + ': throwing then getters become routing errors', async () => {
    const router = Router(); const error = new Error('getter'); const fn = () => ({ get then() { throw error; } });
    if (mode === 'request') router.use(fn);
    if (mode === 'error') { router.use(() => { throw new Error('first'); }); router.use((err, req, res, next) => fn()); }
    if (mode === 'param') { router.param('id', fn); router.get('/:id', () => assert.fail()); }
    assert.equal((await run(router, '/x')).error, error);
  });
}

test('invalid handler lists leave router/route registrations unchanged', () => {
  const router = Router(); const good = () => {};
  for (const method of ['use', 'get', 'all']) {
    assert.throws(() => router[method]('/x', good, [good, 42]), /must be a function/);
    assert.equal(router.stack.length, 0);
    assert.throws(() => router[method]('/x', []), /required/);
    assert.equal(router.stack.length, 0);
  }
  const route = router.route('/ok');
  for (const method of ['get', 'all']) {
    assert.throws(() => route[method](good, false), /must be a function/);
    assert.equal(route.stack.length, 0); assert.deepEqual(Object.keys(route.methods), []);
  }
  const badName = new Proxy(good, { get(target, key) { if (key === 'name') throw new Error('name getter'); return target[key]; } });
  assert.throws(() => router.use('/x', good, badName), /name getter/); assert.equal(router.stack.length, 1);
  assert.throws(() => router.get('/x', good, badName), /name getter/); assert.equal(router.stack.length, 1);
  assert.throws(() => route.get(good, badName), /name getter/); assert.equal(route.stack.length, 0);
});

test('cyclic handler arrays fail promptly; deep and repeated arrays preserve order', async () => {
  const router = Router(); const cycle = []; cycle.push(cycle);
  assert.throws(() => router.use(cycle), /cyclic/);
  assert.throws(() => router.get('/', cycle), /cyclic/);
  assert.throws(() => router.route('/').all(cycle), /cyclic/);
  let deep = (req, res, next) => { req.count = (req.count || 0) + 1; next(); };
  for (let i = 0; i < 20000; i++) deep = [deep];
  router.use(deep, deep); router.get('/', (req, res) => res.end(req.count));
  assert.equal((await run(router)).body, 2);
});

test('handler layer match arrays remain independent', () => {
  const route = new Router.Route('/'); route.get(() => {}, () => {});
  assert.notEqual(route.stack[0].matchers, route.stack[1].matchers);
  route.stack[0].matchers.length = 0;
  assert.equal(route.stack[1].match('/'), true);
  const router = Router(); router.use('/:id', () => {}, () => {});
  assert.notEqual(router.stack[0].matchers, router.stack[1].matchers);
  assert.equal(router.stack[0].match('/one'), true);
  assert.equal(router.stack[1].match('/two'), true);
  assert.equal(router.stack[0].params.id, 'one');
  assert.equal(router.stack[1].params.id, 'two');
});

test('concurrent async parameter processing keeps request values separate', async () => {
  const router = Router();
  router.param('id', (req, res, next, id) => setTimeout(() => { req.params.id = id + '!'; next(); }, id === 'a' ? 10 : 1));
  router.get('/:id', (req, res) => res.end(req.params.id));
  assert.deepEqual((await Promise.all([run(router, '/a'), run(router, '/b')])).map(r => r.body), ['a!', 'b!']);
});

test('pathname specialization agrees with parseurl across URL forms', async () => {
  const urls = ['/', '/a?x=1', '/a?x=?b', '//host/a', '/a#fragment', '/a?x=#fragment',
    '/a b', '/a\tb', '/a\nb', '/a\rb', '/a\fb', '/a\u00a0b', '/a\ufeffb', '/a\vb',
    '/a\\b', '/%2f', '/a?x=雪', 'http://example.test/a?b=1', 'https://user:pass@example.test/a',
    'relative', '*', '', undefined, null, 42];
  let state = 12345;
  const chars = 'abc/%? #\\\t\n雪';
  for (let i = 0; i < 300; i++) {
    let value = '/';
    for (let j = 0; j < 12; j++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; value += chars[state % chars.length]; }
    urls.push(value);
  }
  function make(Factory) { const r = Factory(); r.get(/^(.*)$/, (req, res) => res.end(plain(req.params))); return r; }
  const old = make(upstream), current = make(Router);
  for (const url of urls) {
    const a = await run(old, '/', 'GET', { url }), b = await run(current, '/', 'GET', { url });
    assert.deepEqual([b.body, b.fellThrough, b.error?.status], [a.body, a.fellThrough, a.error?.status], String(url));
  }
});

test('pathname cache follows middleware URL rewrites', async () => {
  const router = Router();
  router.use((req, res, next) => { req.url = '/changed?query=1'; next(); });
  router.get('/before', () => assert.fail());
  router.get('/changed', (req, res) => res.end(req.url));
  assert.equal((await run(router, '/before')).body, '/changed?query=1');
});
