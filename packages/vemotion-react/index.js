import isDevelopment from '#is-development';

export {withEmotionCache, CacheProvider, __unsafe_useEmotionCache} from './src/context.js';
export {jsx, jsx as createElement} from './src/jsx.js';
export {Global} from './src/global.js';
export {css, keyframes} from './src/css.js';
export {ClassNames} from './src/class-names.js';
export {ThemeContext, useTheme, ThemeProvider, withTheme} from './src/theming.js';

// Development: two copies of the package in one page do not share caches and
// themes. (Test runners evaluate modules more than once, so not there.)
if (isDevelopment && typeof document !== 'undefined' && typeof jest === 'undefined' && typeof vi === 'undefined') {
  const key = '__EMOTION_REACT_11__';
  if (globalThis[key]) {
    console.warn('You are loading @emotion/react when it is already loaded. Running multiple instances may cause problems. This can happen if multiple versions are used, or if multiple builds of the same version are used.');
  }
  globalThis[key] = true;
}
