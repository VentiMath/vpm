'use client';
'use strict';
const React = require('react');
const {useComposedRefs} = require('vradix-react-compose-refs');
const marker = Symbol.for('radix.slottable');
const owns = Object.hasOwn;

function unwrap(value) {
  let seen;
  while (value?.$$typeof === Symbol.for('react.lazy') && value._payload !== null &&
    typeof value._payload === 'object' && 'then' in value._payload) {
    seen ??= new Set();
    if (seen.has(value)) throw new TypeError('Slot received a cyclic lazy child.');
    seen.add(value);
    value = React.use(value._payload);
  }
  return value;
}
function isMarker(value) {
  return React.isValidElement(value) && typeof value.type === 'function' && value.type.__radixId === marker;
}
function describedBy(child, parent) {
  const ids = new Set();
  for (const value of [child, parent]) if (typeof value === 'string') {
    for (const id of value.split(/\s+/)) if (id) ids.add(id);
  }
  return ids.size ? [...ids].join(' ') : undefined;
}
function merge(parent, child) {
  const result = {...parent, ...child};
  // Only parent-supplied handlers can require composition. Other child props
  // keep precedence without a second scan of a possibly large child prop bag.
  for (const key of Object.keys(parent)) {
    if (key[0] !== 'o' || key[1] !== 'n' || key.charCodeAt(2) < 65 || key.charCodeAt(2) > 90 || key.length < 3 || !owns(child, key)) continue;
    const outer = parent[key], inner = child[key];
    if (outer) result[key] = inner ? (...args) => {
      const returned = inner(...args);
      outer(...args);
      return returned;
    } : outer;
  }
  if (owns(child, 'style')) result.style = {...parent.style, ...child.style};
  if (owns(child, 'className')) {
    const names = [];
    if (parent.className) names.push(parent.className);
    if (child.className) names.push(child.className);
    result.className = names.join(' ');
  }
  if (owns(child, 'aria-describedby')) result['aria-describedby'] = describedBy(child['aria-describedby'], parent['aria-describedby']);
  return result;
}
function select(children, owner) {
  // The ordinary asChild path needs no child-list allocation or intermediate clone.
  if (React.isValidElement(children) && !isMarker(children)) return children;
  let target, markers = 0;
  const content = [];
  React.Children.forEach(children, child => {
    if (!isMarker(child)) {content.push(child);return;}
    if (++markers > 1) throw new Error(`${owner} received multiple Slottable targets.`);
    const props = child.props;
    target = unwrap('child' in props ? props.child : props.children);
    if (!React.isValidElement(target)) {target = undefined;return;}
    if ('child' in props) {
      // Attach the render result as one child before adding surrounding siblings.
      // React then owns its key-validation metadata; no private fields are edited.
      target = React.cloneElement(target, undefined, props.children(target.props.children));
    }
    content.push(target.props.children);
  });
  if (target) return React.cloneElement(target, undefined, content);
  if (children || children === 0) throw new Error(markers
    ? `${owner} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`
    : `${owner} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`);
  return undefined;
}
function createSlot(ownerName) {
  const component = React.forwardRef(function RenderSlot({children, ...parent}, forwardedRef) {
    children = unwrap(children);
    const target = select(children, ownerName), childRef = target?.props.ref;
    const ref = useComposedRefs(forwardedRef, childRef);
    if (!target) return children;
    const props = merge(parent, target.props);
    if (target.type !== React.Fragment) props.ref = forwardedRef ? ref : childRef;
    return React.cloneElement(target, props);
  });
  component.displayName = `${ownerName}.Slot`;
  return component;
}
function createSlottable(ownerName) {
  function Slottable(props) {return 'child' in props ? props.children(props.child) : props.children;}
  Slottable.displayName = `${ownerName}.Slottable`;
  Slottable.__radixId = marker;
  return Slottable;
}
const Slot = createSlot('Slot'), Slottable = createSlottable('Slottable');
module.exports = {Slot, Root:Slot, Slottable, createSlot, createSlottable};
