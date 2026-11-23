"use strict";
const assert=require("node:assert/strict"),own=require(process.env.VPM_ANSI_PACKAGE||"../../packages/vsisteransi/index.cjs");
let comparisons=0;
for(const name of ["sisteransi","sisteransi-app"]){
 const upstream=require(name);
 for(const group of ["cursor","erase","scroll"]){
  assert.deepEqual(Object.keys(own[group]).sort(),Object.keys(upstream[group]).sort());
  for(const [key,value] of Object.entries(upstream[group]))if(typeof value==="string")assert.equal(own[group][key],value);
 }
 assert.equal(own.beep,upstream.beep);if(upstream.clear)assert.deepEqual(own.clear,upstream.clear);
 for(let n=0;n<2000;n++){
  const x=(n*37)%161,y=(n*23)%97;
  assert.equal(own.cursor.to(x),upstream.cursor.to(x));comparisons++;
  // Explicit row zero is the documented fix, checked independently below.
  if(y){assert.equal(own.cursor.to(x,y),upstream.cursor.to(x,y));comparisons++}
  assert.equal(own.cursor.move(x-80,y-48),upstream.cursor.move(x-80,y-48));comparisons++;
  for(const [group,keys] of [["cursor",["up","down","forward","backward","nextLine","prevLine"]],["erase",["up","down","lines"]],["scroll",["up","down"]]])for(const key of keys){assert.equal(own[group][key](n%45),upstream[group][key](n%45));comparisons++}
 }
 assert.equal(upstream.cursor.to(7,0),"\x1b[8G");
 assert.equal(own.cursor.to(7,0),"\x1b[1;8H");
}
console.log(`${comparisons} valid-input byte comparisons pass sisteransi 1.0.5/2.0.0; explicit row zero is corrected.`);
