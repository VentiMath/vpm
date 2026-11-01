'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), {pathToFileURL} = require('node:url');

// A minimal document: elements with children, attributes, text and a
// CSSStyleSheet that records insertRule calls.
class FakeNode {
  constructor(document, name) { this.ownerDocument = document; this.nodeName = name; this.childNodes = []; this.parentNode = null; this.attributes = {}; }
  get firstChild() { return this.childNodes[0] ?? null; }
  get nextSibling() { const siblings = this.parentNode?.childNodes ?? []; return siblings[siblings.indexOf(this) + 1] ?? null; }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, before) {
    node.parentNode?.removeChild(node);
    const index = before ? this.childNodes.indexOf(before) : this.childNodes.length;
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node; }
  get textContent() { return this.childNodes.map(node => node.data ?? node.textContent).join(''); }
}
function fakeDocument() {
  const document = {styleSheets: []};
  document.createElement = name => {
    const element = new FakeNode(document, name);
    if (name === 'style') element.sheet = {cssRules: [], insertRule(rule, index) { if (rule.includes('invalid')) throw new SyntaxError('bad'); this.cssRules.splice(index, 0, rule); }};
    return element;
  };
  document.createTextNode = data => Object.assign(new FakeNode(document, '#text'), {data});
  document.head = document.createElement('head');
  return document;
}
const load = condition => import(pathToFileURL(path.join(__dirname, '../index.js')).href + (condition ? '?' + condition : ''));

test('production: insertRule into one element, with nonce and key', async () => {
  const {StyleSheet} = await load();
  const document = fakeDocument();
  const sheet = new StyleSheet({key: 'css', container: document.head, nonce: 'abc'});
  assert.equal(sheet.isSpeedy, true);
  sheet.insert('.a{color:red;}');
  sheet.insert('.b{color:blue;}');
  sheet.insert('.c{invalid}'); // rejected by the browser, ignored
  assert.equal(sheet.tags.length, 1);
  const [tag] = sheet.tags;
  assert.deepEqual(tag.attributes, {'data-emotion': 'css', nonce: 'abc', 'data-s': ''});
  assert.deepEqual(tag.sheet.cssRules, ['.a{color:red;}', '.b{color:blue;}']);
  assert.equal(sheet.ctr, 3);
  sheet.flush();
  assert.deepEqual([sheet.tags.length, sheet.ctr, document.head.childNodes.length], [0, 0, 0]);
});

test('text nodes when not speedy; element placement', async () => {
  const {StyleSheet} = await load();
  const document = fakeDocument();
  const head = document.head;
  const first = head.appendChild(document.createElement('meta')), last = head.appendChild(document.createElement('link'));
  const appended = new StyleSheet({key: 'a', container: head, speedy: false});
  appended.insert('.a{}');
  appended.insert('.b{}');
  assert.deepEqual(head.childNodes.map(node => node.nodeName), ['meta', 'link', 'style', 'style']);
  assert.equal(appended.tags.map(tag => tag.textContent).join(''), '.a{}.b{}');
  const prepended = new StyleSheet({key: 'b', container: head, speedy: false, prepend: true});
  prepended.insert('.c{}');
  assert.equal(head.firstChild, prepended.tags[0]);
  const afterPoint = new StyleSheet({key: 'c', container: head, speedy: false, insertionPoint: first});
  afterPoint.insert('.d{}');
  afterPoint.insert('.e{}');
  assert.deepEqual(head.childNodes.slice(1, 4), [first, ...afterPoint.tags]);
  const before = new StyleSheet({key: 'd', container: head, speedy: false});
  before.before = last;
  before.insert('.f{}');
  assert.equal(before.tags[0].nextSibling, last);
});

test('hydrate adopts existing elements; subclasses can override insert', async () => {
  const {StyleSheet} = await load();
  const document = fakeDocument();
  const rendered = document.createElement('style');
  class Recording extends StyleSheet { insert(rule) { this.last = rule; return super.insert(rule); } }
  const sheet = new Recording({key: 'css', container: document.head, speedy: false});
  sheet.hydrate([rendered]);
  assert.deepEqual(sheet.tags, [rendered]);
  assert.equal(document.head.firstChild, rendered);
  sheet.insert('.a{}');
  assert.equal(sheet.last, '.a{}');
});

test('elements are created by the container\'s document', async () => {
  const {StyleSheet} = await load();
  const frame = fakeDocument();
  const sheet = new StyleSheet({key: 'css', container: frame.head, speedy: false});
  sheet.insert('.a{}');
  assert.equal(sheet.tags[0].ownerDocument, frame);
});
