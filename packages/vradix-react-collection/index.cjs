'use client';
'use strict';
const React = require('react');
const JSX = require('react/jsx-runtime');
const { createContextScope } = require('vradix-react-context');
const { createSlot } = require('vradix-react-slot');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { useLayoutEffect } = require('vradix-react-use-layout-effect');
const attribute = 'data-radix-collection-item';

function sameData(a, b) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
}
function createCollection(name) {
  const providerName = name + 'CollectionProvider';
  const [createContext, createScope] = createContextScope(providerName);
  const [Context, read] = createContext(providerName, null);
  function Provider({ scope, children }) {
    const root = React.useRef(null);
    // Each node owns a bucket so two slotted items on the same element stay distinct.
    const [items] = React.useState(() => new Map());
    return JSX.jsx(Context, { scope, root, items, children });
  }
  Provider.displayName = providerName;
  const RootSlot = createSlot(name + 'CollectionSlot');
  const Slot = React.forwardRef(function CollectionSlot({ scope, children }, ref) {
    const context = read(name + 'CollectionSlot', scope);
    const composed = useComposedRefs(ref, context?.root);
    return JSX.jsx(RootSlot, { ref: composed, children });
  });
  Slot.displayName = name + 'CollectionSlot';
  const ChildSlot = createSlot(name + 'CollectionItemSlot');
  const ItemSlot = React.forwardRef(function CollectionItem({ scope, children, ...data }, ref) {
    const context = read(name + 'CollectionItemSlot', scope);
    const target = React.useRef(null), registered = React.useRef(null);
    const composed = useComposedRefs(ref, target);
    const release = React.useCallback(() => {
      const previous = registered.current;
      if (!previous) return;
      previous.bucket.delete(target);
      if (!previous.bucket.size) previous.items.delete(previous.node);
      registered.current = null;
    }, []);
    useLayoutEffect(() => {
      const node = target.current, previous = registered.current;
      if (!context || !node) { release(); return; }
      if (previous?.node === node && previous.items === context.items && sameData(previous.data, data)) return;
      if (previous?.node !== node || previous.items !== context.items) release();
      let bucket = context.items.get(node);
      if (!bucket) context.items.set(node, bucket = new Map());
      bucket.set(target, { ...data, ref: target });
      registered.current = { node, items: context.items, bucket, data };
    });
    useLayoutEffect(() => release, [release]);
    return JSX.jsx(ChildSlot, { [attribute]: '', ref: composed, children });
  });
  ItemSlot.displayName = name + 'CollectionItemSlot';
  function useCollection(scope) {
    const context = read(name + 'CollectionConsumer', scope);
    return React.useCallback(() => {
      const root = context?.root.current;
      if (!root) return [];
      const ordered = [];
      // Read current DOM order on demand. No observer/cache can lag behind a
      // synchronous reordering, and detached/portalled items cannot be focused.
      for (const node of root.querySelectorAll('[' + attribute + ']')) {
        const bucket = context.items.get(node);
        if (bucket) for (const item of bucket.values()) ordered.push(item);
      }
      return ordered;
    }, [context]);
  }
  return [{ Provider, Slot, ItemSlot }, useCollection, createScope];
}
module.exports = { createCollection };
