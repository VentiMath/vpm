// Independent DOM traversal; realm checks and ancestor ordering match 0.2.12.
export const getWindow = node => node?.ownerDocument?.defaultView || window;
function inRealm(value, name) {
  if (typeof window === 'undefined') return false;
  const local = globalThis[name], owner = getWindow(value)[name];
  return (typeof local === 'function' && value instanceof local) || (typeof owner === 'function' && value instanceof owner);
}
export const isNode = value => inRealm(value, 'Node');
export const isElement = value => inRealm(value, 'Element');
export const isHTMLElement = value => inRealm(value, 'HTMLElement');
export const isShadowRoot = value => inRealm(value, 'ShadowRoot');
export const getNodeName = node => isNode(node) ? (node.nodeName || '').toLowerCase() : '#document';
export function getDocumentElement(node) {
  const document = (isNode(node) ? node.ownerDocument : node.document) || window.document;
  return document?.documentElement;
}
export const getComputedStyle = element => getWindow(element).getComputedStyle(element);
export function isOverflowElement(element) {
  const css = getComputedStyle(element);
  return css.display !== 'inline' && css.display !== 'contents' && /auto|scroll|overlay|hidden|clip/.test(css.overflow + css.overflowY + css.overflowX);
}
export const isTableElement = element => /^(table|td|th)$/.test(getNodeName(element));
export const isLastTraversableNode = node => /^(html|body|#document)$/.test(getNodeName(node));
export function isTopLayer(element) {
  for (const selector of [':popover-open', ':modal']) {
    try { if (element.matches(selector)) return true; } catch { /* Unsupported selector. */ }
  }
  return false;
}
let webKit;
export function isWebKit() {
  return webKit ??= !!(globalThis.CSS?.supports?.('-webkit-backdrop-filter', 'none'));
}
export function isContainingBlock(value) {
  const css = isElement(value) ? getComputedStyle(value) : value;
  for (const key of ['transform', 'translate', 'scale', 'rotate', 'perspective']) {
    if (css[key] && css[key] !== 'none') return true;
  }
  if (!isWebKit() && ((css.filter && css.filter !== 'none') || (css.backdropFilter && css.backdropFilter !== 'none'))) return true;
  return /transform|translate|scale|rotate|perspective|filter/.test(css.willChange || '') || /paint|layout|strict|content/.test(css.contain || '');
}
export function getParentNode(node) {
  if (getNodeName(node) === 'html') return node;
  const parent = node.assignedSlot || node.parentNode || (isShadowRoot(node) ? node.host : getDocumentElement(node));
  return isShadowRoot(parent) ? parent.host : parent;
}
export function getContainingBlock(element) {
  for (let parent = getParentNode(element); isHTMLElement(parent) && !isLastTraversableNode(parent); parent = getParentNode(parent)) {
    if (isContainingBlock(parent)) return parent;
    if (isTopLayer(parent)) return null;
  }
  return null;
}
export function getNodeScroll(node) {
  return isElement(node) ? {scrollLeft: node.scrollLeft, scrollTop: node.scrollTop} : {scrollLeft: node.scrollX, scrollTop: node.scrollY};
}
export function getNearestOverflowAncestor(node) {
  for (;;) {
    const parent = getParentNode(node);
    if (isLastTraversableNode(parent)) return (node.ownerDocument || node).body;
    if (isHTMLElement(parent) && isOverflowElement(parent)) return parent;
    node = parent;
  }
}
export const getFrameElement = win => win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
export function getOverflowAncestors(node, list = [], traverseIframes = true) {
  const result = list.slice();
  for (;;) {
    const ancestor = getNearestOverflowAncestor(node);
    if (ancestor !== node.ownerDocument?.body) {
      result.push(ancestor);
      node = ancestor;
      continue;
    }
    const win = getWindow(ancestor);
    result.push(win);
    if (win.visualViewport) result.push(win.visualViewport);
    if (isOverflowElement(ancestor)) result.push(ancestor);
    const frame = getFrameElement(win);
    if (!traverseIframes || !frame) return result;
    node = frame;
  }
}
