import * as React from 'react';
import createCache from 'vemotion-cache';
import isDevelopment from '#is-development';
import isBrowser from '#is-browser';

const browserCache = typeof HTMLElement === 'undefined' ? null : createCache({key: 'css'});
const CacheContext = React.createContext(browserCache);
if (isDevelopment) CacheContext.displayName = 'EmotionCacheContext';
export const CacheProvider = CacheContext.Provider;
export const __unsafe_useEmotionCache = () => React.useContext(CacheContext);

// One binding path for provider-backed and standalone renders. A missing cache
// is owned by this render and provided to descendants. The server has no ref
// effects or persistent component state to allocate; preserve its function form.
export function withEmotionCache(render) {
  function bind(props, ref) {
    const provided = React.useContext(CacheContext);
    const cache = provided ?? createCache({key: 'css'});
    const content = render(props, cache, ref);
    return provided == null ? React.createElement(CacheProvider, {value: cache}, content) : content;
  }
  return isBrowser ? React.forwardRef(bind) : props => bind(props, undefined);
}
