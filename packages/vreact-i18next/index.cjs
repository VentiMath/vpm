"use strict";
const React = require("react");
const I18nContext = React.createContext(undefined);
let globalInstance;
let defaults = {
  bindI18n: "languageChanged",
  bindI18nStore: "",
  useSuspense: true,
  nsMode: "default",
};
const getI18n = () => globalInstance;
const setI18n = (instance) => {
  globalInstance = instance;
};
const getDefaults = () => defaults;
const setDefaults = (options) => {
  defaults = { ...defaults, ...options };
};
const initReactI18next = { type: "3rdParty", init: setI18n };
function I18nextProvider({ i18n, defaultNS, children }) {
  const value = React.useMemo(() => ({ i18n, defaultNS }), [i18n, defaultNS]);
  return React.createElement(I18nContext.Provider, { value }, children);
}
const missingT = (key, options, extra) =>
  typeof options === "string"
    ? options
    : (options?.defaultValue ?? (Array.isArray(key) ? key.at(-1) : key));
const missingInstance = {};
const missing = Object.assign([missingT, missingInstance, false], {
  t: missingT,
  i18n: missingInstance,
  ready: false,
});
const pendingLoads = new WeakMap();
function load(instance, names, lng) {
  let pending = pendingLoads.get(instance);
  if (!pending) pendingLoads.set(instance, (pending = new Map()));
  const key = JSON.stringify([names, lng]);
  if (pending.has(key)) return pending.get(key);
  let finish;
  const promise = new Promise((resolve) => {
    finish = resolve;
  });
  pending.set(key, promise);
  const done = () => {
    if (!instance.isInitialized && !instance.initializedStoreOnce) {
      instance.once("initialized", done);
      return;
    }
    pending.delete(key);
    finish();
  };
  try {
    if (lng) {
      const raw = instance.options.ns;
      const configured = (instance.options.ns = Array.isArray(raw)
        ? raw.slice()
        : raw
          ? [raw]
          : []);
      for (const name of names)
        if (!configured.includes(name)) configured.push(name);
      instance.loadLanguages(lng, done);
    } else instance.loadNamespaces(names, done);
  } catch (error) {
    pending.delete(key);
    finish();
    throw error;
  }
  return promise;
}
function useTranslation(namespace, options = {}) {
  const context = React.useContext(I18nContext),
    instance = options.i18n || context?.i18n || globalInstance;
  const config = { ...defaults, ...instance?.options?.react, ...options };
  const rawNames =
    namespace ??
    context?.defaultNS ??
    instance?.options?.defaultNS ??
    "translation";
  const namespaceKey = JSON.stringify(
    Array.isArray(rawNames) ? rawNames : [rawNames],
  );
  const names = React.useMemo(() => JSON.parse(namespaceKey), [namespaceKey]);
  const prefix = config.keyPrefix;
  if (prefix !== undefined && typeof prefix !== "string")
    throw new TypeError("vreact-i18next uses string key prefixes");
  const cache = React.useRef(),
    revision = React.useRef(0);
  const [, wake] = React.useReducer((n) => n + 1, 0);
  const subscribe = React.useCallback(
    (notify) => {
      if (!instance) return () => {};
      const changed = () => {
        revision.current++;
        notify();
      };
      if (config.bindI18n) instance.on(config.bindI18n, changed);
      if (config.bindI18nStore)
        instance.store.on(config.bindI18nStore, changed);
      return () => {
        if (config.bindI18n) instance.off(config.bindI18n, changed);
        if (config.bindI18nStore)
          instance.store.off(config.bindI18nStore, changed);
      };
    },
    [instance, config.bindI18n, config.bindI18nStore],
  );
  const snapshot = React.useCallback(() => {
    if (!instance) return missing;
    const ready =
      Boolean(instance.isInitialized || instance.initializedStoreOnce) &&
      names.every((n) => instance.hasLoadedNamespace(n, { lng: config.lng }));
    const lng = config.lng || instance.language,
      current = cache.current;
    if (
      current &&
      current.instance === instance &&
      current.names === namespaceKey &&
      current.prefix === prefix &&
      current.mode === config.nsMode &&
      current.lng === lng &&
      current.ready === ready &&
      current.revision === revision.current
    )
      return current.value;
    const t = instance.getFixedT(
      lng,
      config.nsMode === "fallback" ? names : names[0],
      prefix,
      { scopeNs: names },
    );
    const value = Object.assign([t, instance, ready], {
      t,
      i18n: instance,
      ready,
    });
    cache.current = {
      instance,
      names: namespaceKey,
      prefix,
      mode: config.nsMode,
      lng,
      ready,
      revision: revision.current,
      value,
    };
    return value;
  }, [instance, names, namespaceKey, prefix, config.nsMode, config.lng]);
  const value = React.useSyncExternalStore(subscribe, snapshot, snapshot);
  React.useEffect(() => {
    if (!instance || value.ready || config.useSuspense) return;
    let active = true;
    load(instance, names, config.lng).then(() => {
      if (active) {
        revision.current++;
        wake();
      }
    });
    return () => {
      active = false;
    };
  }, [instance, names, config.lng, config.useSuspense, value.ready]);
  if (instance && !value.ready && config.useSuspense)
    throw load(instance, names, config.lng);
  return value;
}
module.exports = {
  I18nContext,
  I18nextProvider,
  initReactI18next,
  useTranslation,
  getI18n,
  setI18n,
  getDefaults,
  setDefaults,
};
