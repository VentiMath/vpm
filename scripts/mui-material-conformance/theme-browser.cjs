"use strict";
const assert=require("node:assert/strict");
require("./compare-scenes.cjs")("theme",async({send,wait,evaluate,baseUrl})=>{
 let count=0;
 for(const version of ["app","current"]){
  const expected=[];
  for(const lib of ["upstream","vpm"]){
   const page=version+"-"+lib;await send("Page.navigate",{url:baseUrl+page});await wait("window.draw && location.pathname==='/"+page+"'");
   let i=0;
   for(const mode of ["light","dark"])for(const direction of ["ltr","rtl"])for(const variables of [false,true]){
    const options={mode,direction,variables,prefix:"navbar"};
    const result=await evaluate('(async()=>{window.draw('+JSON.stringify(options)+');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return window.probe()})()');
    if(lib==="upstream")expected.push(result);else{assert.deepEqual(result,expected[i],JSON.stringify({version,...options}));count++}i++;
   }
  }
 }
 console.log(count+" browser theme assemblies match app/current computed colors, typography, spacing and toolbar mixins.");
});
