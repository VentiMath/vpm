'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const rects={reference:{x:3,y:4,width:80,height:25},floating:{x:0,y:0,width:120,height:60}};
const fixtures=[
 ['side / aligned','getSide',['bottom-start'],'bottom'],
 ['alignment / aligned','getAlignment',['bottom-start'],'start'],
 ['alignment sides / RTL','getAlignmentSides',['top-end',rects,true],['right','left']],
 ['expanded placements','getExpandedPlacements',['top-start'],['top-end','bottom-start','bottom-end']],
 ['opposite axis / unaligned','getOppositeAxisPlacements',['top',true,'start'],['left','right']],
 ['opposite axis / aligned RTL','getOppositeAxisPlacements',['top-start',true,'start',true],['right-start','left-start','right-end','left-end']],
 ['padding / object','getPaddingObject',[{top:5,left:2}],{top:5,right:0,bottom:0,left:2}],
 ['client rect','rectToClientRect',[rects.reference],{x:3,y:4,width:80,height:25,left:3,top:4,right:83,bottom:29}],
];
const cases=fixtures.map(([name,key,args,expected])=>({name,make:directory=>{const fn=require(directory)[key];return()=>fn(...args);},validate:value=>assert.deepEqual(value,expected)}));
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(__dirname,'../../../scripts/floating-utils-conformance/node_modules/@floating-ui/utils'),vpm:root,cases,validationOnly:process.argv.includes('--validate'),files:['package.json','index.cjs','runtime.mjs','dom.cjs','dom.mjs','bench/compare.cjs','../../scripts/floating-utils-conformance/package-lock.json','../../scripts/floating-utils-conformance/node_modules/@floating-ui/utils']}).catch(error=>{console.error(error);process.exitCode=1;});
