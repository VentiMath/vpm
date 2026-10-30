'use strict';
const {record,limit,hook,name:validateName}=require('./options.js');
const XML=Object.freeze(Object.assign(Object.create(null),{amp:'&',apos:"'",gt:'>',lt:'<',quot:'"'}));
const EMPTY=Object.freeze(Object.create(null));
const LEVEL=Object.freeze(Object.assign(Object.create(null),{allow:0,leave:1,remove:2,throw:3}));
const ENTITY_ACTION=Object.freeze({ALLOW:'allow',BLOCK:'block',THROW:'throw'});
function action(value,fallback,name){if(value===undefined)return fallback;if(typeof value!=='string'||!Object.hasOwn(LEVEL,value))throw new TypeError('Invalid '+name);return LEVEL[value];}
function tiers(value){if(value===undefined||value==='external')return 1;if(value==='base')return 2;if(value==='all')return 3;if(Array.isArray(value)){let result=0;for(const item of value){if(item!=='external'&&item!=='base')throw new TypeError('Invalid applyLimitsTo tier');result|=item==='external'?1:2;}return result;}throw new TypeError('Invalid applyLimitsTo');}
function tokenSet(value,name){if(value==null)return null;if(!Array.isArray(value))throw new TypeError(name+' must be an array');const set=new Set(value.filter(item=>typeof item==='string'));return set.size?set:null;}
function flatten(map,registrationHook,context,out){
 if(map==null)return EMPTY;record(map,'Entity map');if(!out)out=Object.create(null);
 for(const key of Object.keys(map)){
  validateName(key);let value=map[key];
  if(value&&typeof value==='object'&&Object.hasOwn(value,'val'))value=value.val;
  // Legacy regex fields are ignored; function values are never executed.
  if(typeof value!=='string')continue;
  if(registrationHook){const decision=registrationHook(key,value);if(decision==='block')continue;if(decision==='throw')throw new Error(`Registration of ${context} entity "&${key};" was rejected by hook`);if(decision!=='allow')throw new TypeError('Registration hook must return allow, block, or throw');}
  out[key]=value;
 }
 return out;
}
function codepoint(token){
 let i=1,base=10,result=0;
 if(token.charCodeAt(i)===120||token.charCodeAt(i)===88){base=16;i++;}
 if(i===token.length)return -1;
 for(;i<token.length;i++){const c=token.charCodeAt(i);const digit=c>=48&&c<=57?c-48:base===16&&c>=65&&c<=70?c-55:base===16&&c>=97&&c<=102?c-87:-1;if(digit<0||digit>=base)return -1;result=result*base+digit;if(result>0x10ffff)return -1;}
 return result;
}
class EntityDecoder {
 #base; #external=EMPTY; #input=EMPTY;
 #maxCount; #maxLength; #tiers; #count=0; #length=0;
 #post; #externalHook; #inputHook; #remove; #leave;
 #numeric; #xml; #initialXml; #on; #null; #busy=false;
 constructor(options={}){
  record(options,'Options');const rawLimit=options.limit,rawNCR=options.ncr,named=options.namedEntities;
  const limits=rawLimit===undefined?{}:record(rawLimit,'limit'),ncr=rawNCR===undefined?{}:record(rawNCR,'ncr');
  this.#maxCount=limit(limits.maxTotalExpansions,'maxTotalExpansions');this.#maxLength=limit(limits.maxExpandedLength,'maxExpandedLength');this.#tiers=tiers(limits.applyLimitsTo);
  this.#post=hook(options.postCheck,'postCheck');this.#externalHook=hook(options.onExternalEntity,'onExternalEntity');this.#inputHook=hook(options.onInputEntity,'onInputEntity');
  const numeric=options.numericAllowed; // The XML caller forwards its htmlEntities map here.
  if(numeric!=null&&typeof numeric!=='boolean'&&(typeof numeric!=='object'||Array.isArray(numeric)))throw new TypeError('numericAllowed must be a boolean or an entity map');
  this.#numeric=numeric==null?true:!!numeric;
  this.#xml=this.#initialXml=ncr.xmlVersion===1.1?1.1:1;
  this.#on=action(ncr.onNCR,0,'onNCR');this.#null=Math.max(2,action(ncr.nullNCR,2,'nullNCR'));
  this.#remove=tokenSet(options.remove,'remove');this.#leave=tokenSet(options.leave,'leave');
  this.#base=named==null?XML:flatten(named,null,'base',{__proto__:null,amp:'&',apos:"'",gt:'>',lt:'<',quot:'"'});
 }
 #available(){if(this.#busy)throw new Error('EntityDecoder cannot be reentered from a hook or entity getter');}
 setExternalEntities(map){this.#available();this.#busy=true;try{const next=flatten(map,this.#externalHook,'external');this.#external=next;}finally{this.#busy=false;}}
 addExternalEntity(key,value){this.#available();this.#busy=true;try{validateName(key);if(typeof value!=='string')throw new TypeError('Entity value must be a string');const next=flatten({[key]:value},this.#externalHook,'external');if(Object.hasOwn(next,key)){if(this.#external===EMPTY)this.#external=Object.create(null);this.#external[key]=next[key];}}finally{this.#busy=false;}}
 addInputEntities(map){this.#available();this.#busy=true;try{const next=flatten(map,this.#inputHook,'input');this.#input=next;this.#count=0;this.#length=0;}finally{this.#busy=false;}}
 reset(){this.#available();this.#input=EMPTY;this.#count=0;this.#length=0;this.#xml=this.#initialXml;return this;}
 setXmlVersion(version){this.#available();this.#xml=version===1.1?1.1:1;}
 #numericValue(token){
  const cp=codepoint(token);if(cp<0)return undefined;
  let minimum=0;
  if(cp===0)minimum=this.#null;
  else if(cp>=0xd800&&cp<=0xdfff||cp===0xfffe||cp===0xffff||this.#xml===1&&cp<32&&cp!==9&&cp!==10&&cp!==13)minimum=2;
  if(!this.#numeric&&minimum<2)return undefined;
  const mode=Math.max(minimum,this.#on);
  if(mode===1)return undefined;if(mode===2)return '';
  if(mode===3)throw new Error(`Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4,'0')})`);
  return String.fromCodePoint(cp);
 }
 #postCheck(result,original){if(!this.#post)return result;this.#busy=true;try{const post=this.#post;const checked=post(result,original);if(typeof checked!=='string')throw new TypeError('postCheck must return a string');return checked;}finally{this.#busy=false;}}
 decode(str){
  this.#available();if(typeof str!=='string')return str;
  let i=str.indexOf('&');if(i<0)return this.#postCheck(str,str);
  let last=0,result='';const check=this.#maxCount>0||this.#maxLength>0;
  while(i>=0){
   let end=i+1;for(;end<str.length;end++){const c=str.charCodeAt(end);if(c===38||c===59)break;}
   if(end===str.length)break;
   if(str.charCodeAt(end)===38){i=end;continue;}
   const token=str.slice(i+1,end);let value,tier=1;
   if(this.#remove?.has(token))value='';
   else if(this.#leave?.has(token)){i=str.indexOf('&',end+1);continue;}
   else if(token.charCodeAt(0)===35){value=this.#numericValue(token);tier=2;}
   else{value=this.#input[token];if(value===undefined)value=this.#external[token];if(value===undefined){value=this.#base[token];tier=2;}}
   if(value!==undefined){
    // Charge before adding output; attempted replacements stay charged even
    // when a limit or postCheck rejects the call. Registration is atomic.
    if(check&&(this.#tiers&tier)){
     if(this.#maxCount&&++this.#count>this.#maxCount)throw new Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this.#count} > ${this.#maxCount}`);
     const added=value.length-(end-i+1);
     if(this.#maxLength&&added>0&&(this.#length+=added)>this.#maxLength)throw new Error(`[EntityReplacer] Expanded content length limit exceeded: ${this.#length} > ${this.#maxLength}`);
    }
    result+=str.slice(last,i)+value;last=end+1;
   }
   i=str.indexOf('&',end+1);
  }
  return this.#postCheck(last?result+str.slice(last):str,str);
 }
}
exports.EntityDecoder=EntityDecoder;exports.ENTITY_ACTION=ENTITY_ACTION;
