'use strict';
// Internal output tree. Strings are text, never pre-rendered markup.
function element(tag,props,...children){return {tag,props,children};}
// A conservative cache weight, including node/attribute records and text. It
// bounds retained output, not the JS engine's exact heap accounting.
function weight(node){
 if(node==null)return 0;
 if(typeof node==='string')return node.length*2;
 if(Array.isArray(node))return 24+node.reduce((n,child)=>n+weight(child),0);
 let size=160+node.tag.length*2;
 for(const [key,value]of Object.entries(node.props||{}))size+=32+key.length*2+(typeof value==='object'?JSON.stringify(value).length:String(value).length)*2;
 return size+weight(node.children);
}
exports.element=element;exports.group=(transform,children)=>element('g',{transform},children);exports.text=value=>value;exports.weight=weight;
exports.start=()=>[];exports.append=(output,child)=>{output.push(child);return output;};
