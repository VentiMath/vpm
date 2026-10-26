'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const escapeHtml = require('..');
const upstream = require('./fixtures/escape-html-1.0.3.cjs');

test('preserves empty strings and text without the five special characters', () => {
  for (const value of ['', 'plain text', 'a/b?x=1', '`=\\', '\t\r\n\0', 'café 你好 😀']) {
    assert.equal(escapeHtml(value), value);
  }
});

test('uses the exact upstream entity spelling for all five characters', () => {
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(escapeHtml('a & b < c > d "e" \'f\''), 'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;');
});

test('escapes adjacent, leading, trailing, and repeated special characters', () => {
  for (const value of ['<text', 'text>', '<text>', '&&&&', '\'"<> &<>"\'', 'a&b&c&']) {
    assert.equal(escapeHtml(value), upstream(value));
  }
});

test('escapes existing entities again instead of trusting their contents', () => {
  assert.equal(escapeHtml('&amp; &#39; &#x3C; &unknown;'), '&amp;amp; &amp;#39; &amp;#x3C; &amp;unknown;');
  assert.equal(escapeHtml(escapeHtml('<')), '&amp;lt;');
});

test('keeps markup literal inside HTML text and quoted ordinary attributes', () => {
  assert.equal('<p>' + escapeHtml('<img src=x onerror="alert(1)">') + '</p>',
    '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
  assert.equal('<div title="' + escapeHtml('" onmouseover="x') + '"></div>',
    '<div title="&quot; onmouseover=&quot;x"></div>');
  assert.equal("<div title='" + escapeHtml("' onmouseover='x") + "'></div>",
    "<div title='&#39; onmouseover=&#39;x'></div>");
});

test('preserves valid Unicode and unpaired UTF-16 surrogates exactly', () => {
  assert.equal(escapeHtml('\ud800<\ud800\ud800&😀\udc00'), '\ud800&lt;\ud800\ud800&amp;😀\udc00');
});

test('preserves upstream conversion of primitives and missing input', () => {
  for (const value of [undefined, null, true, false, 0, -0, 42, NaN, Infinity, 12n]) {
    assert.equal(escapeHtml(value), upstream(value));
  }
  assert.equal(escapeHtml(), 'undefined');
});

test('preserves default-hint conversion and calls it exactly once', () => {
  const hints = [];
  const value = { [Symbol.toPrimitive](hint) { hints.push(hint); return '<&>'; } };
  assert.equal(escapeHtml(value), '&lt;&amp;&gt;');
  assert.deepEqual(hints, ['default']);
});

test('prefers valueOf to toString for ordinary objects, matching upstream', () => {
  const calls = [];
  const value = {
    valueOf() { calls.push('valueOf'); return '<value>'; },
    toString() { calls.push('toString'); return '<string>'; },
  };
  assert.equal(escapeHtml(value), '&lt;value&gt;');
  assert.deepEqual(calls, ['valueOf']);
  assert.equal(escapeHtml({ valueOf: () => ({}), toString: () => '<string>' }), '&lt;string&gt;');
});

test('supports boxed strings, arrays, Dates, and URL objects like upstream', () => {
  for (const value of [new String('<&>'), ['<', '&', '>'], new Date(0), new URL('https://example.com/?a=1&b=2')]) {
    assert.equal(escapeHtml(value), upstream(value));
  }
});

test('preserves Symbol and unconvertible-object TypeErrors', () => {
  for (const value of [Symbol('x'), Object(Symbol('x')), Object.create(null), { [Symbol.toPrimitive]: () => ({}) }]) {
    assert.throws(() => upstream(value), TypeError);
    assert.throws(() => escapeHtml(value), TypeError);
  }
});

test('propagates custom conversion errors and leaves later calls usable', () => {
  const error = new Error('conversion failed');
  assert.throws(() => escapeHtml({ valueOf() { throw error; } }), caught => caught === error);
  assert.equal(escapeHtml('<after>'), '&lt;after&gt;');
});

test('allows reentrant escaping during input conversion', () => {
  const value = { [Symbol.toPrimitive]() {
    assert.equal(escapeHtml('<nested>'), '&lt;nested&gt;');
    return 'x'.repeat(100) + '&outer';
  } };
  assert.equal(escapeHtml(value), 'x'.repeat(100) + '&amp;outer');
});

// Deliberately independent of the production scanner: transform each UTF-16
// code unit through a literal table, including malformed surrogate sequences.
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function reference(value) {
  return value.split('').map(character => entities[character] || character).join('');
}

test('matches upstream and an independent reference for every UTF-16 code unit', () => {
  for (let code = 0; code <= 0xffff; code++) {
    const input = 'before&' + String.fromCharCode(code) + '<after';
    const result = escapeHtml(input);
    assert.equal(result, reference(input), 'U+' + code.toString(16));
    assert.equal(result, upstream(input), 'U+' + code.toString(16));
  }
});

test('matches all short combinations of entities, plain text, and surrogates', () => {
  const alphabet = ['&', '<', '>', '"', "'", 'a', '\ud800'];
  function visit(input, remaining) {
    assert.equal(escapeHtml(input), reference(input), JSON.stringify(input));
    if (remaining) for (const character of alphabet) visit(input + character, remaining - 1);
  }
  visit('', 4);
});

test('preserves every gap and suffix length across scanner boundaries', () => {
  for (const gap of [0, 1, 2, 15, 16, 17, 18, 31, 32, 33, 127, 128, 129, 4096]) {
    for (const character of Object.keys(entities)) {
      for (const suffix of ['', 'tail', '&', 'z'.repeat(gap), 'z'.repeat(gap) + '<']) {
        const input = character + 'a'.repeat(gap) + character + suffix;
        assert.equal(escapeHtml(input), reference(input), JSON.stringify({ gap, character, suffix }));
      }
    }
  }
});

test('matches upstream on generated strings with varied lengths and escape density', () => {
  let seed = 0x71ab93cd;
  function random(max) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % max; }
  const special = '&<>"\'';
  for (let i = 0; i < 2000; i++) {
    const length = random(2048);
    let input = '';
    for (let j = 0; j < length; j++) {
      input += random(i % 3 === 0 ? 2 : 32) === 0 ? special[random(5)] : String.fromCharCode(random(65536));
    }
    const actual = escapeHtml(input);
    assert.equal(actual, reference(input), 'generated case ' + i);
    assert.equal(actual, upstream(input), 'generated case ' + i);
  }
});

test('handles long sparse and dense inputs without leaking scanner state', () => {
  for (const input of ['<' + 'text'.repeat(25000), '&<>"\''.repeat(20000), 'text'.repeat(25000) + '>']) {
    assert.equal(escapeHtml(input), reference(input));
    assert.equal(escapeHtml('plain'), 'plain');
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml(''), '');
  }
});
