'use strict';
module.exports=function getIgnoreAttributesFn(value){
  if(typeof value==='function')return value;
  if(!Array.isArray(value))return()=>false;
  const patterns=value.map(pattern=>typeof pattern==='string'?pattern:new RegExp(pattern.source,pattern.flags));
  return name=>patterns.some(pattern=>{
    if(typeof pattern==='string')return name===pattern;
    pattern.lastIndex=0;return pattern.test(name);
  });
};
