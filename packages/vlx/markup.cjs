'use strict';
// String emitter for the same layout operations used by the structured output.
// Only text() escapes source text; element() receives already-rendered children.
const {escape}=require('./source.cjs');
const names={className:'class',strokeWidth:'stroke-width',strokeLinejoin:'stroke-linejoin',strokeDasharray:'stroke-dasharray',strokeDashoffset:'stroke-dashoffset'};
const cssNames=new Map(),styles=new WeakMap();
function cssName(name){let value=cssNames.get(name);if(value===undefined){value=name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());cssNames.set(name,value);}return value;}
function text(value){return escape(value).replace(/\u0338/g,'&#x338;');}
function join(value){
 if(value==null)return '';
 if(typeof value==='string')return value;
 let result='';for(const item of value)result+=join(item);return result;
}
function element(tag,props,...children){
 let attrs='';
 if(props)for(const key in props){
  const value=props[key];if(value==null)continue;
  let encoded;
  if(key==='style'){encoded=styles.get(value);if(encoded===undefined){encoded='';for(const name in value)encoded+=(encoded?';':'')+cssName(name)+':'+value[name];encoded=escape(encoded);if(Object.isFrozen(value))styles.set(value,encoded);}}
  else encoded=escape(String(value));
  attrs+=' '+(names[key]||key)+'="'+encoded+'"';
 }
 const content=children.length===1?join(children[0]):join(children);
 return content?'<'+tag+attrs+'>'+content+'</'+tag+'>':'<'+tag+attrs+'/>';
}
// Only layout-generated numeric transforms reach this fast operation.
exports.group=(transform,children)=>'<g transform="'+transform+'">'+join(children)+'</g>';
exports.start=()=>'';exports.append=(output,child)=>output+join(child);
exports.element=element;exports.text=text;exports.join=join;
