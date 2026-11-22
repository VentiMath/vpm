'use strict';
// Preserve the original outline output while adding browser-native selectable
// text to the web view. Identical children share their output until a glyph
// needs a text counterpart; SVG/PNG exports retain their original paths.
module.exports=function selectionOutput(base){
 const glyphs=new Map(),descriptors=Object.create(null);
 const fields={text:['font','operator'],font:['font'],style:['style'],decoration:['style'],fenced:['left','right'],table:['name'],color:['color'],class:['class'],stack:['under'],cell:['row','col','count'],space:['width']};
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
  semantic(ast,out){
   // Only web output carries the selection tree. It contains structural flags,
   // never a second copy of the source or a change to exported outline geometry.
   let props;
   if(ast.kind==='scripts'){
    const key='scripts'+!!ast.sup+!!ast.sub;
    props=descriptors[key]||(descriptors[key]={'data-vlx-tex':JSON.stringify({kind:'scripts',sup:!!ast.sup,sub:!!ast.sub})});
   }else if(fields[ast.kind]){
    const meta={kind:ast.kind};for(const key of fields[ast.kind])if(ast[key]!==undefined)meta[key]=ast[key];
    props={'data-vlx-tex':JSON.stringify(meta)};
   }else {
    const kind=(ast.kind==='row'||ast.kind==='textrow')&&ast.children.some(a=>a.kind==='linebreak')?'lines':ast.kind;
    props=descriptors[kind]||(descriptors[kind]={'data-vlx-tex':kind});
   }
   return {ink:pick(out,'ink'),web:base.element('g',props,pick(out,'web'))};
  },
  pick
 };
};
