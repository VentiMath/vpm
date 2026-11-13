"use strict";
const React = require("react"),
  dom = require("./dom.cjs"),
  data = require("./data.cjs");
const useEnhancedEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
function useControlled({ controlled, default: initial }) {
  const fixed = React.useRef(controlled !== undefined).current;
  const [value, setValue] = React.useState(initial);
  const set = React.useCallback(
    (v) => {
      if (!fixed) setValue(v);
    },
    [fixed],
  );
  return [fixed ? controlled : value, set];
}
function useEventCallback(fn) {
  const latest = React.useRef(fn);
  useEnhancedEffect(() => {
    latest.current = fn;
  });
  return React.useMemo(
    () =>
      function (...args) {
        return latest.current?.apply(this, args);
      },
    [],
  );
}
function useForkRef(...refs) {
  return React.useMemo(() => {
    if (refs.every((r) => r == null)) return null;
    let dispose;
    return (node) => {
      if (dispose) {
        const old = dispose;
        dispose = undefined;
        old();
      }
      if (node === null) return;
      const cleanups = [];
      let firstError;
      for (const ref of refs) {
        try {
          const cleanup = dom.setRef(ref, node);
          cleanups.push(
            typeof cleanup === "function"
              ? cleanup
              : () => {
                  if (typeof ref === "function") ref(null);
                  else if (ref?.current === node) ref.current = null;
                },
          );
        } catch (e) {
          firstError ??= e;
        }
      }
      let live = true;
      const cleanup = () => {
        if (!live) return;
        live = false;
        let error;
        for (const fn of cleanups)
          try {
            fn();
          } catch (e) {
            error ??= e;
          }
        if (dispose === cleanup) dispose = undefined;
        if (error) throw error;
      };
      dispose = cleanup;
      if (firstError) {
        cleanup();
        throw firstError;
      }
      return cleanup;
    };
  }, refs);
}
const useId = (override) => {
  const id = React.useId();
  return override ?? id;
};
const EMPTY = Symbol("uninitialized");
function useLazyRef(init, arg) {
  const ref = React.useRef(EMPTY);
  if (ref.current === EMPTY) ref.current = init(arg);
  return ref;
}
function useTimeout() {
  const ref = useLazyRef(dom.Timeout.create);
  React.useEffect(ref.current.disposeEffect, []);
  return ref.current;
}
const useOnMount = (fn) => React.useEffect(fn, []);
function usePreviousProps(value) {
  const ref = React.useRef({});
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
function useForcedRerendering() {
  const [, force] = React.useReducer((n) => n + 1, 0);
  return force;
}
function useValueAsRef(value) {
  const ref = useLazyRef(() => {
    const state = {
      current: value,
      next: value,
      effect: () => {
        state.current = state.next;
      },
    };
    return state;
  });
  ref.current.next = value;
  useEnhancedEffect(() => ref.current.effect());
  return ref.current;
}
function useIsFocusVisible() {
  const isFocusVisibleRef = React.useRef(false);
  return {
    isFocusVisibleRef,
    ref: React.useCallback(() => {}, []),
    onFocus: React.useCallback((e) => {
      const visible = dom.isFocusVisible(e.target);
      isFocusVisibleRef.current = visible;
      return visible;
    }, []),
    onBlur: React.useCallback(() => {
      const previous = isFocusVisibleRef.current;
      isFocusVisibleRef.current = false;
      return previous;
    }, []),
  };
}
function useSlotProps({
  elementType,
  ownerState,
  externalSlotProps,
  skipResolvingSlotProps = false,
  ...rest
}) {
  const resolved = skipResolvingSlotProps
    ? {}
    : data.resolveComponentProps(externalSlotProps, ownerState);
  const merged = data.mergeSlotProps({ ...rest, externalSlotProps: resolved });
  const ref = useForkRef(
    merged.internalRef,
    resolved?.ref,
    rest.additionalProps?.ref,
  );
  return data.appendOwnerState(
    elementType,
    { ...merged.props, ref },
    ownerState,
  );
}
const teardown = () => {};
module.exports = {
  teardown,
  useEnhancedEffect,
  useControlled,
  useEventCallback,
  useForkRef,
  useId,
  useLazyRef,
  useTimeout,
  useOnMount,
  usePreviousProps,
  useForcedRerendering,
  useValueAsRef,
  useIsFocusVisible,
  useSlotProps,
};
