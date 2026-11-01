// Source-informed browser coordinate contracts; independently implemented.
import * as dom from 'vfloating-ui-utils/dom';
import {rectToClientRect} from 'vfloating-ui-core';

export const elementOf = value => dom.isElement(value) ? value : value.contextElement;
const zero = () => ({x: 0, y: 0});
export function dimensions(element) {
  const css = dom.getComputedStyle(element);
  const width = parseFloat(css.width) || 0, height = parseFloat(css.height) || 0;
  const fallback = dom.isHTMLElement(element) &&
    (Math.round(width) !== element.offsetWidth || Math.round(height) !== element.offsetHeight);
  return {width: fallback ? element.offsetWidth : width, height: fallback ? element.offsetHeight : height, fallback};
}
export function getScale(value) {
  const element = elementOf(value);
  if (!dom.isHTMLElement(element)) return {x: 1, y: 1};
  const size = dimensions(element), box = element.getBoundingClientRect();
  const ratio = (n, d) => { const value = (size.fallback ? Math.round(n) : n) / d; return value && Number.isFinite(value) ? value : 1; };
  return {x: ratio(box.width, size.width), y: ratio(box.height, size.height)};
}
export function visualOffset(element) {
  const viewport = dom.getWindow(element).visualViewport;
  return dom.isWebKit() && viewport ? {x: viewport.offsetLeft, y: viewport.offsetTop} : zero();
}
export function measuredRect(value, scaled = false, fixed = false, parent) {
  const box = value.getBoundingClientRect(), element = elementOf(value);
  const scale = scaled && (!parent || dom.isElement(parent)) ? getScale(parent || value) : {x: 1, y: 1};
  const visual = fixed && parent && parent === dom.getWindow(element) ? visualOffset(element) : zero();
  let x = (box.left + visual.x) / scale.x, y = (box.top + visual.y) / scale.y;
  let width = box.width / scale.x, height = box.height / scale.y;
  if (element && parent) {
    const target = dom.isElement(parent) ? dom.getWindow(parent) : parent;
    for (let win = dom.getWindow(element); win !== target;) {
      const frame = dom.getFrameElement(win);
      if (!frame) break;
      const fs = getScale(frame), fb = frame.getBoundingClientRect(), css = dom.getComputedStyle(frame);
      x = x * fs.x + fb.left + (frame.clientLeft + parseFloat(css.paddingLeft)) * fs.x;
      y = y * fs.y + fb.top + (frame.clientTop + parseFloat(css.paddingTop)) * fs.y;
      width *= fs.x; height *= fs.y;
      win = dom.getWindow(frame);
    }
  }
  return rectToClientRect({x, y, width, height});
}
export const scrollbarX = element => dom.getDocumentElement(element).getBoundingClientRect().left + dom.getNodeScroll(element).scrollLeft;
const htmlOffset = (html, scroll) => ({x: 0, y: html.getBoundingClientRect().top + scroll.scrollTop});

// One coordinate frame supplies both directions of the offset-parent transform.
function frame(parent, fixed, normalized) {
  const html = dom.getDocumentElement(parent), element = dom.isHTMLElement(parent);
  let scroll = {scrollLeft: 0, scrollTop: 0}, offset = zero(), scale = {x: 1, y: 1};
  if (element || !fixed) {
    if (dom.getNodeName(parent) !== 'body' || dom.isOverflowElement(html)) scroll = dom.getNodeScroll(parent);
    if (element) {
      const rect = measuredRect(parent, normalized, fixed, normalized ? parent : undefined);
      offset = {x: rect.x + parent.clientLeft, y: rect.y + parent.clientTop};
      if (!normalized) scale = getScale(parent);
    }
  }
  const documentOffset = !element && !fixed ? htmlOffset(html, scroll) : zero();
  if (normalized && !element) offset.x = scrollbarX(html);
  return {scroll, offset, scale, documentOffset};
}
export function relativeRect(reference, parent, strategy) {
  const fixed = strategy === 'fixed', rect = measuredRect(reference, true, fixed, parent);
  const f = frame(parent, fixed, true);
  return {x: rect.x + f.scroll.scrollLeft - f.offset.x - f.documentOffset.x,
    y: rect.y + f.scroll.scrollTop - f.offset.y - f.documentOffset.y, width: rect.width, height: rect.height};
}
export function toViewport({elements, rect, offsetParent: parent, strategy}) {
  const fixed = strategy === 'fixed';
  if (parent === dom.getDocumentElement(parent) || fixed && elements && dom.isTopLayer(elements.floating)) return rect;
  const f = frame(parent, fixed, false);
  return {x: (rect.x - f.scroll.scrollLeft) * f.scale.x + f.offset.x + f.documentOffset.x,
    y: (rect.y - f.scroll.scrollTop) * f.scale.y + f.offset.y + f.documentOffset.y,
    width: rect.width * f.scale.x, height: rect.height * f.scale.y};
}
export function getOffsetParent(element, polyfill) {
  const win = dom.getWindow(element);
  if (dom.isTopLayer(element)) return win;
  if (!dom.isHTMLElement(element)) {
    for (let p = dom.getParentNode(element); p && !dom.isLastTraversableNode(p); p = dom.getParentNode(p)) {
      if (dom.isElement(p) && dom.getComputedStyle(p).position !== 'static') return p;
    }
    return win;
  }
  const actual = node => {
    if (dom.getComputedStyle(node).position === 'fixed') return null;
    if (polyfill) return polyfill(node);
    const parent = node.offsetParent;
    return parent === dom.getDocumentElement(node) ? parent.ownerDocument.body : parent;
  };
  let parent = actual(element);
  while (parent && dom.isTableElement(parent) && dom.getComputedStyle(parent).position === 'static') parent = actual(parent);
  if (parent && dom.isLastTraversableNode(parent) && dom.getComputedStyle(parent).position === 'static' && !dom.isContainingBlock(parent)) return win;
  return parent || dom.getContainingBlock(element) || win;
}

