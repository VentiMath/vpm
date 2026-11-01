import {StyleSheet} from 'vemotion-sheet';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {StyleCompiler} from './src/compiler.js';
import {readHydration} from './src/hydration.js';
import {prefixer} from './src/prefixer.js';
export {prefixer};

// Keep the legacy renderer's method without inheriting Object.prototype's
// other names as styles. The method is non-enumerable, like the original.
const insertedPrototype = Object.create(null, {
  hasOwnProperty: {value: Object.prototype.hasOwnProperty, writable: true},
});

export default function createCache(options) {
  const {key} = options;
  if (isDevelopment && !key) throw new Error("You have to configure `key` for your cache. Please make sure it's unique (and not equal to 'css') as it's used for linking styles to your cache.\nIf multiple caches share the same key they might \"fight\" for each other's style elements.");
  if (isDevelopment && /[^a-z-]/.test(key)) throw new Error(`Emotion key must only contain lower case alphabetical characters and - but "${key}" was passed`);
  const container = isBrowser ? options.container || document.head : undefined;
  const sheet = new StyleSheet({...options, container});
  const inserted = Object.create(insertedPrototype);
  const cache = {key, sheet, nonce: options.nonce, inserted, registered: Object.create(null)};
  const compiler = new StyleCompiler(cache, options.stylisPlugins || [prefixer], !options.stylisPlugins);
  cache.insert = (selector, serialized, destination, shouldCache) => {
    if (isBrowser) {
      compiler.browser(selector, serialized.styles, destination);
      if (shouldCache) cache.inserted[serialized.name] = true;
      return;
    }
    const rules = compiler.server(selector, serialized.styles);
    const legacy = cache.compat !== undefined;
    if (shouldCache) cache.inserted[serialized.name] = legacy ? rules : true;
    if (legacy) return shouldCache ? undefined : rules;
    const map = isDevelopment ? serialized.styles.match(/\/\*#\ssourceMappingURL=data:application\/json;\S+\s+\*\//g)?.at(-1) : undefined;
    return rules + (map || '');
  };
  if (isBrowser) {
    const hydration = readHydration(container.ownerDocument || document, key);
    for (const name of hydration.names) cache.inserted[name] = true;
    sheet.hydrate(hydration.nodes);
  }
  return cache;
}
