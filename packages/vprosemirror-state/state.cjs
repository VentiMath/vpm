"use strict";
const { Selection } = require("./selection.cjs"),
  { Transaction } = require("./transaction.cjs");
function configuration(schema, source = []) {
  const plugins = Array.from(source),
    pluginsByKey = Object.create(null),
    statePlugins = [],
    appendPlugins = [];
  for (let index = 0; index < plugins.length; index++) {
    const plugin = plugins[index];
    if (Object.hasOwn(pluginsByKey, plugin.key))
      throw new RangeError("Duplicate plugin key: " + plugin.key);
    pluginsByKey[plugin.key] = plugin;
    if (plugin.spec.state) statePlugins.push(plugin);
    if (plugin.spec.appendTransaction) appendPlugins.push({ plugin, index });
  }
  return { schema, plugins, pluginsByKey, statePlugins, appendPlugins };
}
class EditorState {
  constructor(config) {
    this.config = config;
  }
  get schema() {
    return this.config.schema;
  }
  get plugins() {
    return this.config.plugins;
  }
  get tr() {
    return new Transaction(this);
  }
  static create(options) {
    const schema = options.doc?.type.schema || options.schema;
    if (!schema) throw new RangeError("A schema or document is required");
    const state = new EditorState(configuration(schema, options.plugins));
    state.doc = options.doc || schema.topNodeType.createAndFill();
    if (!state.doc)
      throw new RangeError("Schema cannot create a default document");
    state.selection = options.selection || Selection.atStart(state.doc);
    state.storedMarks = options.storedMarks || null;
    state.scrollToSelection = 0;
    for (const p of state.config.statePlugins)
      state[p.key] = p.spec.state.init.call(p, options, state);
    return state;
  }
  apply(tr) {
    return this.applyTransaction(tr).state;
  }
  filterTransaction(tr, ignore = -1) {
    for (let i = 0; i < this.plugins.length; i++) {
      const p = this.plugins[i];
      if (
        i !== ignore &&
        p.spec.filterTransaction &&
        !p.spec.filterTransaction.call(p, tr, this)
      )
        return false;
    }
    return true;
  }
  applyInner(tr) {
    if (!tr.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    const next = new EditorState(this.config);
    next.doc = tr.doc;
    next.selection = tr.selection;
    next.storedMarks = next.selection.$cursor ? tr.storedMarks : null;
    next.scrollToSelection =
      this.scrollToSelection + (tr.scrolledIntoView ? 1 : 0);
    for (const p of this.config.statePlugins)
      next[p.key] = p.spec.state.apply.call(p, tr, this[p.key], this, next);
    return next;
  }
  applyTransaction(root) {
    if (!this.filterTransaction(root)) return { state: this, transactions: [] };
    const transactions = [root];
    let state = this.applyInner(root);
    const hooks = this.config.appendPlugins;
    if (!hooks.length) return { state, transactions };
    const seen = hooks.map(() => ({ count: 0, state: this }));
    for (;;) {
      let added = false;
      for (let i = 0; i < hooks.length; i++) {
        const { plugin: p, index } = hooks[i],
          record = seen[i];
        if (record.count === transactions.length) continue;
        const extra = p.spec.appendTransaction.call(
          p,
          transactions.slice(record.count),
          record.state,
          state,
        );
        if (extra && state.filterTransaction(extra, index)) {
          extra.setMeta("appendedTransaction", root);
          state = state.applyInner(extra);
          transactions.push(extra);
          added = true;
        }
        record.count = transactions.length;
        record.state = state;
      }
      if (!added) return { state, transactions };
    }
  }
  reconfigure(options) {
    const next = new EditorState(configuration(this.schema, options.plugins));
    next.doc = this.doc;
    next.selection = this.selection;
    next.storedMarks = this.storedMarks;
    next.scrollToSelection = this.scrollToSelection;
    for (const p of next.config.statePlugins)
      next[p.key] = Object.hasOwn(this, p.key)
        ? this[p.key]
        : p.spec.state.init.call(p, options, next);
    return next;
  }
  toJSON(fields) {
    const result = {
      doc: this.doc.toJSON(),
      selection: this.selection.toJSON(),
    };
    if (this.storedMarks)
      result.storedMarks = this.storedMarks.map((m) => m.toJSON());
    if (fields && typeof fields === "object")
      for (const name of Object.keys(fields)) {
        if (name === "doc" || name === "selection")
          throw new RangeError("Reserved state JSON field: " + name);
        const p = fields[name];
        if (p.spec.state?.toJSON)
          Object.defineProperty(result, name, {
            value: p.spec.state.toJSON.call(p, this[p.key]),
            enumerable: true,
            writable: true,
            configurable: true,
          });
      }
    return result;
  }
  static fromJSON(options, json, fields) {
    if (!json || !options.schema)
      throw new RangeError("State JSON and schema are required");
    const state = new EditorState(
      configuration(options.schema, options.plugins),
    );
    state.doc = options.schema.nodeFromJSON(json.doc);
    state.selection = Selection.fromJSON(state.doc, json.selection);
    state.storedMarks = json.storedMarks
      ? json.storedMarks.map((m) => options.schema.markFromJSON(m))
      : null;
    state.scrollToSelection = 0;
    for (const p of state.plugins) {
      if (!p.spec.state) continue;
      const field = Object.keys(fields || {}).find(
        (name) => fields[name] === p && Object.hasOwn(json, name),
      );
      state[p.key] =
        field !== undefined && p.spec.state.fromJSON
          ? p.spec.state.fromJSON.call(p, options, json[field], state)
          : p.spec.state.init.call(p, options, state);
    }
    return state;
  }
}
module.exports = { EditorState };
