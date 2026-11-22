"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"../.."),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vpm-lru-"));
const run=(bin,args,cwd=tmp,extra={})=>execFileSync(bin,args,{cwd,encoding:"utf8",timeout:120000,env:{...process.env,npm_config_cache:tmp+"/npm-cache",BUN_INSTALL_CACHE_DIR:tmp+"/bun-cache",...extra}});
try{
 const pack=JSON.parse(run("npm",["pack",root+"/packages/vlru-cache","--ignore-scripts","--json"]))[0];
 assert(pack.files.every(f=>!f.path.startsWith("test/")&&!f.path.startsWith("bench/")));
 for(const manager of ["npm","bun"]){
  const cwd=tmp+"/"+manager;fs.mkdirSync(cwd);fs.writeFileSync(cwd+"/package.json",JSON.stringify({private:true,type:"module",dependencies:{"vlru-cache":"file:../"+pack.filename}}));
  run(manager,["install","--ignore-scripts"],cwd);
  run(manager,manager==="npm"?["ci","--ignore-scripts"]:["install","--frozen-lockfile","--ignore-scripts"],cwd);
  fs.writeFileSync(cwd+"/check.mjs",'import assert from "node:assert/strict";import {createRequire} from "node:module";import Cache,{LRUCache} from "vlru-cache";assert.equal(Cache,LRUCache);assert.equal(createRequire(import.meta.url)("vlru-cache"),LRUCache);const c=new LRUCache({max:1});c.set("a",1).set("b",2);assert.equal(c.get("a"),undefined);assert.equal(c.get("b"),2);');
  for(const bin of ["node","bun"]){run(bin,["check.mjs"],cwd);process.stdout.write(run(bin,[__dirname+"/lru-callers.cjs"],cwd,{VPM_LRU_PACKAGE:cwd+"/node_modules/vlru-cache"}))}
  fs.writeFileSync(cwd+"/check.mts",'import Cache,{LRUCache} from "vlru-cache";const c=new LRUCache<string,{n:number}>({maxSize:20,sizeCalculation:v=>v.n});c.set("x",{n:2});const n:number|undefined=c.get("x")?.n;const d=new Cache<string,string>({max:2});\\n// @ts-expect-error Wrong key type.\\nc.set(2,{n:1});\\n'.replaceAll("\\n","\n"));
  fs.writeFileSync(cwd+"/check.cts",'import Cache=require("vlru-cache");const c=new Cache<string,number>({max:2});const n=new Cache.LRUCache<string,number>({max:1});c.set("x",2);n.set("a",3);');
  for(const resolution of ["NodeNext","Bundler"]){
   fs.writeFileSync(cwd+"/tsconfig.json",JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:"ES2022",module:resolution==="NodeNext"?"NodeNext":"ESNext",moduleResolution:resolution,lib:["ES2022"],types:[]},files:resolution==="NodeNext"?["check.cts","check.mts"]:["check.mts"]}));
   run("node",[require("../platform-types.cjs").compiler().path,"-p","tsconfig.json"],cwd);
  }
 }
 console.log("Fresh/frozen npm/Bun LRU archives, Node/Bun callers, CJS/ESM and DOM-free TS7 consumers pass.");
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
