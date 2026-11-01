import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectWithLayoutFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import {insertStyles} from 'vemotion-utils';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {ThemeContext} from './theming.js';

let warnedAboutCssProp = false;

/**
 * Global styles. Each Global has a sheet of its own (`key-global`), placed
 * before the cache's elements, and replaces its styles when they change. On
 * the server it renders them in a style element.
 */
export const Global = withEmotionCache((props, cache) => {
  if (isDevelopment && !warnedAboutCssProp && ((props.className) || (props.css))) {
    console.error("It looks like you're using the css prop on Global, did you mean to use the styles prop instead?");
    warnedAboutCssProp = true;
  }
  const serialized = serializeStyles([props.styles], undefined, React.useContext(ThemeContext));

  if (!isBrowser) {
    let names = serialized.name;
    let styles = serialized.styles;
    for (let next = serialized.next; next !== undefined; next = next.next) {
      names += ' ' + next.name;
      styles += next.styles;
    }
    const shouldCache = cache.compat === true;
    const rules = cache.insert('', {name: names, styles}, cache.sheet, shouldCache);
    if (shouldCache) return null;
    return React.createElement('style', {'data-emotion': `${cache.key}-global ${names}`, dangerouslySetInnerHTML: {__html: rules}, nonce: cache.sheet.nonce});
  }

  // (The hooks below run on every browser render: isBrowser is constant.)
  const sheetRef = React.useRef();

  useInsertionEffectWithLayoutFallback(() => {
    const key = `${cache.key}-global`;
    // The cache's sheet class (MUI subclasses it).
    const sheet = new cache.sheet.constructor({key, nonce: cache.sheet.nonce, container: cache.sheet.container, speedy: cache.sheet.isSpeedy});
    let rehydrating = false;
    const node = document.querySelector(`style[data-emotion="${key} ${serialized.name}"]`);
    if (cache.sheet.tags.length) sheet.before = cache.sheet.tags[0];
    if (node !== null) {
      rehydrating = true;
      // So that other Globals do not rehydrate it too.
      node.setAttribute('data-emotion', key);
      sheet.hydrate([node]);
    }
    sheetRef.current = [sheet, rehydrating];
    return () => sheet.flush();
  }, [cache]);

  useInsertionEffectWithLayoutFallback(() => {
    const current = sheetRef.current;
    const [sheet, rehydrating] = current;
    if (rehydrating) {
      current[1] = false;
      return;
    }
    if (serialized.next !== undefined) insertStyles(cache, serialized.next, true); // keyframes
    if (sheet.tags.length) {
      // Keep the place: the new elements go where the old ones were.
      sheet.before = sheet.tags[sheet.tags.length - 1].nextElementSibling;
      sheet.flush();
    }
    cache.insert('', serialized, sheet, false);
  }, [cache, serialized.name]);

  return null;
});
if (isDevelopment) Global.displayName = 'EmotionGlobal';
