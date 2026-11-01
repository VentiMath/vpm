import * as React from 'react';
import createCache from 'vemotion-cache';
import isBrowser from '#is-browser';
import isDevelopment from '#is-development';

// The cache components insert into: a default one in the browser (where
// HTMLElement exists), none on the server until a render creates one.
const EmotionCacheContext = React.createContext(typeof HTMLElement !== 'undefined' ? createCache({key: 'css'}) : null);
if (isDevelopment) EmotionCacheContext.displayName = 'EmotionCacheContext';

export const CacheProvider = EmotionCacheContext.Provider;

export const __unsafe_useEmotionCache = function useEmotionCache() {
  return React.useContext(EmotionCacheContext);
};

/**
 * Wraps a render function that needs the cache. In the browser it forwards
 * refs; on the server, without a provider, it creates a cache for the render
 * and provides it to the tree below.
 */
export const withEmotionCache = isBrowser
  ? render => React.forwardRef((props, ref) => render(props, React.useContext(EmotionCacheContext), ref))
  : render => props => {
      const cache = React.useContext(EmotionCacheContext);
      if (cache !== null) return render(props, cache);
      const created = createCache({key: 'css'});
      return React.createElement(EmotionCacheContext.Provider, {value: created}, render(props, created));
    };
