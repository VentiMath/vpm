"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),{createRequire}=require("node:module");
const candidate=require(process.env.VPM_LRU_PACKAGE||"../../packages/vlru-cache"),Control=require("lru-current").LRUCache;
function loadWithCache(entry,C){
 const modules=new Map();let hits=0,sets=0;
 class Tracked extends C {get(...args){hits++;return super.get(...args)}set(...args){sets++;return super.set(...args)}}
 Tracked.LRUCache=Tracked;
 function load(file){
  if(modules.has(file))return modules.get(file).exports;
  const original=createRequire(file),m={exports:{}};modules.set(file,m);
  const read=id=>{
   if(id==="lru-cache")return Tracked;
   const next=original.resolve(id);
   if(next.endsWith(".cjs")||next.endsWith(".js"))return load(next);
   return original(id);
  };
  read.resolve=original.resolve;read.cache=Object.create(null);
  vm.compileFunction(fs.readFileSync(file,"utf8"),["require","module","exports","__filename","__dirname"])(read,m,m.exports,file,path.dirname(file));
  return m.exports;
 }
 return {api:load(require.resolve(entry)),counts:()=>({hits,sets})};
}
for(const version of ["@babel/helper-compilation-targets","targets-app"]){
 const a=loadWithCache(version,candidate),b=loadWithCache(version,require("lru-app"));
 for(let pass=0;pass<3;pass++)for(const input of [{node:"24"},{chrome:"130",firefox:"132"},{browsers:["last 1 Chrome version"]},{esmodules:true},{}]){
  assert.deepEqual(a.api.default(input,{ignoreBrowserslistConfig:true}),b.api.default(input,{ignoreBrowserslistConfig:true}));
 }
 assert(a.counts().hits>0&&a.counts().sets>0);
}
for(const C of [candidate,Control]){
 const css=loadWithCache("cssstyle",C),decl=new css.api.CSSStyleDeclaration();
 const results=[];
 for(let repeat=0;repeat<3;repeat++)for(const [key,value]of [["color","rgb(20, 30, 40)"],["backgroundColor","hsl(120, 50%, 40%)"],["border","1px solid red"],["margin","2px 4px"],["opacity",".5"]]){
  decl[key]=value;results.push(decl[key]);
 }
 assert(css.counts().hits>0&&css.counts().sets>0);
 if(C===candidate)globalThis.cssResult=results;else assert.deepEqual(results,globalThis.cssResult);
 const paths=loadWithCache("path-scurry",C),root=new paths.api.PathScurry(process.cwd()),resolved=[];
 for(let i=0;i<5;i++)for(const item of [".","packages/../packages/vlx","scripts","./scripts/source-map-conformance"]){resolved.push(root.resolve(item));root.cwd.resolve(item)}
 assert(paths.counts().hits>0&&paths.counts().sets>0);
 if(C===candidate)globalThis.pathResult=resolved;else assert.deepEqual(resolved,globalThis.pathResult);
 const {JSDOM}=require("jsdom"),dom=new JSDOM('<main><div class="row"><b>A</b></div><div class="row"><b>B</b></div></main>');
 try{
  const selectors=loadWithCache("@asamuzakjp/dom-selector",C),engine=new selectors.api.DOMSelector(dom.window);
  const out=[];for(let i=0;i<4;i++)for(const query of [".row","main > div:first-child","div:has(b)","b"]){out.push([...engine.querySelectorAll(query,dom.window.document)].map(x=>x.textContent))}
  assert(selectors.counts().hits>0&&selectors.counts().sets>0);
  if(C===candidate)globalThis.selectorResult=out;else assert.deepEqual(out,globalThis.selectorResult);
 }finally{dom.window.close()}
}
console.log("Unchanged Babel target selection, CSS declarations, DOM queries and path resolution match with VPM LRU get/set calls verified.");
