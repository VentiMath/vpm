import * as React from "react";
export const useCommit =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
export function useEvent(fn) {
  const latest = React.useRef(fn);
  useCommit(() => {
    latest.current = fn;
  });
  return React.useCallback((...args) => latest.current?.(...args), []);
}
export function useCurrent(value) {
  const ref = React.useRef(value);
  useCommit(() => {
    ref.current = value;
  });
  return ref;
}
export const native = (event) => event?.nativeEvent || event;
export const contains = (root, node) => {
  for (let p = node; p; p = p.assignedSlot || p.parentNode || p.host)
    if (p === root) return true;
  return false;
};
export const inside = (node, event) =>
  !!node &&
  (event.composedPath?.().includes(node) || contains(node, event.target));
export const editable = (node) =>
  /^(INPUT|TEXTAREA)$/.test(node?.tagName) || node?.isContentEditable;
export function focus(node) {
  node?.focus?.({ preventScroll: true });
}
export function active(document) {
  let node = document.activeElement;
  while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
  return node;
}
export function emitter() {
  const events = new Map();
  return {
    on(name, fn) {
      let set = events.get(name);
      if (!set) events.set(name, (set = new Set()));
      set.add(fn);
    },
    off(name, fn) {
      events.get(name)?.delete(fn);
    },
    emit(name, value) {
      for (const fn of [...(events.get(name) || [])]) fn(value);
    },
  };
}
// Property getters retain their identity while their input list changes length.
// Only real functions are composed; custom "on..." data remains ordinary data.
export function mergeProps(list, kind, user = {}) {
  const result =
    kind === "floating"
      ? { tabIndex: -1, "data-floating-ui-focusable": "" }
      : {};
  const callbacks = new Map();
  for (const entry of [
    ...list.map((item) =>
      typeof item?.[kind] === "function" ? item[kind](user) : item?.[kind],
    ),
    user,
  ]) {
    for (const [key, value] of Object.entries(entry || {})) {
      if (kind === "item" && (key === "active" || key === "selected")) continue;
      if (key.startsWith("on") && typeof value === "function") {
        let values = callbacks.get(key);
        if (!values) callbacks.set(key, (values = []));
        values.push(value);
        result[key] = (...args) => {
          let first;
          for (const fn of values) {
            const value = fn(...args);
            if (first === undefined && value !== undefined) first = value;
          }
          return first;
        };
      } else
        Object.defineProperty(result, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
    }
  }
  return result;
}
export function useInteractions(list = []) {
  const signature = list.flatMap((item) => [
    item?.reference,
    item?.floating,
    item?.item,
  ]);
  const previous = React.useRef([]);
  if (
    signature.length !== previous.current.length ||
    signature.some((value, i) => value !== previous.current[i])
  )
    previous.current = signature;
  return React.useMemo(
    () => ({
      getReferenceProps: (user) => mergeProps(list, "reference", user),
      getFloatingProps: (user) => mergeProps(list, "floating", user),
      getItemProps: (user) => mergeProps(list, "item", user),
    }),
    [previous.current],
  );
}
export function useMergeRefs(refs) {
  // Dependencies are the supplied refs, not the fresh containing array.
  const previous = React.useRef([]),
    memo = React.useRef(null);
  if (
    previous.current.length !== refs.length ||
    refs.some((ref, i) => ref !== previous.current[i])
  ) {
    previous.current = refs.slice();
    const selected = refs.filter(Boolean);
    let clean;
    memo.current = selected.length
      ? (value) => {
          clean?.();
          clean = undefined;
          if (value == null) return;
          const releases = [];
          let done = false;
          const release = () => {
            if (done) return;
            done = true;
            let first;
            for (const fn of releases)
              try {
                fn();
              } catch (error) {
                first ??= error;
              }
            if (first) throw first;
          };
          try {
            for (const ref of selected) {
              if (typeof ref === "function") {
                const returned = ref(value);
                releases.push(
                  typeof returned === "function" ? returned : () => ref(null),
                );
              } else {
                ref.current = value;
                releases.push(() => {
                  ref.current = null;
                });
              }
            }
          } catch (error) {
            try {
              release();
            } catch {}
            throw error;
          }
          clean = release;
          return release;
        }
      : null;
  }
  return memo.current;
}
