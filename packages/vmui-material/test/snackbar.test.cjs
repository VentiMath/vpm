'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {peer} = require('../../../scripts/mui-material-conformance/paths.cjs');
const React = peer('react');
const {renderToStaticMarkup} = peer('react-dom/server');
const {Snackbar, SnackbarContent} = require(require('../../../scripts/mui-material-conformance/prepare.cjs'));
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('the closed clipboard confirmation has no live region', () => {
  assert.equal(render(Snackbar, {open:false, message:'Copied'}), '');
});
test('the open confirmation announces message text and escapes markup', () => {
  const html = render(Snackbar, {open:true, message:'Copied <draft>', action:React.createElement('button', null, 'Undo')});
  assert.equal((html.match(/role="alert"/g) || []).length, 1);
  assert.match(html, /Copied &lt;draft&gt;/);
  assert.match(html, /<button>Undo<\/button>/);
});
test('standalone snackbar content forwards Paper settings and the live region role', () => {
  const html = render(SnackbarContent, {message:'Copied', role:'status', elevation:1, square:true});
  assert.match(html, /role="status"/);
  assert.match(html, /MuiPaper-elevation1\b/);
  assert.doesNotMatch(html, /MuiPaper-rounded/);
});