function viewportRect(element, strategy, layout) {
  const win = dom.getWindow(element), html = dom.getDocumentElement(element), visual = win.visualViewport;
  let width = html.clientWidth, height = html.clientHeight, x = 0, y = 0;
  if (visual) {
    const layoutCoords = !dom.isWebKit() || strategy === 'fixed';
    if (layout) { if (!layoutCoords) { x = -visual.offsetLeft; y = -visual.offsetTop; } }
    else { width = visual.width; height = visual.height; if (layoutCoords) { x = visual.offsetLeft; y = visual.offsetTop; } }
  }
  if (scrollbarX(html) <= 0) {
    const body = html.ownerDocument.body, css = dom.getComputedStyle(body);
    const margins = html.ownerDocument.compatMode === 'CSS1Compat' ? parseFloat(css.marginLeft) + parseFloat(css.marginRight) || 0 : 0;
    const reserved = Math.abs(html.clientWidth - body.clientWidth - margins);
    const gutter = dom.getComputedStyle(html).scrollbarGutter === 'stable both-edges' ? reserved / 2 : reserved;
    if (gutter <= 25) width -= gutter;
  }
  return {x, y, width, height};
}
function boundaryRect(element, boundary, strategy) {
  if (boundary === 'viewport' || boundary === 'layoutViewport') return viewportRect(element, strategy, boundary === 'layoutViewport');
  if (boundary === 'document') {
    const html = dom.getDocumentElement(element), body = html.ownerDocument.body, scroll = dom.getNodeScroll(html);
    const width = Math.max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
    const height = Math.max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
    const rtl = dom.getComputedStyle(body).direction === 'rtl' ? Math.max(html.clientWidth, body.clientWidth) - width : 0;
    return {x: -scroll.scrollLeft + scrollbarX(html) + rtl, y: -scroll.scrollTop, width, height};
  }
  if (dom.isElement(boundary)) {
    const rect = measuredRect(boundary, true, strategy === 'fixed'), scale = getScale(boundary);
    return {x: (rect.x + boundary.clientLeft) * scale.x, y: (rect.y + boundary.clientTop) * scale.y,
      width: boundary.clientWidth * scale.x, height: boundary.clientHeight * scale.y};
  }
  const visual = visualOffset(element);
  return {x: boundary.x - visual.x, y: boundary.y - visual.y, width: boundary.width, height: boundary.height};
}
function clippingAncestors(element, cache) {
  if (cache?.has(element)) return cache.get(element);
  const candidates = new Set(dom.getOverflowAncestors(element, [], false).filter(p => dom.isElement(p) && dom.getNodeName(p) !== 'body'));
  const fixed = dom.getComputedStyle(element).position === 'fixed';
  let position = fixed ? 'fixed' : '';
  for (let node = fixed ? dom.getParentNode(element) : element; dom.isElement(node) && !dom.isLastTraversableNode(node); node = dom.getParentNode(node)) {
    const css = dom.getComputedStyle(node);
    if (!dom.isContainingBlock(css) && (position === 'fixed' || position === 'absolute' && css.position === 'static')) candidates.delete(node);
    else position = css.position;
  }
  const result = [...candidates]; cache?.set(element, result); return result;
}
export function getClippingRect({element, boundary, rootBoundary, strategy}) {
  const boundaries = boundary === 'clippingAncestors' ? dom.isTopLayer(element) ? [] : clippingAncestors(element, this?._c) : Array.isArray(boundary) ? boundary : [boundary];
  let result = rectToClientRect(boundaryRect(element, rootBoundary, strategy));
  for (const boundary of boundaries) {
    const b = rectToClientRect(boundaryRect(element, boundary, strategy));
    result = {top: Math.max(result.top, b.top), left: Math.max(result.left, b.left), right: Math.min(result.right, b.right), bottom: Math.min(result.bottom, b.bottom)};
  }
  return {x: result.left, y: result.top, width: result.right - result.left, height: result.bottom - result.top};
}
export const platform = {
  getScale, getOffsetParent, getClippingRect,
  getDocumentElement: dom.getDocumentElement, isElement: dom.isElement,
  isRTL: element => dom.getComputedStyle(element).direction === 'rtl',
  getClientRects: element => element.getClientRects ? Array.from(element.getClientRects()) : [],
  getDimensions(element) { const {width, height} = dimensions(element); return {width, height}; },
  convertOffsetParentRelativeRectToViewportRelativeRect: toViewport,
  async getElementRects({reference, floating, strategy}) {
    const {getDimensions, getOffsetParent: parent = getOffsetParent} = this;
    const size = await getDimensions(floating);
    return {reference: relativeRect(reference, await parent(floating), strategy), floating: {x: 0, y: 0, width: size.width, height: size.height}};
  },
};
