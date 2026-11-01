import * as React from 'react';
import {serializeStyles} from 'vemotion-serialize';
import {useInsertionEffectWithLayoutFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';
import {withEmotionCache} from './context.js';
import {ThemeContext} from './theming.js';
import {GlobalSheet} from './global-sheet.js';
import {inlineStyle, joinStyles} from './style-batch.js';

let warnedAboutCssProp = false;
export const Global = withEmotionCache((props, cache) => {
  if (isDevelopment && !warnedAboutCssProp && (props.className || props.css)) {
    console.error("It looks like you're using the css prop on Global, did you mean to use the styles prop instead?");
    warnedAboutCssProp = true;
  }
  const styles = serializeStyles([props.styles], undefined, React.useContext(ThemeContext));
  if (!isBrowser) {
    const combined = joinStyles(styles);
    const legacy = cache.compat === true;
    const rules = cache.insert('', combined, cache.sheet, legacy);
    return legacy ? null : inlineStyle(cache, `${cache.key}-global ${combined.name}`, rules);
  }
  const lifecycle = React.useMemo(() => new GlobalSheet(cache), [cache]);
  useInsertionEffectWithLayoutFallback(() => {
    lifecycle.mount(styles);
    return () => lifecycle.dispose();
  }, [lifecycle]);
  useInsertionEffectWithLayoutFallback(() => lifecycle.apply(styles), [lifecycle, styles.name]);
  return null;
});
if (isDevelopment) Global.displayName = 'EmotionGlobal';
