"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {compile,clean}=require("../platform-types.cjs"),{root,fixture,packages}=require("./paths.cjs");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vpm-material-color-types-"));
const common=`import { createTheme, styled, type Theme, type SxProps } from '@mui/material/styles';
import { Box, darken } from '@mui/material';
const dimmed:string = darken('#336699', 0.2);
import * as colors from '@mui/material/colors';
import red from '@mui/material/colors/red';
const shade: '#f44336' = red[500];
const common: '#fff' = colors.common.white;
// @ts-expect-error no invented shades
red[450];
// @ts-expect-error public constants are readonly
red[500] = '#fff';
const theme = createTheme({cssVariables:true});
`;
try{
 for(const bundler of [false,true])for(const ext of bundler?["mts"]:["mts","cts"])for(const enabled of [false,true]){
  const js=ext==="mts"?"mjs":"cjs",paths={};
  for(const name of fs.readdirSync(root+"/packages")){
   const location=packages+"/"+name;if(!fs.existsSync(location+"/package.json"))continue;
   const meta=require(location+"/package.json");if(meta.types){paths[name]=[location+"/"+meta.types];paths[name+"/*"]=[location+"/*.d."+ext];}
  }
  for(const alias of ["@mui/material","vmui-material"]){
   paths[alias]=[packages+"/vmui-material/index.d."+ext];paths[alias+"/*"]=[packages+"/vmui-material/*.d."+ext];
   for(const sub of ["styles","colors","themeCssVarsAugmentation"])paths[alias+"/"+sub]=[packages+"/vmui-material/"+sub+"/index.d."+ext];
  }
  const modules=process.env.VPM_MATERIAL_INSTALL?process.env.VPM_MATERIAL_INSTALL+"/node_modules":fixture+"/node_modules";
  for(const name of ["react","react-dom"])paths[name]=[modules+"/@types/"+name+"/index.d.ts"];
  paths.csstype=[modules+"/csstype/index.d.ts"];
  const text=common+(enabled?`import type {} from '@mui/material/themeCssVarsAugmentation';
const channel: string = theme.vars.palette.secondary.mainChannel;
const color: string = theme.palette.secondary.mainChannel;
const paper: string = theme.vars.palette.background.paper;
const border: string = theme.vars.palette.TableCell.border;
const sx:SxProps = t => ({color:t.vars.palette.text.primary});
const Panel = styled('div')(({theme}) => ({color:theme.vars.palette.text.primary,boxShadow:theme.vars.shadows[2]}));
Box({sx:t=>({backgroundColor:t.vars.palette.background.default})});
styled('div')(({theme}) => {
 // @ts-expect-error typed theme catches misspelled properties
 const typo = theme.vars.palette.backgrond;
 return {color:theme.vars.palette.text.primary};
});
// @ts-expect-error variables are strings, not numeric tokens
const numeric: number = theme.vars.zIndex.modal;
// @ts-expect-error raw palette mode is not a CSS variable
theme.vars.palette.mode;
// @ts-expect-error absent role is not hidden by any
theme.vars.palette.notAColor;
`:`// @ts-expect-error unaugmented themes may not generate variables
theme.vars.palette.text.primary;
const optional:string|undefined = theme.vars?.palette.text.primary;
`);
  const file=dir+"/consumer."+ext;fs.writeFileSync(file,text);
  clean(compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:"ES2022",lib:["ES2022","DOM","DOM.Iterable"],types:[],module:bundler?"ESNext":"NodeNext",moduleResolution:bundler?"Bundler":"NodeNext",paths},files:[file]}));
 }
 console.log("TS7 colors and CSS-variable opt-in pass CJS/ESM and Bundler, including styled/Box/sx, unchanged app import names and negative checks.");
}finally{fs.rmSync(dir,{recursive:true,force:true})}
