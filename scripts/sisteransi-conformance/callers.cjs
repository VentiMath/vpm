"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {PassThrough,Writable}=require("node:stream");
const {esbuild}=require("../mui-material-conformance/paths.cjs");
const own=require(process.env.VPM_ANSI_PACKAGE||"../../packages/vsisteransi/index.cjs");
const sources=["prompts/lib/elements/select.js","prompts/lib/elements/text.js","prompts/lib/elements/multiselect.js","prompts/lib/util/clear.js","@clack/core"];
const entries=sources.map(id=>require.resolve(id));
const bundle=esbuild.buildSync({stdin:{contents:"module.exports=["+entries.map(p=>"require("+JSON.stringify(p)+")").join(",")+"]",resolveDir:__dirname},bundle:true,platform:"node",format:"cjs",write:false,external:["sisteransi"]}).outputFiles[0].text;
function load(ansi){
 const calls={};const observed={...ansi};for(const group of ["cursor","erase","scroll"]){observed[group]={...ansi[group]};for(const [key,value]of Object.entries(ansi[group]))if(typeof value==="function")observed[group][key]=(...args)=>{const id=group+"."+key;calls[id]=(calls[id]||0)+1;return Reflect.apply(value,ansi[group],args)}}
 const m={exports:{}};vm.compileFunction(bundle,["module","exports","require"])(m,m.exports,id=>id==="sisteransi"?observed:require(id));return {api:m.exports,calls};
}
function terminal(columns){const input=new PassThrough();input.isTTY=true;input.setRawMode=()=>input;const writes=[];const output=new Writable({write(chunk,_encoding,done){writes.push(String(chunk));done()}});output.columns=columns;output.rows=8;output.isTTY=true;return {input,output,writes}}
function run(ansi,width){
 const {api:[Select,Text,Multi,clear,clack],calls}=load(ansi),records=[];
 for(const [Type,extra,keys] of [
  [Select,{choices:[{title:"Math",value:1},{title:"Disabled",value:2,disabled:true},{title:"A long contest name with a description",value:3}]},["down","return","down","up","up","return"]],
  [Text,{initial:"contest"},["left","backspace","end","return"]],
  [Multi,{choices:["AMC","ARML","USAMTS"]},["down","space","down","space","return"]]
 ]){
  const t=terminal(width),prompt=new Type({message:"Select synthetic contest",stdin:t.input,stdout:t.output,...extra});
  for(const name of keys)if(!prompt.closed)t.input.emit("keypress",name==="space"?" ":undefined,{name});
  if(!prompt.closed)prompt.abort();records.push({writes:t.writes,value:prompt.value,closed:prompt.closed});t.input.destroy();t.output.destroy();
 }
 // Exercise Clack's unchanged frame-diff renderer, including shortened frames,
 // clipped screens and same-frame no-ops, without binding the real terminal.
 const t=terminal(width);let frame="one\ntwo\nthree";
 const prompt=new clack.Prompt({input:t.input,output:t.output,render:()=>frame},false);
 for(const value of [frame,"one\nchanged\nthree","short",Array(12).fill("row").join("\n"),"final","final"]){frame=value;prompt.render()}
 records.push({writes:t.writes,state:prompt.state});t.input.destroy();t.output.destroy();
 records.push([clear("abc",width),clear("\x1b[31mcolored\x1b[0m\n𐐀 emoji 🦉",width),clear("long ".repeat(40),width)]);
 assert.ok(calls["erase.lines"]>0&&calls["erase.down"]>0&&calls["cursor.move"]>0&&calls["cursor.to"]>0);
 return {records,calls};
}
for(const width of [8,20,80,120])for(const name of ["sisteransi-app","sisteransi"])assert.deepEqual(run(own,width),run(require(name),width),name+" width "+width);
console.log("Prompts selection/edit/multiselect/cleanup and Clack frame-diff transcripts match both controls at four widths; all output stays in synthetic streams.");
console.log(JSON.stringify(Object.fromEntries(entries.map(p=>[path.relative(__dirname,p),crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")]))));
