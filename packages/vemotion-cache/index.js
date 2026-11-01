import {StyleSheet} from 'vemotion-sheet';
import memoize from 'vemotion-memoize';
import weakMemoize from 'vemotion-weak-memoize';
import {COMMENT, compile, middleware, rulesheet, serialize, stringify} from 'vstylis';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {compat, createUnsafeSelectorsAlarm, incorrectImportAlarm, removeLabel} from './src/plugins.js';
import {prefixer} from './src/prefixer.js';

export {prefixer};

const defaultStylisPlugins = [prefixer];

// On the server, compiled rules are shared by every cache with the same
// plugins and key: requests create caches, and the CSS of a style is the same
// in each.
const getServerStylisCache = isBrowser ? undefined : weakMemoize(() => memoize(() => ({})));

/** The last inline source map in development styles (from the Babel plugin). */
const SOURCE_MAP = /\/\*#\ssourceMappingURL=data:application\/json;\S+\s+\*\//g;
const getSourceMap = isDevelopment
  ? styles => {
      const maps = styles.match(SOURCE_MAP);
      return maps ? maps[maps.length - 1] : undefined;
    }
  : undefined;

/**
 * Moves style elements rendered by Emotion 11 on the server (their
 * data-emotion has a space before the class names) into the head, out of
 * React's way during hydration. Every key's: a cache may be created during a
 * render. Emotion 10's and client-inserted elements are left alone.
 */
function moveServerStyles() {
  for (const node of document.querySelectorAll('style[data-emotion]:not([data-s])')) {
    if (!node.getAttribute('data-emotion').includes(' ')) continue;
    document.head.appendChild(node);
    node.setAttribute('data-s', '');
  }
}

/**
 * Creates a cache: where a set of components inserts its styles, with a key
 * for class names (`key-name`), the stylis plugins styles go through, and the
 * container, nonce and insertion point of its style elements.
 * @param {{key: string, nonce?: string, stylisPlugins?: Function[], container?: Node, speedy?: boolean, prepend?: boolean, insertionPoint?: HTMLElement}} options
 */
export default function createCache(options) {
  const key = options.key;
  if (isDevelopment && !key) {
    throw new Error(
      "You have to configure `key` for your cache. Please make sure it's unique (and not equal to 'css') as it's used for linking styles to your cache.\n" +
        `If multiple caches share the same key they might "fight" for each other's style elements.`,
    );
  }
  if (isBrowser && key === 'css') moveServerStyles();
  const stylisPlugins = options.stylisPlugins || defaultStylisPlugins;
  if (isDevelopment && /[^a-z-]/.test(key)) {
    throw new Error(`Emotion key must only contain lower case alphabetical characters and - but "${key}" was passed`);
  }

  const inserted = {};
  let container;
  const nodesToHydrate = [];
  if (isBrowser) {
    container = options.container || document.head;
    // This key's server-rendered elements: their styles are already inserted.
    for (const node of document.querySelectorAll(`style[data-emotion^="${key} "]`)) {
      for (const name of node.getAttribute('data-emotion').split(' ').slice(1)) inserted[name] = true;
      nodesToHydrate.push(node);
    }
  }

  const omnipresentPlugins = [compat, removeLabel];
  if (isDevelopment) {
    omnipresentPlugins.push(
      createUnsafeSelectorsAlarm({
        get compat() {
          return cache.compat;
        },
      }),
      incorrectImportAlarm,
    );
  }

  let insert;
  if (!getServerStylisCache) {
    // The browser: each top-level rule goes to the sheet. In development a
    // rule without content is still inserted (empty), so @emotion/jest can
    // find the cache's key in the document.
    let currentSheet;
    const finalizingPlugins = [
      stringify,
      isDevelopment
        ? element => {
            if (element.root) return;
            if (element.return) currentSheet.insert(element.return);
            else if (element.value && element.type !== COMMENT) currentSheet.insert(`${element.value}{}`);
          }
        : rulesheet(rule => currentSheet.insert(rule)),
    ];
    const serializer = middleware(omnipresentPlugins.concat(stylisPlugins, finalizingPlugins));
    const stylis = styles => serialize(compile(styles), serializer);
    insert = (selector, serialized, sheet, shouldCache) => {
      currentSheet = sheet;
      const sourceMap = getSourceMap?.(serialized.styles);
      if (sourceMap) currentSheet = {insert: rule => sheet.insert(rule + sourceMap)};
      stylis(selector ? `${selector}{${serialized.styles}}` : serialized.styles);
      if (shouldCache) cache.inserted[serialized.name] = true;
    };
  } else {
    // The server: rules are returned, to be rendered in style elements (or,
    // in compat mode, kept on the cache for @emotion/server to extract).
    const serializer = middleware(omnipresentPlugins.concat(stylisPlugins, [stringify]));
    const stylis = styles => serialize(compile(styles), serializer);
    const serverStylisCache = getServerStylisCache(stylisPlugins)(key);
    const getRules = (selector, serialized) => {
      const name = serialized.name;
      if (serverStylisCache[name] === undefined) serverStylisCache[name] = stylis(selector ? `${selector}{${serialized.styles}}` : serialized.styles);
      return serverStylisCache[name];
    };
    insert = (selector, serialized, sheet, shouldCache) => {
      const name = serialized.name;
      const rules = getRules(selector, serialized);
      if (cache.compat === undefined) {
        if (shouldCache) cache.inserted[name] = true;
        const sourceMap = getSourceMap?.(serialized.styles);
        return sourceMap ? rules + sourceMap : rules;
      }
      if (shouldCache) cache.inserted[name] = rules;
      else return rules;
      return undefined;
    };
  }

  const cache = {
    key,
    sheet: new StyleSheet({key, container, nonce: options.nonce, speedy: options.speedy, prepend: options.prepend, insertionPoint: options.insertionPoint}),
    nonce: options.nonce,
    inserted,
    registered: {},
    insert,
  };
  cache.sheet.hydrate(nodesToHydrate);
  return cache;
}
