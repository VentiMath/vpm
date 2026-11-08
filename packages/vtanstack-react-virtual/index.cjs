"use client";
"use strict";
const React = require("react");
const { flushSync } = require("react-dom");
const core = require("vtanstack-virtual-core");
const noContainerWrites = () => {};
const defaultWindow = () => (typeof window === "undefined" ? null : window);
const initialWindowOffset = () => defaultWindow()?.scrollY ?? 0;

function useAdapter(options, defaults) {
  if (options.directDomUpdates)
    throw new RangeError(
      "This adapter keeps item and container styles owned by React; directDomUpdates is unsupported",
    );
  const {
    useFlushSync,
    directDomUpdates,
    directDomUpdatesMode,
    ...configuration
  } = options;
  for (const key of Object.keys(defaults))
    if (configuration[key] === undefined) configuration[key] = defaults[key];
  const [, invalidate] = React.useReducer((value) => value + 1, 0);
  const [binding] = React.useState(() => {
    const state = { live: true, inSetup: false, committed: options };
    state.notify = (instance, sync) => {
      if (!state.live) return;
      // Only committed handlers/flush policy may receive events from the live
      // scroll owner. An abandoned concurrent render must not publish either.
      if (sync && state.committed.useFlushSync !== false && !state.inSetup)
        flushSync(invalidate);
      else invalidate();
      state.committed.onChange?.(instance, sync);
    };
    state.instance = new core.Virtualizer({
      ...configuration,
      onChange: state.notify,
    });
    state.instance.containerRef = noContainerWrites;
    return state;
  });
  binding.instance.setOptions({ ...configuration, onChange: binding.notify });
  React.useInsertionEffect(() => {
    binding.committed = options;
  });
  const useCommit =
    typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
  useCommit(() => {
    binding.live = true;
    const stop = binding.instance._didMount();
    return () => {
      binding.live = false;
      stop();
    };
  }, [binding]);
  useCommit(() => {
    binding.inSetup = true;
    try {
      binding.instance._willUpdate();
    } finally {
      binding.inSetup = false;
    }
  });
  return binding.instance;
}
const elementDefaults = {
  observeElementRect: core.observeElementRect,
  observeElementOffset: core.observeElementOffset,
  scrollToFn: core.elementScroll,
};
const windowDefaults = {
  observeElementRect: core.observeWindowRect,
  observeElementOffset: core.observeWindowOffset,
  scrollToFn: core.windowScroll,
  getScrollElement: defaultWindow,
  initialOffset: initialWindowOffset,
};
function useVirtualizer(options) {
  return useAdapter(options, elementDefaults);
}
function useWindowVirtualizer(options) {
  return useAdapter(options, windowDefaults);
}
module.exports = { ...core, useVirtualizer, useWindowVirtualizer };
