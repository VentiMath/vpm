'use client';
'use strict';
const React = require('react'), ReactDOM = require('react-dom');
const { Primitive } = require('vradix-react-primitive');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { createContextScope } = require('vradix-react-context');
const { useDirection } = require('vradix-react-direction');
const { useCallbackRef } = require('vradix-react-use-callback-ref');
const Popper = require('vradix-react-popper'), Roving = require('vradix-react-roving-focus');
const { DismissableLayer } = require('vradix-react-dismissable-layer');
const Focus = require('vradix-react-focus-scope');
const { Portal } = require('vradix-react-portal'), { Presence } = require('vradix-react-presence');
const { hideOthers } = require('varia-hidden'), { RemoveScroll } = require('vreact-remove-scroll');
const h = React.createElement;
const [context, createMenuScope] = createContextScope('Menu', [Popper.createPopperScope, Roving.createRovingFocusGroupScope]);
const usePopper = Popper.createPopperScope(), useRoving = Roving.createRovingFocusGroupScope();
const [RootProvider, rootContext] = context('Menu');
const [LevelProvider, levelContext] = context('Menu');
const [ContentProvider, contentContext] = context('MenuContent');
const [PortalProvider, portalContext] = context('MenuPortal', { forceMount: undefined });
const [RadioProvider, radioContext] = context('MenuRadioGroup', { value: undefined, change: undefined });
const [CheckedProvider, checkedContext] = context('MenuItemIndicator', { checked: false });
const chain = (first, second) => event => { first?.(event); if (!event.defaultPrevented) second(event); };
const openState = open => open ? 'open' : 'closed';
const checkedState = checked => checked === 'indeterminate' ? checked : checked ? 'checked' : 'unchecked';
function forward(name, render) { const component = React.forwardRef(render); component.displayName = name; return component; }
function focus(nodes) {
  for (const node of nodes) {
    if (!node?.isConnected) continue;
    node.focus({ preventScroll: true });
    if (node.ownerDocument.activeElement === node) return;
  }
}
function useLevel(open, onOpenChange) {
  const [node, setNode] = React.useState(null), [anchor, setAnchor] = React.useState(null);
  const change = useCallbackRef(onOpenChange);
  return { open, change, node, setNode, anchor, setAnchor };
}
function Menu({ __scopeMenu: scope, open = false, onOpenChange, dir, modal = true, children }) {
  const level = useLevel(open, onOpenChange), direction = useDirection(dir), keyboard = React.useRef(false);
  const popper = usePopper(scope), close = React.useCallback(() => level.change(false), [level.change]);
  const doc = level.node?.ownerDocument || level.anchor?.ownerDocument || globalThis.document;
  React.useEffect(() => {
    if (!doc) return;
    const key = () => { keyboard.current = true; }, pointer = () => { keyboard.current = false; };
    doc.addEventListener('keydown', key, true); doc.addEventListener('pointerdown', pointer, true); doc.addEventListener('pointermove', pointer, true);
    return () => { doc.removeEventListener('keydown', key, true); doc.removeEventListener('pointerdown', pointer, true); doc.removeEventListener('pointermove', pointer, true); };
  }, [doc]);
  React.useEffect(() => {
    if (!open || !doc?.defaultView) return;
    const win = doc.defaultView; win.addEventListener('blur', close);
    return () => win.removeEventListener('blur', close);
  }, [open, doc, close]);
  return h(Popper.Root, popper, h(RootProvider, { scope, dir: direction, modal, keyboard, close }, h(LevelProvider, { scope, ...level }, children)));
}
const MenuAnchor = forward('MenuAnchor', function ({ __scopeMenu: scope, ...props }, ref) {
  const level = levelContext('MenuAnchor', scope), composed = useComposedRefs(ref, level.setAnchor);
  return h(Popper.Anchor, { ...usePopper(scope), ...props, ref: composed });
});
function MenuPortal({ __scopeMenu: scope, forceMount, container, children }) {
  const level = levelContext('MenuPortal', scope);
  return h(PortalProvider, { scope, forceMount }, h(Presence, { present: !!forceMount || level.open }, h(Portal, { container, asChild: true }, children)));
}
// Sentinel leases are document-specific, including portalled iframe menus.
const guards = new WeakMap();
function useGuards(doc) {
  React.useEffect(() => {
    const body = doc?.body; if (!body) return;
    let lease = guards.get(body);
    if (!lease) {
      const nodes = [0, 1].map(() => { const node = doc.createElement('span'); node.tabIndex = 0; node.setAttribute('data-radix-focus-guard', ''); Object.assign(node.style, { outline: 'none', opacity: '0', position: 'fixed', pointerEvents: 'none' }); return node; });
      lease = { nodes, count: 0 }; guards.set(body, lease);
    }
    body.prepend(lease.nodes[0]); body.append(lease.nodes[1]); lease.count++;
    return () => { if (--lease.count === 0) { for (const node of lease.nodes) node.remove(); guards.delete(body); } };
  }, [doc]);
}
function inPolygon(x, y, points) {
  let positive = false, negative = false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    positive ||= cross > 0; negative ||= cross < 0;
    if (positive && negative) return false;
  }
  return true;
}
function useNavigation(node, open) {
  const registry = React.useRef(new Map()), search = React.useRef(''), timers = React.useRef({}), grace = React.useRef(null), lastX = React.useRef(null);
  const cancel = React.useCallback(() => { for (const work of Object.values(timers.current)) work.win.clearTimeout(work.id); timers.current = {}; search.current = ''; grace.current = null; }, []);
  React.useEffect(() => { if (!open) cancel(); return cancel; }, [node, open, cancel]);
  function schedule(name, fn, delay) {
    const win = node.ownerDocument.defaultView, previous = timers.current[name];
    if (previous) previous.win.clearTimeout(previous.id);
    const work = { win }; timers.current[name] = work;
    work.id = win.setTimeout(() => { if (timers.current[name] !== work) return; delete timers.current[name]; fn(); }, delay);
  }
  const items = () => [...registry.current].filter(([element, data]) => element.isConnected && !data.current.disabled).sort(([a], [b]) => a.compareDocumentPosition(b) & 4 ? -1 : 1);
  const type = key => {
    const value = search.current + key; search.current = value;
    schedule('reset', () => { search.current = ''; }, 1000);
    const characters = [...value], prefix = characters.every(c => c === characters[0]) ? characters[0] : value;
    const candidates = items(), source = node.ownerDocument.activeElement, index = candidates.findIndex(([element]) => element === source);
    // Cycle by element identity, so two identically labelled items are reachable.
    const start = Math.max(0, index + (prefix.length === 1 ? 1 : 0));
    const ordered = candidates.slice(start).concat(candidates.slice(0, start));
    const match = ordered.find(([element, data]) => (data.current.textValue ?? element.textContent.trim()).toLowerCase().startsWith(prefix.toLowerCase()));
    if (match && match[0] !== source) schedule('focus', () => {
      if (node.isConnected && node.ownerDocument.activeElement === source && registry.current.has(match[0]) && !match[1].current.disabled) focus([match[0]]);
    }, 0);
  };
  const towardSubmenu = event => {
    const intent = grace.current;
    if (!intent || Date.now() > intent.until || !intent.content.isConnected || !intent.trigger.isConnected) return false;
    const box = intent.content.getBoundingClientRect(), right = intent.content.dataset.side === 'right';
    if (lastX.current !== null && (right ? event.clientX < lastX.current : event.clientX > lastX.current)) return false;
    return inPolygon(event.clientX, event.clientY, [{ x: intent.x + (right ? -5 : 5), y: intent.y }, { x: right ? box.left : box.right, y: box.top }, { x: right ? box.right : box.left, y: box.top }, { x: right ? box.right : box.left, y: box.bottom }, { x: right ? box.left : box.right, y: box.bottom }]);
  };
  return { registry: registry.current, search, items, type, cancel, grace, lastX, towardSubmenu };
}
const MountedContent = forward('MenuContent', function ({ __scopeMenu: scope, sub, loop = false, onCloseAutoFocus, onEntryFocus, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, ...props }, forwardedRef) {
  const root = rootContext('MenuContent', scope), level = levelContext('MenuContent', scope);
  const [node, setNode] = React.useState(null), [current, setCurrent] = React.useState(null);
  const ref = useComposedRefs(forwardedRef, setNode, level.setNode), modal = !sub && root.modal;
  const navigation = useNavigation(node, level.open), popper = usePopper(scope), roving = useRoving(scope);
  Focus.useFocusScopeBranch(node);
  const { nodes: branches, registry } = Focus.useFocusScopeBranchRegistry();
  useGuards(node?.ownerDocument);
  React.useEffect(() => { if (modal && node) return hideOthers([node, ...branches], node.ownerDocument.body); }, [modal, node, branches]);
  const shards = React.useMemo(() => node ? [node, ...branches] : branches, [node, branches]);
  let content = h(Popper.Content, {
    role: 'menu', 'aria-orientation': 'vertical', 'data-state': openState(level.open), 'data-radix-menu-content': '',
    ...(sub ? { id: level.contentId, 'aria-labelledby': level.triggerId } : {}), ...popper, ...props,
    ...(sub ? { side: root.dir === 'rtl' ? 'left' : 'right', align: props.align || 'start' } : {}),
    dir: root.dir, ref, style: { outline: 'none', ...props.style },
    onKeyDown: chain(props.onKeyDown, event => {
      if (event.target.closest('[data-radix-menu-content]') !== event.currentTarget) return;
      if (event.key === 'Tab') event.preventDefault();
      if (sub && event.key === (root.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        level.change(false); focus([level.anchor]); event.preventDefault(); return;
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && !event.nativeEvent.isComposing && event.key.length === 1) navigation.type(event.key);
      if (event.target === event.currentTarget && ['Home', 'PageUp', 'ArrowDown', 'End', 'PageDown', 'ArrowUp'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); const nodes = navigation.items().map(([element]) => element);
        if (['End', 'PageDown', 'ArrowUp'].includes(event.key)) nodes.reverse(); focus(nodes);
      }
    }),
    onBlur: chain(props.onBlur, event => { if (!event.currentTarget.contains(event.relatedTarget)) navigation.cancel(); }),
    onPointerMove: chain(props.onPointerMove, event => { if (event.pointerType === 'mouse' && event.currentTarget.contains(event.target)) navigation.lastX.current = event.clientX; }),
  }, props.children);
  content = h(Roving.Root, { ...roving, asChild: true, dir: root.dir, orientation: 'vertical', loop, currentTabStopId: current, onCurrentTabStopIdChange: setCurrent, preventScrollOnEntryFocus: true, onEntryFocus: chain(onEntryFocus, event => { if (!root.keyboard.current) event.preventDefault(); }) }, content);
  content = h(DismissableLayer, {
    asChild: true, disableOutsidePointerEvents: modal && level.open, onPointerDownOutside, onInteractOutside,
    onEscapeKeyDown: chain(onEscapeKeyDown, event => { if (sub) { root.close(); event.preventDefault(); } }),
    onFocusOutside: event => {
      onFocusOutside?.(event);
      if (modal) event.preventDefault();
      else if (sub && !event.defaultPrevented && event.target !== level.anchor) level.change(false);
    },
    onDismiss: sub ? undefined : () => level.change(false),
  }, content);
  content = h(Focus.FocusScope, {
    asChild: true, trapped: modal && level.open, branches,
    onMountAutoFocus: event => { event.preventDefault(); if (!sub || root.keyboard.current) node?.focus({ preventScroll: true }); },
    onUnmountAutoFocus: sub ? event => event.preventDefault() : onCloseAutoFocus,
  }, content);
  if (modal) content = h(RemoveScroll, { forwardProps: true, allowPinchZoom: true, shards }, content);
  return h(ContentProvider, { scope, ...navigation, node, setCurrent }, h(Focus.FocusScopeBranchProvider, { registry: modal ? registry : null }, content));
});
function contentComponent(name, sub) {
  return forward(name, function ({ __scopeMenu: scope, forceMount, ...props }, ref) {
    const level = levelContext(name, scope), portal = portalContext(name, scope);
    return h(Presence, { present: !!(forceMount ?? portal.forceMount) || level.open }, h(MountedContent, { ...props, __scopeMenu: scope, ref, sub }));
  });
}
const MenuContent = contentComponent('MenuContent', false), MenuSubContent = contentComponent('MenuSubContent', true);
function simple(name, element, defaults) {
  return forward(name, function ({ __scopeMenu, ...props }, ref) { return h(element, { ...defaults, ...props, ref }); });
}
const MenuGroup = simple('MenuGroup', Primitive.div, { role: 'group' });
const MenuLabel = simple('MenuLabel', Primitive.div, {});
const MenuSeparator = simple('MenuSeparator', Primitive.div, { role: 'separator', 'aria-orientation': 'horizontal' });
const MenuArrow = forward('MenuArrow', function ({ __scopeMenu: scope, ...props }, ref) { return h(Popper.Arrow, { ...usePopper(scope), ...props, ref }); });
const ItemBase = forward('MenuItem', function ({ __scopeMenu: scope, disabled = false, textValue, ...props }, forwardedRef) {
  const content = contentContext('MenuItem', scope), [node, setNode] = React.useState(null), [highlighted, setHighlighted] = React.useState(false);
  const ref = useComposedRefs(forwardedRef, setNode), metadata = React.useRef({ disabled, textValue });
  React.useInsertionEffect(() => { metadata.current = { disabled, textValue }; });
  React.useEffect(() => { if (node) { content.registry.set(node, metadata); return () => content.registry.delete(node); } }, [node, content.registry]);
  const leave = event => { if (!content.towardSubmenu(event)) { focus([content.node]); content.setCurrent(null); } };
  return h(Roving.Item, { ...useRoving(scope), asChild: true, focusable: !disabled }, h(Primitive.div, {
    role: 'menuitem', 'data-highlighted': highlighted ? '' : undefined, 'aria-disabled': disabled || undefined, 'data-disabled': disabled ? '' : undefined,
    ...props, ref,
    onPointerMove: chain(props.onPointerMove, event => { if (event.pointerType !== 'mouse') return; if (disabled) leave(event); else if (!content.towardSubmenu(event)) focus([event.currentTarget]); }),
    onPointerLeave: chain(props.onPointerLeave, event => { if (event.pointerType === 'mouse') leave(event); }),
    onFocus: chain(props.onFocus, () => setHighlighted(true)), onBlur: chain(props.onBlur, () => setHighlighted(false)),
  }));
});
const MenuItem = forward('MenuItem', function ({ __scopeMenu: scope, disabled = false, onSelect, ...props }, ref) {
  const root = rootContext('MenuItem', scope), content = contentContext('MenuItem', scope), down = React.useRef(null);
  return h(ItemBase, {
    ...props, __scopeMenu: scope, disabled, ref,
    onClick: chain(props.onClick, event => {
      if (disabled) return;
      const node = event.currentTarget, select = new node.ownerDocument.defaultView.CustomEvent('menu.itemSelect', { bubbles: true, cancelable: true });
      const listener = event => onSelect?.(event); node.addEventListener(select.type, listener, { once: true });
      try { ReactDOM.flushSync(() => node.dispatchEvent(select)); } finally { node.removeEventListener(select.type, listener); }
      down.current = null; if (!select.defaultPrevented) root.close();
    }),
    onPointerDown: event => { props.onPointerDown?.(event); down.current = event.pointerId; },
    onPointerUp: chain(props.onPointerUp, event => { const same = down.current === event.pointerId; down.current = null; if (!same && !disabled) event.currentTarget.click(); }),
    onPointerCancel: event => { down.current = null; props.onPointerCancel?.(event); },
    onKeyDown: chain(props.onKeyDown, event => {
      if (disabled || event.target !== event.currentTarget || event.nativeEvent.isComposing || (event.key === ' ' && content.search.current)) return;
      if (event.key === 'Enter' || event.key === ' ') { event.currentTarget.click(); event.preventDefault(); }
    }),
  });
});
const MenuCheckboxItem = forward('MenuCheckboxItem', function ({ checked = false, onCheckedChange, onSelect, ...props }, ref) {
  return h(CheckedProvider, { scope: props.__scopeMenu, checked }, h(MenuItem, {
    role: 'menuitemcheckbox', 'aria-checked': checked === 'indeterminate' ? 'mixed' : checked, ...props, ref, 'data-state': checkedState(checked),
    onSelect: event => { onSelect?.(event); onCheckedChange?.(checked === 'indeterminate' || !checked); },
  }));
});
const MenuRadioGroup = forward('MenuRadioGroup', function ({ value, onValueChange, ...props }, ref) {
  const change = useCallbackRef(onValueChange);
  return h(RadioProvider, { scope: props.__scopeMenu, value, change }, h(MenuGroup, { ...props, ref }));
});
const MenuRadioItem = forward('MenuRadioItem', function ({ value, onSelect, ...props }, ref) {
  const radio = radioContext('MenuRadioItem', props.__scopeMenu), checked = radio.value === value;
  return h(CheckedProvider, { scope: props.__scopeMenu, checked }, h(MenuItem, {
    role: 'menuitemradio', 'aria-checked': checked, ...props, ref, 'data-state': checkedState(checked),
    onSelect: event => { onSelect?.(event); radio.change?.(value); },
  }));
});
const MenuItemIndicator = forward('MenuItemIndicator', function ({ __scopeMenu: scope, forceMount, ...props }, ref) {
  const { checked } = checkedContext('MenuItemIndicator', scope);
  return h(Presence, { present: !!forceMount || checked === true || checked === 'indeterminate' }, h(Primitive.span, { ...props, ref, 'data-state': checkedState(checked) }));
});
function MenuSub({ __scopeMenu: scope, open = false, onOpenChange, children }) {
  const parent = levelContext('MenuSub', scope), level = useLevel(open, onOpenChange), triggerId = React.useId(), contentId = React.useId();
  React.useEffect(() => { if (!parent.open) level.change(false); return () => level.change(false); }, [parent.open, level.change]);
  return h(Popper.Root, usePopper(scope), h(LevelProvider, { scope, ...level, triggerId, contentId }, children));
}
const MenuSubTrigger = forward('MenuSubTrigger', function ({ __scopeMenu: scope, disabled = false, ...props }, forwardedRef) {
  const root = rootContext('MenuSubTrigger', scope), level = levelContext('MenuSubTrigger', scope), content = contentContext('MenuSubTrigger', scope);
  const ref = useComposedRefs(forwardedRef, level.setAnchor), timer = React.useRef(null);
  const cancel = React.useCallback(() => { if (timer.current) { timer.current.win.clearTimeout(timer.current.id); timer.current = null; } }, []);
  React.useEffect(() => { if (disabled || level.open) cancel(); return cancel; }, [disabled, level.open, cancel]);
  return h(Popper.Anchor, { ...usePopper(scope), asChild: true }, h(ItemBase, {
    id: level.triggerId, 'aria-haspopup': 'menu', 'aria-expanded': level.open, 'aria-controls': level.open ? level.contentId : undefined,
    'data-state': openState(level.open), ...props, __scopeMenu: scope, disabled, ref,
    onClick: chain(props.onClick, event => { if (!disabled) { cancel(); focus([event.currentTarget]); if (!level.open) level.change(true); } }),
    onKeyDown: chain(props.onKeyDown, event => {
      if (disabled || event.target !== event.currentTarget || event.nativeEvent.isComposing || (content.search.current && event.key === ' ')) return;
      if (['Enter', ' ', root.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'].includes(event.key)) { cancel(); level.change(true); focus([level.node]); event.preventDefault(); }
    }),
    onPointerMove: chain(props.onPointerMove, event => {
      if (event.pointerType !== 'mouse' || disabled || content.towardSubmenu(event)) return;
      if (!level.open && !timer.current) {
        content.grace.current = null; const node = event.currentTarget, win = node.ownerDocument.defaultView, work = { win }; timer.current = work;
        work.id = win.setTimeout(() => { if (timer.current !== work) return; timer.current = null; if (node.isConnected) level.change(true); }, 100);
      }
    }),
    onPointerLeave: chain(props.onPointerLeave, event => {
      if (event.pointerType !== 'mouse') return;
      cancel(); content.grace.current = level.node ? { trigger: event.currentTarget, content: level.node, x: event.clientX, y: event.clientY, until: Date.now() + 300 } : null;
      if (content.towardSubmenu(event)) event.preventDefault();
    }),
  }));
});
module.exports = { Menu, Root: Menu, createMenuScope };
for (const [name, component] of Object.entries({ Anchor: MenuAnchor, Portal: MenuPortal, Content: MenuContent, Group: MenuGroup, Label: MenuLabel, Item: MenuItem, CheckboxItem: MenuCheckboxItem, RadioGroup: MenuRadioGroup, RadioItem: MenuRadioItem, ItemIndicator: MenuItemIndicator, Separator: MenuSeparator, Arrow: MenuArrow, Sub: MenuSub, SubTrigger: MenuSubTrigger, SubContent: MenuSubContent })) {
  module.exports[name] = component; module.exports['Menu' + name] = component;
}
