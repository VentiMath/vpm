'use strict';
// Normalize serialization differences, not geometry or mathematical structure.
module.exports=function canonical(node){
 if(node.nodeType===3)return node.nodeValue;
 const attributes=Array.from(node.attributes||[],a=>({name:a.name,value:a.value}));
 // React emits the fixed oblique MathML rule as a shared class because jsdom
 // lacks MathMLElement.style. Its computed value is independently checked in
 // Chrome; normalize only that explicit presentation-equivalent spelling.
 const slant=attributes.find(a=>a.name==='class'&&a.value==='vlx-slanted');
 if(slant){slant.name='style';slant.value='font-style:oblique';}
 const attrs=attributes.map(a=>{
  if(a.name!=='style')return [a.name,a.value];
  const probe=node.ownerDocument.createElement('span');probe.setAttribute('style',a.value);const style=probe.style;
  return [a.name,Array.from(style).sort().map(name=>[name,style.getPropertyValue(name),style.getPropertyPriority(name)])];
 }).sort(([a],[b])=>a.localeCompare(b));
 return [node.namespaceURI,node.localName,attrs,Array.from(node.childNodes,canonical)];
};
