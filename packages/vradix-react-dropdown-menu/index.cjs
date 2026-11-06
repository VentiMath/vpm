'use client';
'use strict';
const React = require('react');
const Menu = require('vradix-react-menu');
const { Primitive } = require('vradix-react-primitive');
const { createContextScope } = require('vradix-react-context');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { useControllableState } = require('vradix-react-use-controllable-state');
const h = React.createElement;
const [context, createDropdownMenuScope] = createContextScope('DropdownMenu', [Menu.createMenuScope]);
const [Provider, useDropdown] = context('DropdownMenu');
const useMenu = Menu.createMenuScope();
const chain = (user, action) => event => { user?.(event); if (!event.defaultPrevented) action(event); };
const variables = Object.freeze({
  '--radix-dropdown-menu-content-transform-origin': 'var(--radix-popper-transform-origin)',
  '--radix-dropdown-menu-content-available-width': 'var(--radix-popper-available-width)',
  '--radix-dropdown-menu-content-available-height': 'var(--radix-popper-available-height)',
  '--radix-dropdown-menu-trigger-width': 'var(--radix-popper-anchor-width)',
  '--radix-dropdown-menu-trigger-height': 'var(--radix-popper-anchor-height)',
});
function forward(name, render) {
  const component = React.forwardRef(render); component.displayName = 'DropdownMenu' + name; return component;
}
function useOpen(props, caller) {
  return useControllableState({ prop: props.open, defaultProp: props.defaultOpen ?? false, onChange: props.onOpenChange, caller });
}
function DropdownMenu({ __scopeDropdownMenu: scope, children, dir, modal = true, ...state }) {
  const [open, change] = useOpen(state, 'DropdownMenu');
  const trigger = React.useRef(null), triggerId = React.useId(), contentId = React.useId();
  const toggle = React.useCallback(() => change(value => !value), [change]);
  return h(Provider, { scope, open, change, toggle, trigger, triggerId, contentId, modal },
    h(Menu.Root, { ...useMenu(scope), open, onOpenChange: change, dir, modal }, children));
}
const DropdownMenuTrigger = forward('Trigger', function ({ __scopeDropdownMenu: scope, disabled = false, ...props }, ref) {
  const state = useDropdown('DropdownMenuTrigger', scope), refs = useComposedRefs(ref, state.trigger);
  return h(Menu.Anchor, { ...useMenu(scope), asChild: true }, h(Primitive.button, {
    type: 'button', id: state.triggerId, 'aria-haspopup': 'menu', 'aria-expanded': state.open,
    'aria-controls': state.open ? state.contentId : undefined, 'data-state': state.open ? 'open' : 'closed',
    'data-disabled': disabled ? '' : undefined, disabled, ...props, ref: refs,
    onPointerDown: chain(props.onPointerDown, event => {
      if (disabled || event.button !== 0 || event.ctrlKey) return;
      state.toggle();
      if (!state.open) event.preventDefault();
    }),
    onKeyDown: chain(props.onKeyDown, event => {
      // IME confirmation belongs to the text input, not menu activation.
      if (disabled || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'ArrowDown') state.change(true);
      else if (event.key === 'Enter' || event.key === ' ') state.toggle();
      else return;
      event.preventDefault();
    }),
  }));
});
const DropdownMenuContent = forward('Content', function ({ __scopeDropdownMenu: scope, ...props }, ref) {
  const state = useDropdown('DropdownMenuContent', scope), outside = React.useRef(false);
  return h(Menu.Content, {
    ...useMenu(scope), id: state.contentId, 'aria-labelledby': state.triggerId, ...props, ref,
    style: { ...props.style, ...variables },
    onInteractOutside: chain(props.onInteractOutside, event => {
      const original = event.detail.originalEvent;
      if (!state.modal || original.button === 2 || original.button === 0 && original.ctrlKey) outside.current = true;
    }),
    onCloseAutoFocus: chain(props.onCloseAutoFocus, event => {
      if (!outside.current) state.trigger.current?.focus();
      outside.current = false;
      event.preventDefault();
    }),
  });
});
function DropdownMenuPortal({ __scopeDropdownMenu: scope, ...props }) {
  return h(Menu.Portal, { ...useMenu(scope), ...props });
}
function DropdownMenuSub({ __scopeDropdownMenu: scope, children, ...state }) {
  const [open, change] = useOpen(state, 'DropdownMenuSub');
  return h(Menu.Sub, { ...useMenu(scope), open, onOpenChange: change }, children);
}
// These parts share Menu's implementation, translating only the scope and CSS API.
const parts = { Trigger: DropdownMenuTrigger, Content: DropdownMenuContent, Portal: DropdownMenuPortal, Sub: DropdownMenuSub };
for (const name of ['Group', 'Label', 'Item', 'CheckboxItem', 'RadioGroup', 'RadioItem', 'ItemIndicator', 'Separator', 'Arrow', 'SubTrigger', 'SubContent']) {
  parts[name] = forward(name, function ({ __scopeDropdownMenu: scope, ...props }, ref) {
    return h(Menu[name], { ...useMenu(scope), ...props, ref, ...(name === 'SubContent' ? { style: { ...props.style, ...variables } } : {}) });
  });
}
DropdownMenu.displayName = 'DropdownMenu';
DropdownMenuPortal.displayName = 'DropdownMenuPortal';
DropdownMenuSub.displayName = 'DropdownMenuSub';
exports.DropdownMenu = exports.Root = DropdownMenu;
exports.createDropdownMenuScope = createDropdownMenuScope;
for (const [name, component] of Object.entries(parts)) exports[name] = exports['DropdownMenu' + name] = component;
