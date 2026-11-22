"use strict";
const React = require("react");
const system = require("vmui-system");
const h = React.createElement;
const THEME_ID = "$$material";
const defaultTheme = require("./create-theme.cjs").createTheme();
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
  // Component APIs may share names with System props (Icon color/fontSize).
  // Keep those props for custom roots, as current Material does; retain legacy
  // direct System props only for native roots used by the application.
  const resolved=typeof (input.component||"div")==="string"?system.extendSxProp(input):input;
  const {component="div",className,...props}=resolved;
  return h(Root,{...props,as:component,ref,className:["MuiBox-root",className].filter(Boolean).join(" ")});
});
function GlobalStyles(props) {return h(system.GlobalStyles,{...props,themeId:THEME_ID,defaultTheme});}
function useThemeProps({props,name}) {return system.useThemeProps({props,name,themeId:THEME_ID,defaultTheme});}
const useMediaQuery=system.unstable_createUseMediaQuery({themeId:THEME_ID});
const boxClasses=Object.freeze({root:"MuiBox-root"});
Box.displayName="Box";
module.exports={Box,boxClasses,ThemeProvider,GlobalStyles,styled,useTheme,useThemeProps,useMediaQuery,
  useColorScheme:variables.useColorScheme,THEME_ID};
