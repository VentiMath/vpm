'use strict';
const expand=require('vbrace-expansion');
const {SegmentMatcher}=require('./matcher.cjs');
const GLOBSTAR=Symbol('vminimatch globstar');
function valid(pattern){if(typeof pattern!=='string')throw new TypeError('invalid pattern');if(pattern.length>65536)throw new TypeError('pattern is too long');}
function norm(s,o){return o.normalize?s.normalize(o.normalize===true?'NFC':o.normalize):s;}
function escape(s,o={}){
 let out='';for(let i=0;i<s.length;i++){const c=s[i],magic='?*()[]'.includes(c)||(o.magicalBraces&&'{}'.includes(c));
  if(i===0&&(c==='#'||c==='!'))out+=o.windowsPathsNoEscape?(c==='!'?'@(!)':'[#]'):'\\'+c;
  else if(magic)out+=o.windowsPathsNoEscape?'['+c+']':'\\'+c;
  else if(c==='\\'&&!o.windowsPathsNoEscape)out+='\\\\';else out+=c;
 }return out;
}
function unescape(s,o={}){
 let out='',i=0;if(o.windowsPathsNoEscape&&s.startsWith('@(!)')){out='!';i=4;}
 for(;i<s.length;i++){
  const c=s[i],next=s[i+1],allowed=x=>x!==undefined&&x!=='/'&&!(o.magicalBraces===false&&'{}'.includes(x));
  if(c==='\\'&&!o.windowsPathsNoEscape&&allowed(next)){out+=next;i++;}
  else if(c==='['&&s[i+2]===']'&&allowed(next)&&next!=='\\'){out+=next;i+=2;}
  else out+=c;
 }return out;
}
function braceExpand(pattern,options={}){valid(pattern);return options.nobrace||!pattern.includes('{')?[pattern]:expand(pattern,{max:options.braceExpandMax??100000});}
function compactRanges(pattern,options){
 const ranges=new Map();if(options.nobrace||!pattern.includes('{'))return {pattern,ranges};
 // A fresh marker is selected from characters absent from the input. No user
 // character can collide, and marked ranges are never exposed in globParts.
 let marker=0xe000,depth=[];
 let out='';for(let i=0;i<pattern.length;i++){
  const c=pattern[i];if(c==='\\'){out+=pattern.slice(i,i+2);i++;continue;}
  if(c==='['){out+=pattern.slice(i);break;}
  if(!options.noext&&'@?+*!'.includes(c)&&pattern[i+1]==='(')depth.push(c);
  else if(c===')')depth.pop();
  if(c==='{'&&pattern[i-1]!=='$'&&!depth.some(d=>'!*+'.includes(d))){
   const m=/^\{(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?\}/.exec(pattern.slice(i));
   if(m){const start=Number(m[1]),end=Number(m[2]),step=Math.max(1,Math.abs(Number(m[3]??1))),count=Math.floor(Math.abs(end-start)/step)+1;
    if([start,end,step].every(Number.isSafeInteger)&&count>=100){
     while(marker<=0xf8ff&&pattern.includes(String.fromCharCode(marker)))marker++;
     if(marker<=0xf8ff){const mark=String.fromCharCode(marker++);ranges.set(mark,{start,min:Math.min(start,end),max:Math.max(start,end),step,width:Math.max(m[1].length,m[2].length),padded:/^-?0\d/.test(m[1])||/^-?0\d/.test(m[2]),source:m[0]});out+=mark;i+=m[0].length-1;continue;}
    }
   }
  }out+=c;
 }return {pattern:out,ranges};
}
function split(s,o){if(o.preserveMultipleSlashes)return s.split('/');if(o.platform==='win32'&&s.startsWith('//'))return ['','',...s.slice(2).split(/\/+/)];return s.split(/\/+/);}
function optimize(parts,level,pattern=false,isWindows=false){
 const root=isWindows&&parts[0]===''&&parts[1]===''?4:isWindows&&/^[a-z]:$/i.test(parts[0])?1:0;
 const out=[];for(let i=0;i<parts.length;i++){const part=parts[i];
  if(level>=2&&part==='.'&&i>0)continue;
  if(part==='..'&&out.length>root&&out.at(-1)&&out.at(-1)!=='..'&&out.at(-1)!=='**')out.pop();
  else if(part==='**'&&out.at(-1)==='**'&&pattern)continue;else out.push(part);
 }if(level>=2&&pattern&&out[0]==='**'&&parts[0]!=='**')out.unshift('.');
 if(level>=2&&out.length===2&&out[0]==='.'&&out[1]==='')out.pop();
 return out.length?out:[''];
}
function preprocess(parts,options,isWindows){
 const level=options.optimizationLevel??1;if(level<1)return [parts];
 const queue=[parts],rows=[];let cells=parts.length;
 for(let q=0;q<queue.length;q++){
  const row=optimize(queue[q],level,true,isWindows);let splitAt=-1;
  if(level>=2)for(let i=0;i+3<row.length;i++)if(row[i]==='**'&&row[i+1]==='..'&&row[i+2]!=='..'){splitAt=i;break;}
  if(splitAt<0){rows.push(row);continue;}
  const i=splitAt,a=[...row.slice(0,i),...row.slice(i+1)],b=[...row.slice(0,i+1),...row.slice(i+2)];cells+=a.length+b.length;
  if(queue.length+1>(options.braceExpandMax??100000)*2||cells>1000000)throw new RangeError('glob preprocessing limit exceeded');queue.push(a,b);
 }return rows;
}
function windows(s,pattern=false){if(!pattern)s=s.replace(/\\/g,'/');if(/^\/\/\?\/unc\//i.test(s))s='//'+s.slice(8);if(/^\/\/\?\/[a-z]:\//i.test(s))s=s.slice(4);return s;}
class Minimatch {
 constructor(pattern,options={}){
  valid(pattern);this.options={...options};this.platform=options.platform||process.platform;this.options.platform=this.platform;this.isWindows=this.platform==='win32';
  this.windowsPathsNoEscape=!!(options.windowsPathsNoEscape||options.allowWindowsEscape===false);this.nonegate=!!options.nonegate;this.nocase=!!options.nocase;
  this.windowsNoMagicRoot=options.windowsNoMagicRoot??(this.isWindows&&this.nocase);this.preserveMultipleSlashes=!!options.preserveMultipleSlashes;this.partial=!!options.partial;
  this.maxGlobstarRecursion=options.maxGlobstarRecursion??200;this.pattern=this.windowsPathsNoEscape?pattern.replace(/\\/g,'/'):pattern;
  this.negate=false;this.comment=false;this.empty=false;this.set=[];this.globParts=[];this.globSet=[];this.make();
 }
 make(){
  this.set=[];this.globParts=[];this.globSet=[];
  if(!this.options.nocomment&&this.pattern[0]==='#'){this.comment=true;return;}
  if(!this.pattern){this.empty=true;return;}
  this.parseNegate();const compact=compactRanges(this.pattern,this.options);this.ranges=compact.ranges;
  const patterns=braceExpand(compact.pattern,this.options),level=this.options.optimizationLevel??1;
  for(const p of patterns){
   const alternatives=preprocess(split(this.isWindows?windows(p,true):p,this.options),this.options,this.isWindows);
   for(const parts of alternatives){
   const restore=s=>{for(const [mark,r]of this.ranges)s=s.split(mark).join(r.source);return s;};
   this.globSet.push(restore(p));this.globParts.push(parts.map(restore));
   this.set.push(parts.map((part,i)=>this.parse(part,i,parts)));
   }
  }
  this.exactPath=undefined;this.prefixGlob=undefined;
  if(!this.isWindows&&!this.options.normalize&&!this.options.matchBase&&(this.options.optimizationLevel??1)<2&&this.set.length===1){
   const row=this.set[0];
   if(row.every(p=>typeof p==='string'))this.exactPath=row.join('/');
   else if(row.length>1&&row.at(-1)===GLOBSTAR&&row.slice(0,-1).every(p=>typeof p==='string'))this.prefixGlob=row.slice(0,-1).join('/')+'/';
  }
 }
 parseNegate(){if(this.nonegate)return;let i=0;while(this.pattern[i]==='!'){this.negate=!this.negate;i++;}this.pattern=this.pattern.slice(i);}
 parse(part,index=0,parts=[]){
  if(part===''||part==='.'||part==='..')return part;
  if(part==='**'&&!this.options.noglobstar)return GLOBSTAR;
  if(part==='**'&&this.options.noglobstar)part='*';
  part=norm(part,this.options);const options={...this.options};
  const root=this.isWindows&&(index===0&&/^[a-z]:$/i.test(part)||parts[0]===''&&parts[1]===''&&index<4);
  if(root&&!/[?*\[\]@!+()]/.test(part))return part;
  if(!options.nocase&&!/[?*\[\]\\]/.test(part)&&!(!options.noext&&/[@!+]\(/.test(part))&&![...this.ranges?.keys()||[]].some(c=>part.includes(c)))return part;
  const matcher=new SegmentMatcher(part,options,this.ranges);
  if(!matcher.magic&&(!options.nocase||this.options.nocaseMagicOnly))return matcher.originalLiteral;
  return matcher;
 }
 hasMagic(){return !!(this.options.magicalBraces&&this.globSet.length>1)||this.set.some(row=>row.some(p=>typeof p!=='string'));}
 braceExpand(){return braceExpand(this.pattern,this.options);}
 match(path,partial=this.partial){
  if(typeof path!=='string')throw new TypeError('path must be a string');
  if(this.comment)return false;if(this.empty)return path==='';
  if(!partial&&!path.includes('//')){
   let result;
   if(this.exactPath!==undefined)result=path===this.exactPath||path===this.exactPath+'/';
   else if(this.prefixGlob!==undefined){
    result=path.startsWith(this.prefixGlob);
    if(result){const tail=path.slice(this.prefixGlob.length);result=this.options.dot?!/(^|\/)\.\.?($|\/)/.test(tail):!/(^|\/)\./.test(tail);}
   }
   if(result!==undefined)return this.options.flipNegate?result:this.negate?!result:result;
  }
  path=this.isWindows?windows(path):path;if(partial&&path==='/')return true;
  let file=split(path,this.options);if((this.options.optimizationLevel??1)>=2)file=optimize(file,2,false,this.isWindows);
  file=file.map(p=>norm(p,this.options));
  let found=false;for(const row of this.set){
   const candidate=this.options.matchBase&&row.length===1?[file.findLast(p=>p!=='')??'']:file;
   if(this.matchOne(candidate,row,partial)){found=true;break;}
  }return this.options.flipNegate?found:this.negate?!found:found;
 }
 matchOne(file,row,partial=false){
  const equal=(value,token,index)=>typeof token==='string'?(value===token||this.isWindows&&(index===0&&/^[a-z]:$/i.test(token)||row[0]===''&&row[1]===''&&index<4)&&value.toLowerCase()===token.toLowerCase()):token.test(value);
  const star=row.indexOf(GLOBSTAR);
  if(star<0){
   for(let i=0;i<row.length;i++){if(i===file.length)return !!partial;if(!equal(file[i],row[i],i))return false;}
   return file.length===row.length||file.length===row.length+1&&file.at(-1)==='';
  }
  if(!partial&&star===row.lastIndexOf(GLOBSTAR)){
   for(let i=0;i<star;i++)if(i===file.length||!equal(file[i],row[i],i))return false;
   if(star===file.length)return false;
   let end=file.length;if(row.at(-1)!==GLOBSTAR&&row.at(-1)!==''&&file.at(-1)==='')end--;
   const tail=row.length-star-1;if(end-star<tail)return false;
   for(let i=1;i<=tail;i++)if(!equal(file[end-i],row[row.length-i],row.length-i))return false;
   for(let i=star;i<end-tail;i++)if(file[i]==='.'||file[i]==='..'||!this.options.dot&&file[i][0]==='.')return false;
   return true;
  }
  const todo=[[0,0]],seen=new Set();let steps=20000000;
  while(todo.length){if(--steps<0)throw new RangeError('glob path work limit exceeded');const [f,p]=todo.pop(),key=f*(row.length+1)+p;if(seen.has(key))continue;seen.add(key);
   if(p===row.length){if(f===file.length||f===file.length-1&&file[f]==='')return true;continue;}
   if(f===file.length){if(partial)return true;continue;}
   const token=row[p],value=file[f];
   if(token===GLOBSTAR){todo.push([f,p+1]);if(value!=='.'&&value!=='..'&&(this.options.dot||value[0]!=='.')){
     if(p===row.length-1&&f===file.length-1)return true;todo.push([f+1,p]);
    }}else if(typeof token==='string'?(value===token||this.isWindows&&(f===0&&/^[a-z]:$/i.test(token)||row[0]===''&&row[1]===''&&p<4)&&value.toLowerCase()===token.toLowerCase()):token.test(value))todo.push([f+1,p+1]);
  }return false;
 }
 // Compatibility adapter for older callers using only RegExp.test/exec. This
 // object is intentionally not a serializable native regular expression.
 makeRe(){if(this.comment||!this.set.length)return false;const self=this;return new(class extends RegExp{constructor(){super('(?!)');}test(s){return self.match(s);}exec(s){if(!this.test(s))return null;return Object.assign([s],{index:0,input:s,groups:undefined});}})();}
 static defaults(options){const Parent=this;return class extends Parent{constructor(p,o){super(p,{...options,...o});}static defaults(o){return Parent.defaults({...options,...o});}};}
}
// Only the function's private default-options matchers are cached. Public
// Minimatch instances remain independent, and mutable caller options are never
// used as identity keys. The FIFO has a hard 64-pattern bound.
const functionCache=new Map();
function minimatch(path,pattern,options){
 if(options!==undefined)return new Minimatch(pattern,options).match(path);
 let matcher=functionCache.get(pattern);
 if(!matcher){matcher=new Minimatch(pattern);if(functionCache.size===64)functionCache.delete(functionCache.keys().next().value);functionCache.set(pattern,matcher);}
 return matcher.match(path);
}
function filter(pattern,options){const m=new Minimatch(pattern,options);return path=>m.match(path);}
function match(list,pattern,options={}){const m=new Minimatch(pattern,options),out=list.filter(p=>m.match(p));return !out.length&&options.nonull?[pattern]:out;}
function defaults(options={}){
 const fn=(path,pattern,o)=>minimatch(path,pattern,{...options,...o});
 Object.assign(fn,{minimatch:fn,sep,GLOBSTAR,Minimatch:Minimatch.defaults(options),filter:(p,o)=>filter(p,{...options,...o}),match:(l,p,o)=>match(l,p,{...options,...o}),braceExpand:(p,o)=>braceExpand(p,{...options,...o}),escape:(s,o)=>escape(s,{...options,...o}),unescape:(s,o)=>unescape(s,{...options,...o}),makeRe:(p,o)=>new Minimatch(p,{...options,...o}).makeRe(),defaults:o=>defaults({...options,...o})});return fn;
}
const sep=require('node:path').sep;
Object.assign(minimatch,{minimatch,Minimatch,GLOBSTAR,sep,filter,match,defaults,braceExpand,escape,unescape,makeRe:(p,o)=>new Minimatch(p,o).makeRe()});module.exports=minimatch;
