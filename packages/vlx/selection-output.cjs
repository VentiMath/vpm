'use strict';
// Preserve the original outline output while adding browser-native selectable
// text to the web view. Identical children share their output until a glyph
// needs a text counterpart; SVG/PNG exports retain their original paths.
module.exports=function selectionOutput(base){
 const glyphs=new Map();
 const wrap=value=>({ink:value,web:value});
 const pick=(value,key)=>Array.isArray(value)?value.map(v=>pick(v,key)):value&&typeof value==='object'&&Object.hasOwn(value,'ink')?value[key]:value;
 const same=value=>Array.isArray(value)?value.every(same):!value||typeof value!=='object'||!Object.hasOwn(value,'ink')||value.ink===value.web;
 const element=(tag,props,...children)=>{
  const ink=base.element(tag,props,...children.map(v=>pick(v,'ink')));
  return {ink,web:children.every(same)?ink:base.element(tag,props,...children.map(v=>pick(v,'web')))};
 };
 return {
  element,text:value=>wrap(base.text(value)),start:()=>wrap(base.start()),
  append(out,child){
   // Node emitters append in place; each branch needs its own array.
   if(out.ink===out.web&&Array.isArray(out.ink))out.web=out.web.slice();
   out.ink=base.append(out.ink,pick(child,'ink'));
   out.web=base.append(out.web,pick(child,'web'));return out;
  },
  group(transform,child){
   const ink=base.group(transform,pick(child,'ink'));
   return {ink,web:same(child)?ink:base.group(transform,pick(child,'web'))};
  },
  glyph(outline,char,width,height,depth){
   const ink=pick(outline,'ink');
   let font=glyphs.get(char);if(!font)glyphs.set(char,font=new Map());
   const previous=font.get(ink);
   if(previous&&previous.width===width&&previous.height===height&&previous.depth===depth)return previous.output;
   const text=base.element('text',{className:'vlx-select',x:0,y:-height,fontSize:(height+depth)*.8,fontFamily:'serif',dominantBaseline:'text-before-edge',textLength:width,lengthAdjust:'spacingAndGlyphs',fill:'transparent',style:{userSelect:'text',cursor:'text'}},base.text(char));
   const output={ink,web:[ink,text]};font.set(ink,{width,height,depth,output});return output;
  },
  pick
 };
};
