"use strict";
const {
  own,
  dataObject,
  copy,
  get,
  set,
  merge,
  Events,
} = require("./resources.cjs");
const {
  list,
  hierarchy,
  fallbackCodes,
  suffix,
  dir,
} = require("./language.cjs");
const EMPTY_OPTIONS = Object.freeze({});
const defaults = {
  fallbackLng: false,
  ns: ["translation"],
  defaultNS: ["translation"],
  keySeparator: ".",
  nsSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  ignoreJSONStructure: true,
  load: "all",
  initAsync: true,
};
const interpolationDefaults = {
  escapeValue: true,
  prefix: "{{",
  suffix: "}}",
  unescapePrefix: "-",
  formatSeparator: ",",
  skipOnVariables: true,
  maxReplaces: 1000,
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
      })[c],
  );
const selectorPath = Symbol("path");
function keyFromSelector(selector, options = {}) {
  const make = (parts) =>
    new Proxy(() => {}, {
      get: (_, key) =>
        key === selectorPath
          ? parts
          : key === Symbol.toPrimitive
            ? () => parts.join(options.keySeparator || ".")
            : make([...parts, String(key)]),
    });
  const result = selector(make([]));
  if (!result?.[selectorPath])
    throw new TypeError("Selector must return a translation key");
  return result[selectorPath].join(options.keySeparator || ".");
}
class I18n extends Events {
  constructor(options = {}, callback) {
    super();
    this.options = {
      ...defaults,
      ...options,
      interpolation: { ...interpolationDefaults, ...options.interpolation },
    };
    this.modules = { external: [] };
    this.isInitialized = false;
    this.language = undefined;
    this.languages = [];
    this.resolvedLanguage = undefined;
    this.store = new Events();
    this.store.data = dataObject();
    this.store.options = this.options;
    this.services = {
      resourceStore: this.store,
      logger: {
        warn: () => {},
        log: () => {},
        error: () => {},
        forward: () => {},
      },
      backendConnector: { state: dataObject() },
      languageUtils: {
        toResolveHierarchy: (lng, fallback) =>
          hierarchy(lng, {
            ...this.options,
            ...(fallback === undefined ? {} : { fallbackLng: fallback }),
          }),
        getFallbackCodes: fallbackCodes,
      },
      interpolator: {
        escape,
        interpolate: (str, data, lng, options) =>
          this._interpolate(str, data, lng, { ...this.options, ...options }),
      },
    };
    this.utils = {
      hasLoadedNamespace: (ns, o) => this.hasLoadedNamespace(ns, o),
    };
    for (const name of [
      "t",
      "exists",
      "init",
      "changeLanguage",
      "getFixedT",
      "loadNamespaces",
      "loadLanguages",
      "reloadResources",
      "addResource",
      "addResources",
      "addResourceBundle",
      "getResource",
      "getResourceBundle",
      "getDataByLanguage",
      "hasResourceBundle",
      "removeResourceBundle",
      "setDefaultNamespace",
      "dir",
      "hasLoadedNamespace",
      "use",
      "on",
      "off",
      "once",
    ])
      this[name] = this[name].bind(this);
    if (callback) this.init(options, callback);
  }
  use(plugin) {
    if (typeof plugin === "function") plugin = new plugin();
    if (!plugin?.type)
      throw new TypeError("A typed i18next plugin is required");
    if (plugin.type !== "3rdParty")
      throw new TypeError(
        "Only integration plugins are supported; resources must be supplied directly",
      );
    this.modules.external.push(plugin);
    return this;
  }
  init(options = {}, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    this.options = {
      ...defaults,
      ...this.options,
      ...options,
      ns: list(options.ns ?? this.options.ns),
      interpolation: {
        ...interpolationDefaults,
        ...this.options.interpolation,
        ...options.interpolation,
      },
    };
    if (options.defaultNS === undefined && options.ns)
      this.options.defaultNS = list(options.ns)[0];
    this.store.options = this.options;
    if (this.options.resources)
      for (const lng of Object.keys(this.options.resources))
        for (const ns of Object.keys(this.options.resources[lng]))
          this.addResourceBundle(lng, ns, this.options.resources[lng][ns]);
    for (const plugin of this.modules.external) plugin.init(this);
    const lng = this.options.lng || fallbackCodes(this.options.fallbackLng)[0];
    this._change(lng);
    this.isInitialized = true;
    this.emit("initialized", this.options);
    callback?.(null, this.t);
    return Promise.resolve(this.t);
  }
  _change(lng) {
    this.isLanguageChangingTo = lng;
    this.emit("languageChanging", lng);
    this.language = lng;
    this.languages = hierarchy(lng, this.options);
    this.resolvedLanguage = this.languages.find(
      (l) =>
        own(this.store.data, l) &&
        Object.keys(this.store.data[l]).some(
          (ns) => Object.keys(this.store.data[l][ns]).length,
        ),
    );
    this.isLanguageChangingTo = undefined;
    this.emit("languageChanged", lng);
  }
  changeLanguage(lng, callback) {
    this._change(lng || this.language);
    callback?.(null, this.t);
    return Promise.resolve(this.t);
  }
  getResource(lng, ns, key, options = {}) {
    return get(
      this.getResourceBundle(lng, ns),
      key,
      options.keySeparator ?? this.options.keySeparator,
    );
  }
  getResourceBundle(lng, ns = this.options.defaultNS) {
    return own(this.store.data, lng) && own(this.store.data[lng], ns)
      ? this.store.data[lng][ns]
      : undefined;
  }
  getDataByLanguage(lng) {
    return own(this.store.data, lng) ? this.store.data[lng] : undefined;
  }
  hasResourceBundle(lng, ns) {
    return this.getResourceBundle(lng, ns) !== undefined;
  }
  _bundle(lng, ns) {
    if (!own(this.store.data, lng)) this.store.data[lng] = dataObject();
    if (!own(this.store.data[lng], ns)) this.store.data[lng][ns] = {};
    if (!this.options.ns.includes(ns)) this.options.ns.push(ns);
    return this.store.data[lng][ns];
  }
  addResource(lng, ns, key, value, options = {}) {
    set(
      this._bundle(lng, ns),
      key,
      value,
      options.keySeparator ?? this.options.keySeparator,
    );
    if (!options.silent) this.store.emit("added", lng, ns, key, value);
    return this;
  }
  addResources(lng, ns, resources, options = {}) {
    for (const key of Object.keys(resources))
      this.addResource(lng, ns, key, resources[key], {
        ...options,
        silent: true,
      });
    if (!options.silent) this.store.emit("added", lng, ns, resources);
    return this;
  }
  addResourceBundle(
    lng,
    ns,
    resources,
    deep = false,
    overwrite = false,
    options = {},
  ) {
    const safe = copy(resources);
    merge(this._bundle(lng, ns), safe, deep, overwrite);
    if (!options.silent) this.store.emit("added", lng, ns, resources);
    return this;
  }
  removeResourceBundle(lng, ns) {
    if (own(this.store.data, lng)) delete this.store.data[lng][ns];
    this.store.emit("removed", lng, ns);
    return this;
  }
  hasLoadedNamespace() {
    return this.isInitialized;
  }
  loadNamespaces(names, callback) {
    for (const ns of list(names))
      if (!this.options.ns.includes(ns)) this.options.ns.push(ns);
    callback?.(null);
    return Promise.resolve();
  }
  loadLanguages(lngs, callback) {
    callback?.(null);
    return Promise.resolve();
  }
  reloadResources(lngs, names, callback) {
    if (typeof lngs === "function") callback = lngs;
    else if (typeof names === "function") callback = names;
    callback?.(null);
    return Promise.resolve();
  }
  setDefaultNamespace(ns) {
    this.options.defaultNS = ns;
  }
  dir(lng = this.resolvedLanguage || this.language) {
    return dir(lng);
  }
  _options(options, extra) {
    return typeof options === "string"
      ? { ...extra, defaultValue: options }
      : options || EMPTY_OPTIONS;
  }
  _resolve(keys, options, exists = false) {
    const o =
        options === EMPTY_OPTIONS
          ? this.options
          : {
              ...this.options,
              ...options,
              returnNull: this.options.returnNull,
              returnEmptyString: this.options.returnEmptyString,
            },
      languages = o.lngs
        ? list(o.lngs)
        : (!options.lng || options.lng === this.language) &&
            options.fallbackLng === undefined &&
            options.load === undefined &&
            options.supportedLngs === undefined &&
            options.lowerCaseLng === undefined &&
            options.nonExplicitSupportedLngs === undefined
          ? this.languages
          : hierarchy(options.lng || this.language, o);
    let result;
    for (const input of list(keys)) {
      const full =
        typeof input === "function" ? keyFromSelector(input, o) : String(input);
      let key = full,
        names = list(options.ns ?? o.defaultNS);
      if (o.nsSeparator && full.includes(o.nsSeparator)) {
        const at = full.indexOf(o.nsSeparator);
        names = [full.slice(0, at)];
        key = full.slice(at + o.nsSeparator.length);
      }
      names = [...names, ...list(o.fallbackNS)];
      for (const ns of names)
        for (const lng of languages.length ? languages : [undefined]) {
          const variants = [];
          const ctx =
            o.context !== undefined && o.context !== ""
              ? key + o.contextSeparator + o.context
              : undefined;
          const add = (base) => {
            if (typeof o.count === "number") {
              if (o.count === 0 && !o.ordinal)
                variants.push(base + o.pluralSeparator + "zero");
              variants.push(base + suffix(lng, o.count, o));
              if (o.ordinal)
                variants.push(
                  base + suffix(lng, o.count, o).replace("ordinal_", ""),
                );
            }
            variants.push(base);
          };
          if (ctx) add(ctx);
          add(key);
          for (const exact of variants) {
            const value = this.getResource(lng, ns, exact, o);
            result = {
              res: value,
              usedKey: key,
              exactUsedKey: exact,
              usedLng: lng,
              usedNS: ns,
            };
            if (
              value !== undefined &&
              (exists ||
                ((value !== null || o.returnNull) &&
                  (value !== "" || o.returnEmptyString)))
            )
              return result;
          }
        }
      if (!result)
        result = {
          res: undefined,
          usedKey: key,
          exactUsedKey: key,
          usedLng: languages.at(-1),
          usedNS: names.at(-1),
        };
    }
    return (
      result || {
        res: undefined,
        usedKey: "",
        exactUsedKey: "",
        usedLng: languages.at(-1),
        usedNS: list(o.defaultNS)[0],
      }
    );
  }
  exists(key, options) {
    return this._resolve(key, options || EMPTY_OPTIONS, true).res !== undefined;
  }
  _interpolate(text, data, lng, options) {
    const o = { ...this.options.interpolation, ...options.interpolation };
    const prefix = o.prefix,
      suffixText = o.suffix;
    if (!prefix || !suffixText)
      throw new RangeError("Interpolation delimiters cannot be empty");
    let out = "",
      pos = 0,
      replacements = 0;
    while (pos < text.length) {
      const start = text.indexOf(prefix, pos);
      if (start < 0) {
        out += text.slice(pos);
        break;
      }
      const end = text.indexOf(suffixText, start + prefix.length);
      if (end < 0) {
        out += text.slice(pos);
        break;
      }
      out += text.slice(pos, start);
      let key = text.slice(start + prefix.length, end).trim(),
        raw = false;
      if (key.startsWith(o.unescapePrefix)) {
        raw = true;
        key = key.slice(o.unescapePrefix.length).trim();
      }
      const comma = key.indexOf(o.formatSeparator);
      const format = comma < 0 ? undefined : key.slice(comma + 1).trim();
      if (comma >= 0) key = key.slice(0, comma).trim();
      let value = get(data, key, ".");
      if (value === undefined) value = get(o.defaultVariables, key, ".");
      if (value !== undefined && format)
        value = this._format(value, format, lng, options);
      out +=
        value === undefined
          ? text.slice(start, end + suffixText.length)
          : raw || o.escapeValue === false
            ? String(value ?? "")
            : escape(value ?? "");
      pos = end + suffixText.length;
      if (++replacements >= o.maxReplaces) {
        out += text.slice(pos);
        break;
      }
    }
    return out;
  }
  _format(value, format, lng, options) {
    if (options.interpolation?.format)
      return options.interpolation.format(value, format, lng, options);
    if (format === "number")
      return new Intl.NumberFormat(lng, options.formatParams?.[format]).format(
        value,
      );
    if (format === "datetime")
      return new Intl.DateTimeFormat(lng).format(value);
    if (format === "uppercase") return String(value).toUpperCase();
    return value;
  }
  _translate(key, options, extra, depth = 0) {
    if (depth > 32)
      throw new RangeError("Translation nesting exceeds 32 levels");
    options = this._options(options, extra);
    const o =
        options === EMPTY_OPTIONS
          ? this.options
          : {
              ...this.options,
              ...options,
              returnNull: this.options.returnNull,
              returnEmptyString: this.options.returnEmptyString,
            },
      result = this._resolve(key, options);
    let value = result.res;
    if (
      value === undefined ||
      (value === null && !o.returnNull) ||
      (value === "" && !o.returnEmptyString)
    ) {
      let fallback = o.defaultValue;
      if (typeof o.count === "number")
        fallback =
          o[
            "defaultValue" + suffix(options.lng || this.language, o.count, o)
          ] ?? fallback;
      value = fallback === undefined ? result.usedKey : fallback;
    }
    if (value && typeof value === "object") {
      if (Array.isArray(value) && typeof o.joinArrays === "string")
        value = value.join(o.joinArrays);
      else if (o.returnObjects) {
        const converted = Array.isArray(value) ? [] : {};
        for (const k of Object.keys(value))
          Object.defineProperty(converted, k, {
            value:
              o.keySeparator && typeof value[k] === "string"
                ? this._interpolate(
                    value[k],
                    o.replace || options,
                    result.usedLng,
                    o,
                  )
                : copy(value[k]),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        value = converted;
      } else value = o.defaultValue ?? result.usedKey;
    }
    if (typeof value === "string") {
      if (o.skipInterpolation !== true) {
        value = value.replace(/\$t\(([^()]*)\)/g, (_, nested) =>
          this._translate(
            nested.trim(),
            { ...options, ns: result.usedNS, returnDetails: false },
            undefined,
            depth + 1,
          ),
        );
        value = this._interpolate(
          value,
          o.replace || options,
          result.usedLng,
          o,
        );
      }
    }
    if (o.returnDetails) {
      const usedParams = {};
      for (const k of Object.keys(options))
        if (
          ![
            "lng",
            "lngs",
            "ns",
            "defaultValue",
            "returnDetails",
            "keyPrefix",
            "interpolation",
            "returnObjects",
            "joinArrays",
            "ordinal",
            "fallbackLng",
          ].includes(k)
        )
          usedParams[k] = options[k];
      return { ...result, res: value, usedParams };
    }
    return value;
  }
  t(key, options, extra) {
    return this._translate(key, options, extra);
  }
  getFixedT(lng, ns, keyPrefix, scope) {
    const fixed = (key, options, extra) => {
      const o = this._options(options, extra),
        prefix = o.keyPrefix === undefined ? keyPrefix : o.keyPrefix;
      const keys = prefix
        ? list(key).map((k) => prefix + (this.options.keySeparator || ".") + k)
        : key;
      return this.t(keys, {
        ...scope,
        ...(Array.isArray(lng) ? { lngs: lng } : { lng }),
        ns,
        ...o,
      });
    };
    fixed.lng = lng;
    fixed.ns = ns;
    fixed.keyPrefix = keyPrefix;
    return fixed;
  }
  cloneInstance(options = {}, callback) {
    const clone = new I18n({
      ...this.options,
      lng: this.language,
      ...options,
      resources: options.forkResourceStore
        ? copy(this.store.data)
        : this.store.data,
    });
    clone.init({});
    if (!options.forkResourceStore) clone.store = this.store;
    clone.services.resourceStore = clone.store;
    callback?.(null, clone.t);
    return clone;
  }
  toJSON() {
    return {
      options: this.options,
      store: this.store,
      language: this.language,
      languages: this.languages,
      resolvedLanguage: this.resolvedLanguage,
    };
  }
}
const instance = new I18n();
instance.createInstance = (options, callback) => new I18n(options, callback);
instance.keyFromSelector = keyFromSelector;
module.exports = instance;
