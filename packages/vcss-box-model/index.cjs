'use strict';
const invariant = require('vtiny-invariant');

// Build rectangles directly from edges. No intermediate spacing objects are
// needed for each derived box. Preserve signed dimensions and fractional edges.
function rect(top, right, bottom, left) {
  return {top, right, bottom, left, width: right-left, height: bottom-top,
    x: left, y: top, center: {x: (left+right)/2, y: (top+bottom)/2}};
}
const zero = () => ({top: 0, right: 0, bottom: 0, left: 0});
function getRect(edges) { return rect(edges.top, edges.right, edges.bottom, edges.left); }
function expand(a, b) { return {top: a.top-b.top, right: a.right+b.right, bottom: a.bottom+b.bottom, left: a.left-b.left}; }
function shrink(a, b) { return {top: a.top+b.top, right: a.right-b.right, bottom: a.bottom-b.bottom, left: a.left+b.left}; }
function createBox({borderBox: edges, margin=zero(), border=zero(), padding=zero()}) {
  const {top, right, bottom, left} = edges;
  const pt=top+border.top, pr=right-border.right, pb=bottom-border.bottom, pl=left+border.left;
  return {
    marginBox: rect(top-margin.top, right+margin.right, bottom+margin.bottom, left-margin.left),
    borderBox: rect(top, right, bottom, left),
    paddingBox: rect(pt, pr, pb, pl),
    contentBox: rect(pt+padding.top, pr-padding.right, pb-padding.bottom, pl+padding.left),
    margin, border, padding,
  };
}
function offset(box, change) {
  const r=box.borderBox;
  return createBox({borderBox: {top:r.top+change.y, right:r.right+change.x,
    bottom:r.bottom+change.y, left:r.left+change.x}, margin:box.margin, border:box.border, padding:box.padding});
}
function withScroll(box, scroll={x:window.pageXOffset, y:window.pageYOffset}) { return offset(box, scroll); }
function invalidPixels(raw, body) {
  invariant(false, () => `Could not parse value [raw: ${raw}, without suffix: ${body}]`);
}
function pixels(raw) {
  if (raw.slice(-2) !== 'px') return 0;
  const body=raw.slice(0,-2), value=Number(body);
  if (Number.isNaN(value)) invalidPixels(raw, body);
  return value;
}
function calculateBox(edges, styles) {
  const margin={top:pixels(styles.marginTop), right:pixels(styles.marginRight), bottom:pixels(styles.marginBottom), left:pixels(styles.marginLeft)};
  const padding={top:pixels(styles.paddingTop), right:pixels(styles.paddingRight), bottom:pixels(styles.paddingBottom), left:pixels(styles.paddingLeft)};
  const border={top:pixels(styles.borderTopWidth), right:pixels(styles.borderRightWidth), bottom:pixels(styles.borderBottomWidth), left:pixels(styles.borderLeftWidth)};
  return createBox({borderBox:edges,margin,padding,border});
}
function getBox(element) {
  const edges=element.getBoundingClientRect();
  // An iframe element's styles belong to its own document's window.
  const view=element.ownerDocument?.defaultView ?? window;
  return calculateBox(edges, view.getComputedStyle(element));
}
module.exports={getRect, expand, shrink, createBox, offset, withScroll, calculateBox, getBox};
