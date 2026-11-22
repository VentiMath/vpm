"use strict";
const path=require("node:path"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os");
const {peer,esbuild,fixture,packages}=require("../../../../scripts/mui-material-conformance/paths.cjs");
const root=path.resolve(__dirname,"../.."),upstream=path.join(path.dirname(peer.resolve("mui-material-app/styles")),"createTheme.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vpm-theme-bench-")),vpm=path.join(dir,"theme.cjs");
esbuild.buildSync({entryPoints:[root+"/styles/createTheme.cjs"],outfile:vpm,platform:"node",format:"cjs",bundle:true,nodePaths:[packages,fixture+"/node_modules"]});
process.once("exit",()=>fs.rmSync(dir,{recursive:true,force:true}));
const inputs=[
 ["Default theme",{}],
 ["App-shaped CSS-variable theme",{direction:"rtl",palette:{mode:"dark",primary:{main:"#385d9a"},secondary:{main:"#a73f89"}},typography:{fontFamily:"Geist,Arial,sans-serif",fontSize:13},cssVariables:{cssVarPrefix:"navbar"},components:{MuiButton:{defaultProps:{disableElevation:true}}}}],
 ["Light/dark CSS schemes",{cssVariables:{colorSchemeSelector:"class"},colorSchemes:{light:true,dark:true}}],
];
const cases=inputs.map(([name,input])=>({name,make:file=>{const create=require(file).default;return()=>create(input)},validate:t=>{assert.equal(typeof t.transitions.create,"function");assert.equal(t.typography.fontSize,input.typography?.fontSize||14);if(t.vars)assert.match(t.vars.palette.primary.main,/var\(/)}}));
require("../../../../scripts/bench-process.cjs").run({root,upstream,vpm,cases,files:["create-theme.cjs","theme-colors.cjs","theme-tokens.json","palette.cjs","type-scale.cjs","transition-settings.cjs","bench/theme/compare.cjs",path.relative(root,upstream)]}).catch(e=>{console.error(e);process.exitCode=1});
