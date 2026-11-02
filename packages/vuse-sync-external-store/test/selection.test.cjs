'use strict';
const test = require('node:test'),
      assert = require('node:assert/strict'),
      {
        selectionReader
      } = require('../selection.cjs');

test('reader retains one snapshot/selection pair and Object.is semantics', () => {
  let calls = 0;

  const read = selectionReader(x => {
    calls++;

    return {
      x
    };
  }, undefined, () => undefined);

  const a = read(NaN);
  assert.equal(read(NaN), a);
  assert.equal(calls, 1);
  assert.notEqual(read(0), read(-0));
});

test('equal selections retain identity and advance snapshot cache', () => {
  let calls = 0;

  const read = selectionReader(x => {
          calls++;

          return {
            n: x.n
          };
        }, (a, b) => a.n === b.n, () => undefined),
        a = {
          n: 1
        },
        b = {
          n: 1
        };

  const value = read(a);
  assert.equal(read(b), value);
  assert.equal(read(b), value);
  assert.equal(calls, 2);
});

test('selector and equality exceptions do not publish incomplete cache entries', () => {
  for (const failing of ['selector', 'equal']) {
    let fail = false;

    const read = selectionReader(x => {
      if (fail && failing === 'selector')
        throw Error('selector');

      return {
        n: x.n
      };
    }, (a, b) => {
      if (fail && failing === 'equal')
        throw Error('equal');

      return a.n === b.n;
    }, () => undefined);

    const a = {
            n: 1
          },
          b = {
            n: 2
          },
          value = read(a);

    fail = true;
    assert.throws(() => read(b));
    assert.equal(read(a), value);
    fail = false;
    assert.equal(read(b).n, 2);
  }
});

test('readers isolate render caches while reusing only committed selections', () => {
  let committed = {
    value: {
      n: 1
    }
  };

  const select = x => ({
          n: x.n
        }),
        eq = (a, b) => a.n === b.n;

  const first = selectionReader(select, eq, () => committed), second = selectionReader(select, eq, () => committed);

  assert.equal(first({
    n: 1
  }), committed.value);

  const pending = second({
    n: 9
  });

  assert.equal(first({
    n: 1
  }), committed.value);

  assert.notEqual(pending, committed.value);
});
