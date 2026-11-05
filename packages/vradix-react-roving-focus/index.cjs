'use client';
'use strict';
const React = require('react'), JSX = require('react/jsx-runtime');
const { createCollection } = require('vradix-react-collection');
const { createContextScope } = require('vradix-react-context');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { useDirection } = require('vradix-react-direction');
const { useId } = require('vradix-react-id');
const { Primitive } = require('vradix-react-primitive');
const { composeEventHandlers } = require('vradix-primitive');
const { useControllableState } = require('vradix-react-use-controllable-state');
const { useCallbackRef } = require('vradix-react-use-callback-ref');
const { useLayoutEffect } = require('vradix-react-use-layout-effect');
const { useIsHydrated } = require('vradix-react-use-is-hydrated');
const name = 'RovingFocusGroup', entryEvent = 'rovingFocusGroup.onEntryFocus';
const [Collection, useItems, collectionScope] = createCollection(name);
const [makeContext, createRovingFocusGroupScope] = createContextScope(name, [collectionScope]);
const [Provider, read] = makeContext(name);
function focus(nodes, preventScroll = false) {
  for (const node of nodes) {
    if (!node?.isConnected) continue;
    const doc = node.ownerDocument;
    if (doc.activeElement === node) return;
    node.focus({ preventScroll });
    if (doc.activeElement === node) return;
  }
}
function intent(event, orientation, direction) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  switch (event.key) {
    case 'Home': case 'PageUp': return 'first';
    case 'End': case 'PageDown': return 'last';
    case 'ArrowUp': return orientation !== 'horizontal' ? 'prev' : undefined;
    case 'ArrowDown': return orientation !== 'horizontal' ? 'next' : undefined;
    case 'ArrowLeft': return orientation !== 'vertical' ? (direction === 'rtl' ? 'next' : 'prev') : undefined;
    case 'ArrowRight': return orientation !== 'vertical' ? (direction === 'rtl' ? 'prev' : 'next') : undefined;
  }
}
const Group = React.forwardRef(function Group({
  __scopeRovingFocusGroup: scope, orientation, dir, loop = false,
  currentTabStopId: controlled, defaultCurrentTabStopId, onCurrentTabStopIdChange,
  onEntryFocus, preventScrollOnEntryFocus = false, ...props
}, forwardedRef) {
  const element = React.useRef(null), ref = useComposedRefs(forwardedRef, element);
  const direction = useDirection(dir), getItems = useItems(scope);
  const [current, setCurrent] = useControllableState({ prop: controlled, defaultProp: defaultCurrentTabStopId ?? null, onChange: onCurrentTabStopIdChange, caller: name });
  const [count, setCount] = React.useState(0), [leaving, setLeaving] = React.useState(false);
  const mouse = React.useRef(false), pending = React.useRef(null);
  const countItems = React.useCallback(delta => setCount(n => n + delta), []);
  const shiftTab = React.useCallback(() => setLeaving(true), []);
  const cancel = React.useCallback(() => {
    if (pending.current) { pending.current.window.clearTimeout(pending.current.id); pending.current = null; }
  }, []);
  useLayoutEffect(() => cancel, [cancel]);
  const navigate = useCallbackRef((source, action) => {
    cancel();
    const win = source.ownerDocument.defaultView;
    const work = { window: win, id: undefined }; pending.current = work;
    work.id = win.setTimeout(() => {
      if (pending.current !== work) return; pending.current = null;
      // A delayed navigation must not steal a later click's focus, or focus an
      // element removed while the event's state updates were committing.
      if (!source.isConnected || source.ownerDocument.activeElement !== source || !element.current?.contains(source)) return;
      const nodes = getItems().filter(item => item.focusable).map(item => item.ref.current);
      if (action === 'last' || action === 'prev') nodes.reverse();
      let start = 0;
      if (action === 'prev' || action === 'next') {
        const index = nodes.indexOf(source); if (index < 0) return; start = index + 1;
      }
      const candidates = loop && start ? nodes.slice(start).concat(nodes.slice(0, start)) : nodes.slice(start);
      focus(candidates);
    }, 0);
  });
  const onEntry = useCallbackRef(onEntryFocus);
  // Slot/asChild may replace the actual root. Own the listener on each commit.
  useLayoutEffect(() => {
    const node = element.current;
    if (node) { node.addEventListener(entryEvent, onEntry); return () => node.removeEventListener(entryEvent, onEntry); }
  });
  return JSX.jsx(Provider, {
    scope, orientation, direction, loop, current, setCurrent, countItems, shiftTab, navigate,
    children: JSX.jsx(Primitive.div, {
      tabIndex: leaving || !count ? -1 : 0, 'data-orientation': orientation, ...props, ref,
      style: { outline: 'none', ...props.style },
      onMouseDown: composeEventHandlers(props.onMouseDown, () => { mouse.current = true; cancel(); }),
      onFocus: composeEventHandlers(props.onFocus, event => {
        const isMouse = mouse.current; mouse.current = false;
        if (event.target !== event.currentTarget || isMouse || leaving) return;
        const custom = new event.currentTarget.ownerDocument.defaultView.CustomEvent(entryEvent, { cancelable: true, bubbles: false });
        event.currentTarget.dispatchEvent(custom);
        if (custom.defaultPrevented) return;
        const items = getItems().filter(item => item.focusable);
        const preferred = [items.find(item => item.active), items.find(item => item.id === current), ...items];
        focus([...new Set(preferred.filter(Boolean).map(item => item.ref.current))], preventScrollOnEntryFocus);
      }),
      onBlur: composeEventHandlers(props.onBlur, () => setLeaving(false)),
    }),
  });
});
const RovingFocusGroup = React.forwardRef(function RovingFocusGroup(props, ref) {
  const scope = props.__scopeRovingFocusGroup;
  return JSX.jsx(Collection.Provider, { scope, children: JSX.jsx(Collection.Slot, { scope, children: JSX.jsx(Group, { ...props, ref }) }) });
});
const RovingFocusGroupItem = React.forwardRef(function RovingFocusGroupItem({
  __scopeRovingFocusGroup: scope, focusable = true, active = false, tabStopId, children, ...props
}, ref) {
  const id = useId(tabStopId), context = read('RovingFocusGroupItem', scope);
  const hydrated = useIsHydrated();
  const register = React.useCallback(() => {
    if (!focusable) return;
    context.countItems(1); return () => context.countItems(-1);
  }, [focusable, context.countItems]);
  useLayoutEffect(() => { if (hydrated) return register(); }, [hydrated, register]);
  React.useEffect(() => { if (!hydrated) return register(); }, [hydrated, register]);
  const isCurrentTabStop = context.current === id;
  return JSX.jsx(Collection.ItemSlot, {
    scope, id, focusable, active,
    children: JSX.jsx(Primitive.span, {
      tabIndex: focusable && isCurrentTabStop ? 0 : -1, 'data-orientation': context.orientation, ...props, ref,
      onMouseDown: composeEventHandlers(props.onMouseDown, event => {
        if (focusable) context.setCurrent(id); else event.preventDefault();
      }),
      onFocus: composeEventHandlers(props.onFocus, () => { if (focusable) context.setCurrent(id); }),
      onKeyDown: composeEventHandlers(props.onKeyDown, event => {
        if (event.key === 'Tab' && event.shiftKey) { context.shiftTab(); return; }
        if (event.target !== event.currentTarget) return;
        const action = intent(event, context.orientation, context.direction);
        if (action) { event.preventDefault(); context.navigate(event.currentTarget, action); }
      }),
      children: typeof children === 'function' ? children({ hasTabStop: context.current != null, isCurrentTabStop }) : children,
    }),
  });
});
module.exports = { Root: RovingFocusGroup, Item: RovingFocusGroupItem, RovingFocusGroup, RovingFocusGroupItem, createRovingFocusGroupScope };
