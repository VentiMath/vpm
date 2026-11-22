import React from "react";
import {createRoot} from "react-dom/client";
import {flushSync} from "react-dom";
import {createTheme,ThemeProvider} from "@assembly";
import {Box,CssBaseline,Typography} from "@components";
const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
window.draw=({mode="light",direction="ltr",prefix="mui",variables=true})=>{
 const theme=createTheme({direction,palette:{mode,primary:{main:"#385d9a"}},typography:{fontFamily:"Arial",fontSize:13},cssVariables:variables?{cssVarPrefix:prefix,colorSchemeSelector:"class"}:false});
 flushSync(()=>root.render(<ThemeProvider theme={theme} defaultMode={mode} storageManager={null}><CssBaseline/><Box id="sample" sx={{m:2,p:1,borderRadius:1,bgcolor:"primary.main",color:"primary.contrastText",...theme.mixins.toolbar}}><Typography variant="body1">Practice</Typography></Box></ThemeProvider>));
};
window.probe=()=>{const el=document.querySelector("#sample"),s=getComputedStyle(el),t=getComputedStyle(el.firstElementChild);return {color:s.color,bg:s.backgroundColor,padding:s.padding,margin:s.margin,radius:s.borderRadius,height:s.minHeight,text:{font:t.fontFamily,size:t.fontSize,line:t.lineHeight},body:getComputedStyle(document.body).backgroundColor}};
