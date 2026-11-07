"use strict";
const keys = new Map();
function keyFor(name) {
  const count = keys.get(name) || 0;
  keys.set(name, count + 1);
  return name + "$" + (count ? count : "");
}
function bindProps(props, plugin) {
  const result = {};
  for (const key of Object.keys(props || {})) {
    const value = props[key];
    Object.defineProperty(result, key, {
      value:
        typeof value === "function"
          ? value.bind(plugin)
          : key === "handleDOMEvents"
            ? bindProps(value, plugin)
            : value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}
class Plugin {
  constructor(spec) {
    this.spec = spec;
    this.key = spec.key ? spec.key.key : keyFor("plugin");
    this.props = bindProps(spec.props, this);
  }
  getState(state) {
    return state[this.key];
  }
}
class PluginKey {
  constructor(name = "key") {
    this.key = keyFor(name);
  }
  get(state) {
    return state.config.pluginsByKey[this.key];
  }
  getState(state) {
    return state[this.key];
  }
}
module.exports = { Plugin, PluginKey };
