import * as React from 'react';
import weakMemoize from 'vemotion-weak-memoize';
import isDevelopment from '#is-development';
import hoistStatics from './hoist-statics.js';

export const ThemeContext = React.createContext({});
if (isDevelopment) ThemeContext.displayName = 'EmotionThemeContext';

export const useTheme = () => React.useContext(ThemeContext);

const isPlainObject = value => value != null && typeof value === 'object' && !Array.isArray(value);

/** A theme merged into the outer one, or computed from it by a function. */
function mergeTheme(outerTheme, theme) {
  if (typeof theme === 'function') {
    const merged = theme(outerTheme);
    if (isDevelopment && !isPlainObject(merged)) throw new Error('[ThemeProvider] Please return an object from your theme function, i.e. theme={() => ({})}!');
    return merged;
  }
  if (isDevelopment && !isPlainObject(theme)) throw new Error('[ThemeProvider] Please make your theme prop a plain object');
  return {...outerTheme, ...theme};
}

// One merged theme per outer theme and theme, kept while both are alive.
const mergedThemes = weakMemoize(outerTheme => weakMemoize(theme => mergeTheme(outerTheme, theme)));

export function ThemeProvider(props) {
  let theme = React.useContext(ThemeContext);
  if (props.theme !== theme) theme = mergedThemes(theme)(props.theme);
  return React.createElement(ThemeContext.Provider, {value: theme}, props.children);
}

/** Wraps a component to receive the theme as a prop. */
export function withTheme(Component) {
  const componentName = Component.displayName || Component.name || 'Component';
  const WithTheme = React.forwardRef(function render(props, ref) {
    const theme = React.useContext(ThemeContext);
    return React.createElement(Component, {theme, ref, ...props});
  });
  WithTheme.displayName = `WithTheme(${componentName})`;
  return hoistStatics(WithTheme, Component);
}
