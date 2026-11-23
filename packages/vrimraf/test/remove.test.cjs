'use strict';
const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const api = require('..'),
  { rimraf, rimrafSync } = api;
function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrimraf-test-')));
  for (const p of ['out/a.js', 'out/nested/b.tmp', 'out/keep.txt', 'outside/sentinel']) {
    fs.mkdirSync(path.dirname(root + '/' + p), { recursive: true });
    fs.writeFileSync(root + '/' + p, 'keep');
  }
  return root;
}
function withFixture(fn) {
  return async () => {
    const root = fixture();
    try {
      await fn(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
test(
  'aliases, absent paths and literal metacharacters; plain deletion does not load glob',
  withFixture(async (root) => {
    assert.equal(api.sync, rimrafSync);
    assert.equal(rimraf.sync, rimrafSync);
    assert.equal(rimraf.rimraf, rimraf);
    fs.writeFileSync(root + '/file*', '');
    fs.writeFileSync(root + '/fileA', '');
    const Module = require('node:module'),
      load = Module._load;
    Module._load = function (name, ...args) {
      if (name === 'vglob') throw Error('Glob loaded for literal cleanup');
      return load.call(this, name, ...args);
    };
    try {
      assert.equal(rimrafSync(root + '/file*'), true);
      assert.equal(await rimraf(root + '/absent'), true);
    } finally {
      Module._load = load;
    }
    assert(fs.existsSync(root + '/fileA'));
  }),
);
test(
  'the complete batch is checked before any deletion, and root protection cannot be disabled',
  withFixture(async (root) => {
    const sync = fs.rmSync,
      asyncRm = fs.promises.rm;
    let calls = 0;
    fs.rmSync = () => {
      calls++;
      throw Error('Unsafe mutation');
    };
    fs.promises.rm = async () => {
      calls++;
      throw Error('Unsafe mutation');
    };
    try {
      for (const bad of [null, undefined, 12, '', 'x\0y', path.parse(root).root]) {
        assert.throws(() => rimrafSync([root + '/out', bad]));
        await assert.rejects(rimraf([root + '/out', bad]));
      }
      assert.throws(() => rimrafSync(path.parse(root).root, { preserveRoot: false }), {
        code: 'ERR_PRESERVE_ROOT',
      });
      assert.equal(calls, 0);
    } finally {
      fs.rmSync = sync;
      fs.promises.rm = asyncRm;
    }
    assert(fs.existsSync(root + '/out/a.js'));
  }),
);
test(
  'overlapping targets produce only one native removal per subtree',
  withFixture(async (root) => {
    const original = fs.promises.rm,
      calls = [];
    fs.promises.rm = async (p, o) => {
      calls.push(p);
      return original.call(fs.promises, p, o);
    };
    try {
      assert(
        await rimraf([
          root + '/out/nested/b.tmp',
          root + '/out',
          root + '/out/nested',
          root + '/out',
        ]),
      );
    } finally {
      fs.promises.rm = original;
    }
    assert.deepEqual(calls, [root + '/out']);
    assert(!fs.existsSync(root + '/out'));
    assert(fs.existsSync(root + '/outside/sentinel'));
  }),
);
test(
  'terminal symlinks, including trailing separators and broken links, never delete their targets',
  withFixture(async (root) => {
    fs.symlinkSync('outside', root + '/link');
    fs.symlinkSync('missing', root + '/broken');
    assert(rimrafSync(root + '/link/'));
    assert(await rimraf(root + '/broken'));
    assert.equal(fs.readFileSync(root + '/outside/sentinel', 'utf8'), 'keep');
  }),
);
test(
  'glob matching is opt-in, anchored to its cwd, and collapses overlapping expansion',
  withFixture(async (root) => {
    assert(await rimraf(['out/**', 'not-present-*'], { glob: { cwd: root, dot: true } }));
    assert(!fs.existsSync(root + '/out'));
    assert(fs.existsSync(root + '/outside/sentinel'));
  }),
);
test(
  'filters keep rejected children and parents, while rejected directories still allow child cleanup',
  withFixture(async (root) => {
    const visited = [];
    assert.equal(
      await rimraf(root + '/out', {
        filter: async (p, e) => {
          visited.push([path.relative(root, p), e.isDirectory()]);
          return !p.endsWith('keep.txt');
        },
      }),
      false,
    );
    assert(fs.existsSync(root + '/out/keep.txt'));
    assert(!fs.existsSync(root + '/out/a.js'));
    assert(!fs.existsSync(root + '/out/nested'));
    assert.equal(visited.at(-1)[0], 'out');
    assert.equal(rimrafSync(root + '/out', { filter: (p, e) => !e.isDirectory() }), false);
    assert.deepEqual(fs.readdirSync(root + '/out'), []);
  }),
);
test(
  'falsey synchronous filter values retain files; promise filters are rejected',
  withFixture(async (root) => {
    for (const value of [false, null, undefined, 0, '']) {
      assert.equal(rimrafSync(root + '/out/a.js', { filter: () => value }), false);
      assert(fs.existsSync(root + '/out/a.js'));
    }
    assert.throws(
      () => rimrafSync(root + '/out/a.js', { filter: async () => false }),
      /cannot return promises/,
    );
    assert(fs.existsSync(root + '/out/a.js'));
  }),
);
test(
  'abort reasons survive and cancellation between child operations stops cleanup',
  withFixture(async (root) => {
    const c = new AbortController(),
      reason = new Error('stop');
    c.abort(reason);
    assert.throws(
      () => rimrafSync(root + '/out', { signal: c.signal }),
      (e) => e === reason,
    );
    await assert.rejects(rimraf(root + '/out', { signal: c.signal }), (e) => e === reason);
    const mid = new AbortController();
    let seen = 0;
    await assert.rejects(
      rimraf(root + '/out', {
        signal: mid.signal,
        filter: () => {
          seen++;
          mid.abort(reason);
          return true;
        },
      }),
      (e) => e === reason,
    );
    assert.equal(seen, 1);
    assert(fs.existsSync(root + '/out/a.js'));
  }),
);
test(
  'target replacement inside a filter fails without traversing an outside symlink',
  withFixture(async (root) => {
    await assert.rejects(
      rimraf(root + '/out', {
        filter: (p) => {
          if (p.endsWith('a.js')) {
            fs.renameSync(root + '/out', root + '/moved');
            fs.symlinkSync('outside', root + '/out');
          }
          return true;
        },
      }),
      { code: 'ESTALE' },
    );
    assert.equal(fs.readFileSync(root + '/outside/sentinel', 'utf8'), 'keep');
  }),
);
test(
  'native retry options reach the runtime; manual retries honor cancellation during delay',
  withFixture(async (root) => {
    const rm = fs.rmSync;
    let got;
    fs.rmSync = (p, o) => {
      got = o;
    };
    try {
      rimrafSync(root + '/out', { maxRetries: 2, retryDelay: 7 });
      assert.deepEqual(got, { force: true, recursive: true, maxRetries: 2, retryDelay: 7 });
    } finally {
      fs.rmSync = rm;
    }
    const unlink = fs.promises.unlink,
      c = new AbortController(),
      reason = new Error('cancel retry');
    fs.promises.unlink = async () => {
      c.abort(reason);
      throw Object.assign(new Error('busy'), { code: 'EBUSY' });
    };
    try {
      await assert.rejects(
        rimraf(root + '/out/a.js', { signal: c.signal, maxRetries: 3, retryDelay: 10000 }),
        (e) => e === reason,
      );
    } finally {
      fs.promises.unlink = unlink;
    }
    assert(fs.existsSync(root + '/out/a.js'));
  }),
);
test('strict option validation rejects invalid retry counts and unsupported strategies', () => {
  for (const value of [
    null,
    [],
    { maxRetries: NaN },
    { maxRetries: -1 },
    { retryDelay: 1.2 },
    { glob: [] },
    { filter: true },
    { signal: {} },
    { tmp: '/tmp' },
    { backoff: 1.2 },
  ]) {
    assert.equal(api.isRimrafOptions(value), false);
    assert.throws(() => api.assertRimrafOptions(value));
  }
  assert(api.isRimrafOptions({ glob: { dot: true }, maxRetries: 1 }));
});

test('an explicit null abort reason is preserved', async () => {
  const controller = new AbortController();
  controller.abort(null);
  await assert.rejects(rimraf('unused', {signal:controller.signal}), reason => reason === null);
  assert.throws(() => rimrafSync('unused', {signal:controller.signal}), reason => reason === null);
});
