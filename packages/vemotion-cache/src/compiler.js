import {COMMENT, compile, middleware, serialize, stringify} from 'vstylis';
import isDevelopment from '#is-development';
import {compat, createUnsafeSelectorsAlarm, incorrectImportAlarm, removeLabel} from './plugins.js';

// Default server styles can be reused across requests, but never keep an
// unbounded process-wide history. Custom plugins may close over request state.
const storage = () => ({rules: new Map(), keys: [], cursor: 0});
const defaultRules = storage();
const COMPILED_RULE_LIMIT = 1024;
export class StyleCompiler {
  constructor(cache, plugins, defaults) {
    this.plugins = [compat, removeLabel];
    if (isDevelopment) this.plugins.push(createUnsafeSelectorsAlarm(cache), incorrectImportAlarm);
    this.plugins.push(...plugins, stringify);
    // Development diagnostics belong to the current cache too. Sharing a
    // production CSS result must not suppress another request's warnings.
    this.storage = defaults && !isDevelopment ? defaultRules : storage();
    this.previousSelector = this.previousStyles = this.previousCSS = undefined;
  }
  source(selector, styles) {return selector ? `${selector}{${styles}}` : styles;}
  server(selector, styles) {
    // Repeated insertion of the same CSS needs neither a concatenation nor a
    // hash lookup. Compare both inputs; a reused serialized name is irrelevant.
    if (selector === this.previousSelector && styles === this.previousStyles && this.previousCSS !== undefined) return this.previousCSS;
    const source = this.source(selector, styles);
    const store = this.storage;
    let css = store.rules.get(source);
    if (css === undefined) {
      css = serialize(compile(source), middleware(this.plugins));
      // FIFO eviction uses a bounded ring, without allocating a Map iterator
      // for every new style once the store is full.
      if (store.keys.length === COMPILED_RULE_LIMIT) {
        store.rules.delete(store.keys[store.cursor]);
        store.keys[store.cursor] = source;
        store.cursor = (store.cursor + 1) % COMPILED_RULE_LIMIT;
      } else store.keys.push(source);
      store.rules.set(source, css);
    }
    this.previousSelector = selector;
    this.previousStyles = styles;
    this.previousCSS = css;
    return css;
  }
  browser(selector, styles, sheet) {
    const map = isDevelopment ? styles.match(/\/\*#\ssourceMappingURL=data:application\/json;\S+\s+\*\//g)?.at(-1) : undefined;
    // The destination belongs to this invocation. A nested insertion cannot
    // replace an outer invocation's destination or source-map suffix.
    const emit = element => {
      if (element.root) return;
      const css = element.return || (isDevelopment && element.value && element.type !== COMMENT ? `${element.value}{}` : '');
      if (css) sheet.insert(css + (map || ''));
    };
    serialize(compile(this.source(selector, styles)), middleware([...this.plugins, emit]));
  }
}
