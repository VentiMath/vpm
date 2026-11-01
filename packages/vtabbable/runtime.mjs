// DOM focus eligibility and ordering. No browser globals are captured at import.
const candidates = 'input,select,textarea,button,a[href],area[href],[tabindex]:not(slot),audio[controls],video[controls],[contenteditable]:not([contenteditable="false"]),details,details>summary:first-of-type';
const ownIndex = node => !Number.isNaN(Number.parseInt(node.getAttribute('tabindex'), 10));
const parent = node => node.assignedSlot || node.parentNode || node.host || null;

export function getTabIndex(node) {
  if (!node) throw new Error('No node provided');
  const value = node.tabIndex;
  if (value >= 0 || ownIndex(node)) return value;
  const editable = node.getAttribute('contenteditable')?.toLowerCase();
  return ['AUDIO', 'VIDEO', 'DETAILS'].includes(node.tagName) || editable === '' || editable === 'true' || editable === 'plaintext-only' ? 0 : value;
}

function inert(node) {
  for (let current = node; current; current = parent(current)) if (current.hasAttribute?.('inert')) return true;
  return false;
}
function disabledField(node) {
  if (!['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(node.tagName)) return false;
  for (let field = node.parentElement; field; field = field.parentElement) {
    if (field.tagName !== 'FIELDSET' || !field.disabled) continue;
    const legend = Array.from(field.children).find(child => child.tagName === 'LEGEND');
    if (!legend?.contains(node)) return true;
  }
  return false;
}
function zeroArea(node) {
  const rect = node.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0;
}
function visible(node, options) {
  const mode = options.displayCheck;
  if (mode === 'full-native' && typeof node.checkVisibility === 'function') {
    return node.checkVisibility({checkOpacity: false, opacityProperty: false, contentVisibilityAuto: true, visibilityProperty: true, checkVisibilityCSS: true});
  }
  const visibility = node.ownerDocument.defaultView.getComputedStyle(node).visibility;
  if (visibility === 'hidden' || visibility === 'collapse') return false;
  const summary = node.matches('details>summary:first-of-type');
  if ((summary ? node.parentElement : node).matches('details:not([open]) *')) return false;
  if (mode === 'non-zero-area') return !zeroArea(node);
  if (mode && !['full', 'full-native', 'legacy-full'].includes(mode)) return true;
  if (typeof options.getShadowRoot === 'function') {
    for (let current = node; current; current = parent(current)) {
      const ancestor = current.parentElement;
      if (ancestor && !ancestor.shadowRoot && options.getShadowRoot(ancestor) === true) return !zeroArea(current);
    }
  }
  return node.isConnected ? node.getClientRects().length > 0 : mode === 'legacy-full';
}
function radioAllowed(node, cache) {
  if (node.tagName !== 'INPUT' || node.type !== 'radio' || !node.name) return true;
  const root = node.getRootNode();
  let groups = cache.get(root);
  if (!groups) {
    groups = new Map(); cache.set(root, groups);
    // Match names as data, not CSS source. Form-associated radios can live
    // outside their form; grouping starts at the containing document/shadow root.
    for (const radio of root.querySelectorAll('input[type="radio"]')) {
      if (!radio.checked) continue;
      let names = groups.get(radio.form);
      if (!names) groups.set(radio.form, names = new Map());
      if (!names.has(radio.name)) names.set(radio.name, radio);
    }
  }
  const selected = groups.get(node.form)?.get(node.name);
  return !selected || selected === node;
}
function eligible(node, options, tab, radioCache) {
  if (node.disabled || node.tagName === 'INPUT' && node.type === 'hidden' || inert(node)) return false;
  if (node.tagName === 'DETAILS' && Array.from(node.children).some(child => child.tagName === 'SUMMARY')) return false;
  if (tab && (getTabIndex(node) < 0 || !radioAllowed(node, radioCache))) return false;
  return !disabledField(node) && visible(node, options);
}
function check(node, options, tab) {
  if (!node) throw new Error('No node provided');
  return node.matches(tab ? candidates : candidates + ',iframe') && eligible(node, options || {}, tab, new Map());
}
export function isFocusable(node, options) { return check(node, options, false); }
export function isTabbable(node, options) { return check(node, options, true); }

function flatten(records, tab) {
  const scopes = [records];
  for (let i = 0; i < scopes.length; i++) for (const item of scopes[i]) if (item.scope) scopes.push(item.scope);
  const results = new Map();
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i], output = [];
    if (tab) scope.sort((a, b) => (a.index > 0 ? a.index : Infinity) - (b.index > 0 ? b.index : Infinity) || a.order - b.order);
    for (const item of scope) {
      if (item.scope) for (const node of results.get(item.scope)) output.push(node);
      else output.push(item.node);
    }
    results.set(scope, output);
  }
  return results.get(records);
}
function collect(container, supplied, tab) {
  const options = supplied || {}, radioCache = new Map(), records = [];
  if (inert(container)) return [];
  function add(node, target) {
    if (node.matches(candidates) && eligible(node, options, tab, radioCache)) target.push({node, index: tab ? getTabIndex(node) : 0, order: target.length});
  }
  if (!options.getShadowRoot) {
    if (options.includeContainer) add(container, records);
    for (const node of container.querySelectorAll(candidates)) add(node, records);
  } else {
    // Explicit frames keep both DOM traversal and scope ordering stack-safe.
    const frames = [{nodes: [container], cursor: 0, target: records}];
    while (frames.length) {
      const frame = frames[frames.length - 1];
      if (frame.cursor === frame.nodes.length) { frames.pop(); continue; }
      const node = frame.nodes[frame.cursor++];
      if (inert(node)) continue;
      let children, scoped = false;
      if (node.tagName === 'SLOT') {
        const assigned = node.assignedElements(); children = assigned.length ? assigned : node.children; scoped = true;
      } else {
        if (node !== container || options.includeContainer) add(node, frame.target);
        const shadow = node.shadowRoot || (typeof options.getShadowRoot === 'function' && options.getShadowRoot(node));
        if (shadow && (!tab || !ownIndex(node) || node.tabIndex >= 0) && !inert(shadow)) {
          children = shadow === true ? node.children : shadow.children; scoped = true;
        } else children = node.children;
      }
      if (!children?.length) continue;
      let target = frame.target;
      if (scoped) {
        target = [];
        const index = getTabIndex(node);
        frame.target.push({scope: target, index: index < 0 && !ownIndex(node) ? 0 : index, order: frame.target.length});
      }
      frames.push({nodes: children, cursor: 0, target});
    }
  }
  return flatten(records, tab);
}
export function tabbable(container, options) { return collect(container, options, true); }
export function focusable(container, options) { return collect(container, options, false); }
