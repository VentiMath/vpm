import type * as React from "react";
export interface DefaultTheme {}
export interface ThemeProviderProps<Theme extends object = DefaultTheme> {
  theme: Partial<Theme> | ((outerTheme: Theme | null) => Theme);
  children?: React.ReactNode;
}
export function ThemeProvider<Theme extends object = DefaultTheme>(
  props: ThemeProviderProps<Theme>,
): React.ReactElement;
export function useTheme<Theme = DefaultTheme>(): Theme | null;
