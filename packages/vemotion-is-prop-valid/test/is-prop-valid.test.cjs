'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).default;

test('DOM attributes, prefixed attributes and event handlers are forwarded', async () => {
  const isPropValid = await load();
  for (const prop of ['href', 'className', 'children', 'ref', 'tabIndex', 'viewBox', 'strokeWidth', 'xlinkHref', 'data-id', 'DATA-ID', 'aria-label', 'x-custom', 'onClick', 'onPointerDown', 'class', 'for']) assert.equal(isPropValid(prop), true, prop);
  for (const prop of ['as', 'variant', 'color2', 'theme', 'sx', 'onclick', 'datafoo', 'ariaLabel']) assert.equal(isPropValid(prop), false, prop);
});

test('current HTML attributes', async () => {
  // @emotion/is-prop-valid 1.4.0 rejects these, so styled elements drop them.
  const isPropValid = await load();
  for (const prop of ['command', 'commandFor', 'closedBy', 'part', 'exportParts', 'shadowRootMode', 'shadowRootDelegatesFocus', 'shadowRootClonable', 'shadowRootSerializable', 'imageSrcSet', 'imageSizes', 'noModule', 'blocking', 'precedence', 'transformOrigin', 'writingSuggestions', 'elementTiming']) assert.equal(isPropValid(prop), true, prop);
});
