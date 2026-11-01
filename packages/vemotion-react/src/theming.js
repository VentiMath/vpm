import * as React from 'react';
import isDevelopment from '#is-development';
import hoistStatics from './hoist-statics.js';

export const ThemeContext = React.createContext({});
if (isDevelopment) ThemeContext.displayName = 'EmotionThemeContext';
export const useTheme = () => React.useContext(ThemeContext);
const validTheme = theme => theme !== null && typeof theme === 'object' && !Array.isArray(theme);

function resolveTheme(parent, declaration) {
  if (parent === declaration) return parent;
  const functional = typeof declaration === 'function';
  const value = functional ? declaration(parent) : declaration;
  if (isDevelopment && !validTheme(value)) throw new Error(functional
    ? '[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!'
    : '[ThemeProvider] Please make your theme prop a plain object');
  return functional ? value : {...parent, ...value};
}

export function ThemeProvider({theme, children}) {
  const parent = useTheme();
  // Memoization belongs to this provider, not a process-wide function-result
  // cache. Independent mounts evaluate their own theme declarations.
  const resolved = React.useMemo(() => resolveTheme(parent, theme), [parent, theme]);
  return React.createElement(ThemeContext.Provider, {value: resolved}, children);
}

export function withTheme(Component) {
  const Wrapped = React.forwardRef(function ThemedComponent(props, ref) {
    return React.createElement(Component, {theme: useTheme(), ref, ...props});
  });
  Wrapped.displayName = `WithTheme(${Component.displayName || Component.name || 'Component'})`;
  return hoistStatics(Wrapped, Component);
}
