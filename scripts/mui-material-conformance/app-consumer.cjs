"use strict";
// Opt-in private-app audit. Only exported snapshots and temporary packed installs
// are changed. No app checkout, deployment, credentials or live data are used.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),{spawnSync,execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"../.."),app=process.env.VPM_APP_REPO;
if(!app)throw Error("Set VPM_APP_REPO to the read-only application repository");
const directory=process.env.VPM_MATERIAL_AUDIT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),"vpm-material-app-"));
fs.mkdirSync(directory,{recursive:true});
process.env.npm_config_cache=directory+"/npm-cache";
process.env.BUN_INSTALL_CACHE_DIR=directory+"/bun-cache";
const ref=execFileSync("git",["rev-parse",process.env.VPM_APP_REF||"origin/main"],{cwd:app,encoding:"utf8"}).trim();
const report={appCommit:ref,vpmBaseCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),directory,vpmWorkingTree:true,packages:[],checks:[],adopted:false};
function save(){fs.writeFileSync(directory+"/report.json",JSON.stringify(report,null,2)+"\n")}
function run(command,args,cwd,label,required=true){
 const start=Date.now(),file=directory+"/"+label+".log",fd=fs.openSync(file,"w");
 const result=spawnSync(command,args,{cwd,stdio:["ignore",fd,fd],timeout:600000,env:{...process.env,CI:"true",BROWSER:"none"}});fs.closeSync(fd);
 const item={label,command:[command,...args],status:result.status,signal:result.signal||null,timedOut:result.error?.code==="ETIMEDOUT",ms:Date.now()-start,log:file};report.checks.push(item);save();console.log(JSON.stringify(item));
 if(required&&result.status!==0)throw Error(label+" failed; see "+file);
 return result.status===0;
}
const archive=directory+"/app.tar";
execFileSync("git",["archive","--format=tar","--output",archive,ref],{cwd:app});
for(const variant of ["baseline","candidate"]){fs.mkdirSync(directory+"/"+variant);execFileSync("tar",["-xf",archive,"-C",directory+"/"+variant]);}
fs.unlinkSync(archive);
const stages=directory+"/packs";fs.mkdirSync(stages);
const urls={},seen=new Set();
function pack(name){
 if(seen.has(name))return;seen.add(name);
 const source=root+"/packages/"+name,meta=JSON.parse(fs.readFileSync(source+"/package.json"));
 for(const dep of Object.keys(meta.dependencies||{})){if(!fs.existsSync(root+"/packages/"+dep+"/package.json"))throw Error("Unexpected external dependency: "+dep);pack(dep)}
 const stage=stages+"/"+name;fs.cpSync(source,stage,{recursive:true,filter:p=>!/(?:^|\/)(?:node_modules|bench|test)(?:\/|$)/.test(p)});
 for(const dep of Object.keys(meta.dependencies||{}))meta.dependencies[dep]=urls[dep];
 fs.writeFileSync(stage+"/package.json",JSON.stringify(meta,null,2));
 const [packed]=JSON.parse(execFileSync("npm",["pack",stage,"--ignore-scripts","--json"],{cwd:stages,encoding:"utf8"}));
 urls[name]="file:"+stages+"/"+packed.filename;
 report.packages.push({name,version:meta.version,sha256:crypto.createHash("sha256").update(fs.readFileSync(stages+"/"+packed.filename)).digest("hex")});
}
pack("vmui-material");
const target=directory+"/candidate",manifest=JSON.parse(fs.readFileSync(target+"/package.json"));
manifest.overrides={...manifest.overrides,...urls};
for(const [name,url] of Object.entries(urls))if(manifest.dependencies[name])manifest.dependencies[name]=url;
const aliases={"@mui/material":"vmui-material","@mui/system":"vmui-system","@mui/utils":"vmui-utils","@mui/private-theming":"vmui-private-theming","@mui/styled-engine":"vmui-styled-engine"};
for(const [name,own] of Object.entries(aliases)){manifest.overrides[name]=urls[own];if(manifest.dependencies[name])manifest.dependencies[name]=urls[own]}
fs.writeFileSync(target+"/package.json",JSON.stringify(manifest,null,2)+"\n");report.aliases=aliases;save();
for(const variant of ["baseline","candidate"]){
 const cwd=directory+"/"+variant;
 run("bun",["install","--ignore-scripts",...(variant==="baseline"?["--frozen-lockfile"]:[])],cwd,variant+"-install");
 if(variant==="candidate")run("bun",["install","--ignore-scripts","--frozen-lockfile"],cwd,variant+"-frozen-install");
 run("bun",["run","typecheck"],cwd,variant+"-typecheck",false);
 run("bun",["x","--no-install","vite","build"],cwd,variant+"-build",false);
}
console.log("Audit saved to "+directory+"/report.json");

if(report.checks.some(check=>check.status!==0))process.exitCode=1;
