"use strict";
const React = require("react");
const system = require("vmui-system");
const h = React.createElement;
const THEME_ID = "$$material";
// Defaults needed by standalone Box/sx consumers. This is not a public Material
// theme factory: callers may supply their complete existing Material theme.
const defaultTheme = system.createTheme({
  palette: {
    mode: "light",
    primary: {main:"#1976d2",light:"#42a5f5",dark:"#1565c0",contrastText:"#fff"},
    secondary: {main:"#9c27b0",light:"#ba68c8",dark:"#7b1fa2",contrastText:"#fff"},
    error:{main:"#d32f2f"},warning:{main:"#ed6c02"},info:{main:"#0288d1"},success:{main:"#2e7d32"},
    text:{primary:"rgba(0, 0, 0, 0.87)",secondary:"rgba(0, 0, 0, 0.6)",disabled:"rgba(0, 0, 0, 0.38)"},
    background:{paper:"#fff",default:"#fff"},divider:"rgba(0, 0, 0, 0.12)",
    action:{active:"rgba(0, 0, 0, 0.54)",disabled:"rgba(0, 0, 0, 0.26)"},
  },
  typography:{fontFamily:'"Roboto", "Helvetica", "Arial", sans-serif',fontSize:14,fontWeightLight:300,fontWeightRegular:400,fontWeightMedium:500,fontWeightBold:700},
});
function useTheme() {
  const theme = system.useTheme(defaultTheme);
  return theme[THEME_ID] || theme;
}
const variables = system.unstable_createCssVarsProvider({
  themeId: THEME_ID, defaultMode:"system",
  modeStorageKey:"mui-mode",colorSchemeStorageKey:"mui-color-scheme",
});
function ThemeProvider({theme,children,...options}) {
  const parent = system.useTheme(defaultTheme), outer=parent[THEME_ID] || parent;
  const resolved = React.useMemo(()=>{
    const next=typeof theme==="function"?theme(outer):theme;
    if (!next || typeof next!=="object") throw new TypeError("Material ThemeProvider requires a theme object");
    return parent[THEME_ID] && !next[THEME_ID] ? {[THEME_ID]:next} : next;
  },[theme,outer,parent]);
  if (!resolved || typeof resolved!=="object") throw new TypeError("Material ThemeProvider requires a theme object");
  const scoped = resolved[THEME_ID] || resolved;
  if (scoped.colorSchemes) return h(variables.CssVarsProvider,{...options,theme:resolved},children);
  return h(system.ThemeProvider,{theme:resolved,themeId:resolved[THEME_ID]?THEME_ID:undefined},children);
}
const styled = system.createStyled({themeId:THEME_ID,defaultTheme,
  rootShouldForwardProp:p=>system.shouldForwardProp(p)&&p!=="classes",
});
const Root = styled("div",{shouldForwardProp:p=>!["theme","sx","as"].includes(p)})({});
const Box = React.forwardRef(function Box(input,ref) {
  const {component="div",className,...props}=system.extendSxProp(input);
  return h(Root,{...props,as:component,ref,className:["MuiBox-root",className].filter(Boolean).join(" ")});
});
function GlobalStyles(props) {return h(system.GlobalStyles,{...props,themeId:THEME_ID,defaultTheme});}
function useThemeProps({props,name}) {return system.useThemeProps({props,name,themeId:THEME_ID,defaultTheme});}
const useMediaQuery=system.unstable_createUseMediaQuery({themeId:THEME_ID});
const boxClasses=Object.freeze({root:"MuiBox-root"});
Box.displayName="Box";
module.exports={Box,boxClasses,ThemeProvider,GlobalStyles,styled,useTheme,useThemeProps,useMediaQuery,
  useColorScheme:variables.useColorScheme,THEME_ID};
