'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Blob } = require('node:buffer');

test('Fetch cache modes, byte bodies and default redirects match runtime behavior', async () => {
  const request = new Request('https://example.test', { cache: 'no-store', method: 'POST', body: 'data' });
  assert.equal(request.cache, 'no-store');
  assert.deepEqual([...await request.bytes()], [...Buffer.from('data')]);
  assert.deepEqual([...await new Response('body').bytes()], [...Buffer.from('body')]);
  assert.equal(Response.redirect('https://example.test').status, 302);
  assert.throws(() => Response.redirect('https://example.test', 200), RangeError);
});

test('FormData permits coercible two-argument values and requires a Blob with a filename', () => {
  for (const method of ['append', 'set']) {
    const form = new FormData();
    form[method]('number', 42);
    assert.equal(form.get('number'), '42');
    form[method]('file', new Blob(['data']), 'file.txt');
    assert.equal(form.get('file').name, 'file.txt');
    assert.throws(() => form[method]('file', 'data', 'file.txt'), TypeError);
    assert.throws(() => form[method]('file', 'data', undefined), TypeError);
  }
});
