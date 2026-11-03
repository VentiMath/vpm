"use strict";

// Attribute leases are separate for each element and attribute. Mixed aria/inert
// calls and overlapping markers cannot consume one another's ownership.
const leases = new WeakMap();
const noop = () => {};
function hold(node, name, marker) {
  if (node.namespaceURI === "http://www.w3.org/1999/xhtml")
    name = name.toLowerCase();
  let attributes = leases.get(node);
  if (!attributes) leases.set(node, (attributes = new Map()));
  let entry = attributes.get(name);
  if (entry) {
    entry.count++;
  } else {
    const before = node.getAttribute(name);
    const changed = marker
      ? before !== "true"
      : before === null || before === "false";
    if (changed) node.setAttribute(name, "true");
    entry = { count: 1, before, changed };
    attributes.set(name, entry);
  }
  return () => {
    if (--entry.count) return;
    attributes.delete(name);
    if (!attributes.size) leases.delete(node);
    // A different value written by the caller during isolation belongs to it.
    if (entry.changed && node.getAttribute(name) === "true") {
      if (entry.before === null) node.removeAttribute(name);
      else node.setAttribute(name, entry.before);
    }
  };
}

function parentFor(targets, supplied) {
  return supplied || targets[0]?.ownerDocument?.body || null;
}
function within(target, parent) {
  // A target in a shadow tree keeps its containing host accessible, just as the
  // public API does for a light-DOM subtree. Walk iteratively across nested roots.
  for (let node = target; node; node = node.getRootNode?.().host) {
    if (parent.contains(node)) return node;
  }
  return null;
}
function isolate(input, supplied, marker, attribute, preserveLive) {
  const requested = Array.isArray(input) ? input : [input];
  const parent = parentFor(requested, supplied);
  if (!parent || !requested.length) return noop;
  const stops = new Set();
  for (const node of requested) {
    const target = node && within(node, parent);
    if (target) stops.add(target);
  }
  // An invalid or detached target must not make the entire document inaccessible.
  if (!stops.size || stops.has(parent)) return noop;
  parent.ownerDocument.createAttribute(marker); // Validate before any mutation.
  if (preserveLive)
    for (const node of parent.querySelectorAll("[aria-live],script"))
      stops.add(node);
  const paths = new Set();
  for (const target of stops)
    for (
      let node = target;
      node && node !== parent && !paths.has(node);
      node = node.parentNode
    )
      paths.add(node);
  const pending = [parent],
    release = [];
  try {
    while (pending.length) {
      const branch = pending.pop();
      // Attribute writes invalidate live HTMLCollections in DOM implementations.
      // Sibling links avoid rebuilding that collection for every hidden node.
      for (
        let child = branch.firstElementChild;
        child;
        child = child.nextElementSibling
      ) {
        if (stops.has(child)) continue;
        if (paths.has(child)) pending.push(child);
        else {
          release.push(hold(child, attribute, false));
          if (marker !== attribute) release.push(hold(child, marker, true));
        }
      }
    }
  } catch (error) {
    for (let i = release.length - 1; i >= 0; i--) release[i]();
    throw error;
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (let i = release.length - 1; i >= 0; i--) release[i]();
    release.length = 0;
  };
}
function hideOthers(targets, parent, marker = "data-aria-hidden") {
  return isolate(targets, parent, marker, "aria-hidden", true);
}
function inertOthers(targets, parent, marker = "data-inert-ed") {
  return isolate(targets, parent, marker, "inert", false);
}
function supportsInert() {
  return typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
}
function suppressOthers(targets, parent, marker = "data-suppressed") {
  const requested = Array.isArray(targets) ? targets : [targets];
  const realm = parentFor(requested, parent)?.ownerDocument?.defaultView;
  const inert = realm
    ? "inert" in realm.HTMLElement.prototype
    : supportsInert();
  return (inert ? inertOthers : hideOthers)(targets, parent, marker);
}
module.exports = { hideOthers, inertOthers, suppressOthers, supportsInert };
