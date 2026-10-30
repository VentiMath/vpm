'use strict';
const {record,limit,name:validateName}=require('./options.js');
const XML=new Array(64).fill(null);
XML[34]='&quot;';XML[38]='&amp;';XML[39]='&apos;';XML[60]='&lt;';XML[62]='&gt;';
const XML_RE=/[&<>"']/;
const cache=new WeakMap();
function build(map){
 record(map,'namedEntities');const prior=cache.get(map);if(prior)return prior;
 const root=new Map();let immutable=Object.isFrozen(map);
 for(const name of Object.keys(map)){
  validateName(name);const value=map[name];if(typeof value!=='string'||value.length===0)throw new TypeError('Named entity values must be nonempty strings');
  if(!Object.hasOwn(Object.getOwnPropertyDescriptor(map,name),'value'))immutable=false;
  let children=root,node;for(let i=0;i<value.length;i++){const code=value.charCodeAt(i);node=children.get(code);if(!node)children.set(code,node={value:undefined,children:null});if(i+1<value.length)children=node.children||(node.children=new Map());}node.value='&'+name+';';
 }
 const codes=[...root.keys()].filter(c=>XML[c]==null);
 const entries={root,plain:codes.length?new RegExp('['+codes.map(c=>'\\u'+c.toString(16).padStart(4,'0')).join('')+']'):null};
 entries.xml=codes.length?new RegExp('[&<>"\''+codes.map(c=>'\\u'+c.toString(16).padStart(4,'0')).join('')+']'):XML_RE;
 if(immutable)cache.set(map,entries);return entries;
}
class EntityEncoder {
 #xml; #named; #max; #count=0; #trie; #needs;
 constructor(options={}){
  record(options,'Options');const xml=options.encodeXmlSafe,named=options.encodeAllNamed;
  if(xml!==undefined&&typeof xml!=='boolean'||named!==undefined&&typeof named!=='boolean')throw new TypeError('Encoding flags must be boolean');
  this.#xml=xml!==false;this.#named=named!==false;this.#max=limit(options.maxReplacements,'maxReplacements');
  if(this.#named){const entities=options.namedEntities;if(entities==null)throw new TypeError('namedEntities is required when encodeAllNamed is true');const built=build(entities);this.#trie=built.root;this.#needs=this.#xml?built.xml:built.plain;}
  else{this.#trie=null;this.#needs=this.#xml?XML_RE:null;}
 }
 get encodeXmlSafe(){return this.#xml;} get encodeAllNamed(){return this.#named;} get maxReplacements(){return this.#max;} get replacementsCount(){return this.#count;}
 #inspection(length){
  if(!this.#trie)return null;
  function copy(children,remaining){const out=new Map();for(const [code,node]of children){if(remaining===1){if(node.value!==undefined)out.set(code,node.value);}else if(node.children){const nested=copy(node.children,remaining-1);if(nested.size)out.set(code,nested);}}return out;}
  return copy(this.#trie,length);
 }
 get trie1(){return this.#inspection(1);}get trie2(){return this.#inspection(2);}get trie3(){return this.#inspection(3);}
 reset(){this.#count=0;}
 encode(str){
  if(typeof str!=='string'||!str||!this.#needs||this.#max&&this.#count>=this.#max)return str;
  const firstCode=str.charCodeAt(0);let start=0;
  if(!(this.#xml&&firstCode<64&&XML[firstCode]!==null)){const first=this.#needs.exec(str);if(!first)return str;start=first.index;}
  let result='',last=0;
  for(let i=start;i<str.length;){
   const code=str.charCodeAt(i);let value,advance=1;
   const escaped=code<64?XML[code]:null;
   if(escaped!==null){if(this.#xml)value=escaped;}
   else if(this.#trie){let node=this.#trie.get(code),j=i+1;while(node){if(node.value!==undefined){value=node.value;advance=j-i;}if(j===str.length||!node.children)break;node=node.children.get(str.charCodeAt(j++));}}
   if(value!==undefined){result+=str.slice(last,i)+value;i+=advance;last=i;if(this.#max&&++this.#count>=this.#max)break;}
   else i++;
  }
  return last?result+str.slice(last):str;
 }
}
exports.EntityEncoder=EntityEncoder;
