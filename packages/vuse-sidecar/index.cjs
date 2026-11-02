"use strict";
const React = require("react");
const { env } = require("./env.cjs");
const { createMedium, createSidecarMedium } = require("./medium.cjs");
const config = { onError: (error) => console.error(error) };
const cache = new WeakMap();
const noMedium = {};
function remembered(importer, medium) {
  return cache.get(importer)?.get(medium || noMedium);
}
function remember(importer, medium, component) {
  let targets = cache.get(importer);
  if (!targets) cache.set(importer, (targets = new WeakMap()));
  targets.set(medium || noMedium, component);
}
function useSidecar(importer, medium) {
  const disabled = env.isNode && !medium?.options?.ssr;
  const immediate = env.forceCache || env.isNode || !medium?.options?.async;
  const [loaded, setLoaded] = React.useState(() => ({
    importer,
    medium,
    component: immediate ? remembered(importer, medium) : undefined,
    error: null,
  }));
  const matching = loaded.importer === importer && loaded.medium === medium;
  const component = matching
    ? loaded.component
    : immediate
      ? remembered(importer, medium)
      : undefined;
  React.useEffect(() => {
    if (disabled || component) return;
    let current = true;
    Promise.resolve()
      .then(importer)
      .then((module) => {
        const target = medium ? medium.read() : module?.default || module;
        if (!target)
          throw Error(
            medium
              ? "Sidecar medium was not found"
              : "Sidecar was not found in exports",
          );
        if (!current) return;
        remember(importer, medium, target);
        setLoaded({ importer, medium, component: target, error: null });
      })
      .catch((error) => {
        if (current) {
          setLoaded({ importer, medium, component: undefined, error });
          try {
            config.onError?.(error);
          } catch (reportError) {
            console.error(reportError);
          }
        }
      });
    return () => {
      current = false;
    };
  }, [importer, medium, disabled, component]);
  return disabled ? [null, null] : [component, matching ? loaded.error : null];
}
function sidecar(importer, fallback) {
  return function Sidecar(props) {
    const [Component, error] = useSidecar(importer, props.sideCar);
    return error
      ? (fallback ?? null)
      : Component
        ? React.createElement(Component, props)
        : null;
  };
}
function ExportedSidecar({ sideCar, ...props }) {
  if (!sideCar) throw Error("Sidecar: please provide `sideCar` property");
  const Target = sideCar.read();
  if (!Target) throw Error("Sidecar medium not found");
  return React.createElement(Target, props);
}
ExportedSidecar.isSideCarExport = true;
function exportSidecar(medium, Component) {
  medium.useMedium(Component);
  return ExportedSidecar;
}
// Publication is a component effect, never a hook called inside a render prop.
function Publish({ channel, values }) {
  React.useLayoutEffect(() => channel.update({ values }));
  return null;
}
const RenderOutput = React.memo(function RenderOutput({ channel }) {
  const snapshot = React.useSyncExternalStore(
    channel.subscribe,
    channel.snapshot,
    channel.snapshot,
  );
  return snapshot.children(...snapshot.values);
});
function renderCar(Component, defaults) {
  return function RenderCar(props) {
    const [channel] = React.useState(() => {
      let current = { values: defaults(props), children: props.children };
      const subscribers = new Set();
      return {
        snapshot: () => current,
        subscribe: (listener) => {
          subscribers.add(listener);
          return () => subscribers.delete(listener);
        },
        update: (patch) => {
          current = { ...current, ...patch };
          for (const listener of subscribers) listener();
        },
      };
    });
    const relay = React.useCallback(
      (...values) => React.createElement(Publish, { channel, values }),
      [channel],
    );
    React.useLayoutEffect(() => {
      if (channel.snapshot().children !== props.children)
        channel.update({ children: props.children });
    }, [channel, props.children]);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Component, { ...props, children: relay }),
      React.createElement(RenderOutput, { channel }),
    );
  };
}
function setConfig(options) {
  Object.assign(config, options);
}
Object.assign(exports, {
  sidecar,
  useSidecar,
  setConfig,
  createMedium,
  createSidecarMedium,
  renderCar,
  exportSidecar,
});
