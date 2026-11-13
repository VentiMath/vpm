"use strict";
const React = require("react"),
  { useEnhancedEffect, useForkRef, useLazyRef } = require("./hooks.cjs"),
  { contains, getActiveElement, setRef } = require("./dom.cjs");
const RovingTabIndexContext = React.createContext(undefined);
function useRovingTabIndexContext() {
  const context = React.useContext(RovingTabIndexContext);
  if (!context)
    throw Error("Roving items require a RovingTabIndexContext provider");
  return context;
}
const isItemFocusable = (item) =>
  !!item.element && (!item.disabled || item.focusableWhenDisabled);
function useRovingTabIndexRoot(params) {
  const [, notify] = React.useReducer((n) => n + 1, 0);
  const manager = useLazyRef(() => {
    const items = new Map();
    let active = null,
      container = null,
      options = params;
    const ordered = () =>
      [...items.values()].sort((a, b) =>
        a.element && b.element
          ? a.element.compareDocumentPosition(b.element) & 4
            ? -1
            : a.element.compareDocumentPosition(b.element) & 2
              ? 1
              : 0
          : 0,
      );
    const eligible = (item, opts = options) =>
      (opts.isItemFocusable || isItemFocusable)(item);
    const selected = (opts = options) => {
      const values = ordered().filter((i) => eligible(i, opts));
      if (
        opts.activeItemId != null &&
        values.some((i) => Object.is(i.id, opts.activeItemId))
      )
        return opts.activeItemId;
      if (active != null && values.some((i) => Object.is(i.id, active)))
        return active;
      return opts.getDefaultActiveItemId?.(values) ?? values[0]?.id ?? null;
    };
    const setActiveItemId = (id) => {
      if (!Object.is(active, id)) {
        active = id;
        notify();
      }
    };
    function focus(item) {
      if (!item?.element) return null;
      item.element.focus();
      if (getActiveElement(item.element.ownerDocument) !== item.element)
        return null;
      setActiveItemId(item.id);
      return item.id;
    }
    const focusedIndex = (values) => {
      const focused = container && getActiveElement(container.ownerDocument);
      const index = values.findIndex(
        (i) => i.element === focused || contains(i.element, focused),
      );
      return index >= 0
        ? index
        : values.findIndex((i) => Object.is(i.id, selected()));
    };
    function advance(direction, filter) {
      const values = ordered(),
        start = focusedIndex(values);
      for (let distance = 1; distance <= values.length; distance++) {
        let index = start + distance * direction;
        if (options.wrap === false && (index < 0 || index >= values.length))
          break;
        index = ((index % values.length) + values.length) % values.length;
        const item = values[index];
        if (eligible(item) && (!filter || filter(item))) {
          const id = focus(item);
          if (id !== null) return id;
        }
      }
      return null;
    }
    return {
      selected,
      updateOptions(next) {
        options = next;
      },
      getItemMap: () => items,
      getActiveItem: () => items.get(selected()) ?? null,
      isItemActive: (id) => Object.is(selected(), id),
      setActiveItemId,
      registerItem(item) {
        const old = items.get(item.id);
        if (old && Object.keys(item).every((k) => Object.is(item[k], old[k])))
          return;
        items.set(item.id, { ...item });
        notify();
      },
      unregisterItem(id) {
        if (items.delete(id)) notify();
      },
      focusNext: (filter) => advance(1, filter),
      getContainerProps(ref, onFocus, onKeyDown) {
        return {
          ref: (element) => {
            container = element;
            return setRef(ref, element);
          },
          onFocus(event) {
            onFocus?.(event);
            if (event.defaultPrevented) return;
            const item = ordered().find(
              (i) =>
                i.element === event.target || contains(i.element, event.target),
            );
            if (item) setActiveItemId(item.id);
          },
          onKeyDown(event) {
            onKeyDown?.(event);
            if (
              event.defaultPrevented ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            const vertical = options.orientation === "vertical";
            let direction = 0;
            if (event.key === (vertical ? "ArrowDown" : "ArrowRight"))
              direction = options.isRtl && !vertical ? -1 : 1;
            if (event.key === (vertical ? "ArrowUp" : "ArrowLeft"))
              direction = options.isRtl && !vertical ? 1 : -1;
            if (direction) {
              event.preventDefault();
              advance(direction);
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              const values = ordered().filter((i) => eligible(i));
              if (event.key === "End") values.reverse();
              for (const item of values) if (focus(item) !== null) break;
            }
          },
        };
      },
    };
  }).current;
  useEnhancedEffect(() => {
    manager.updateOptions(params);
  });
  return { ...manager, activeItemId: manager.selected(params) };
}
function useRovingTabIndexItem({
  id,
  ref,
  disabled = false,
  focusableWhenDisabled = false,
  textValue,
  selected = false,
}) {
  const context = useRovingTabIndexContext(),
    node = React.useRef(null),
    properties = React.useRef({
      disabled,
      focusableWhenDisabled,
      textValue,
      selected,
    });
  const { registerItem, unregisterItem, getItemMap } = context;
  const registration = React.useCallback(
    (element) => {
      node.current = element;
      if (element) {
        registerItem({ id, element, ...properties.current });
        return () => {
          if (getItemMap().get(id)?.element === element) unregisterItem(id);
          if (node.current === element) node.current = null;
        };
      }
      unregisterItem(id);
    },
    [id, registerItem, unregisterItem, getItemMap],
  );
  useEnhancedEffect(() => {
    properties.current = {
      disabled,
      focusableWhenDisabled,
      textValue,
      selected,
    };
    if (node.current)
      registerItem({ id, element: node.current, ...properties.current });
  }, [id, disabled, focusableWhenDisabled, textValue, selected, registerItem]);
  const combined = useForkRef(registration, ref);
  return {
    ref: combined,
    tabIndex: Object.is(context.activeItemId, id) ? 0 : -1,
  };
}
module.exports = {
  RovingTabIndexContext,
  useRovingTabIndexContext,
  isItemFocusable,
  useRovingTabIndexRoot,
  useRovingTabIndexItem,
};
