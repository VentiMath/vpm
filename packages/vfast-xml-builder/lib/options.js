'use strict';
module.exports=function normalize(defaults,input){
  if(input===undefined)input={};
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Options must be an object');
  const options={...defaults,...input};
  for(const name of ['format','preserveOrder','processEntities','suppressEmptyNode','suppressUnpairedNode','suppressBooleanAttributes','oneListGroup','jPath'])options[name]=!!options[name];
  for(const name of ['attributeNamePrefix','textNodeName','indentBy'])if(typeof options[name]!=='string')throw new TypeError(name+' must be a string');
  for(const name of ['attributesGroupName','cdataPropName','commentPropName'])if(options[name]!==false&&(typeof options[name]!=='string'||!options[name]))throw new TypeError(name+' must be false or a nonempty string');
  if(options.arrayNodeName!==undefined&&(typeof options.arrayNodeName!=='string'||!options.arrayNodeName))throw new TypeError('arrayNodeName must be a nonempty string');
  const max=options.maxNestedTags;
  if(!Number.isSafeInteger(max)||max<0)throw new RangeError('maxNestedTags must be a nonnegative safe integer');
  for(const name of ['tagValueProcessor','attributeValueProcessor'])if(typeof options[name]!=='function')throw new TypeError(name+' must be a function');
  if(options.sanitizeName!==false&&typeof options.sanitizeName!=='function')throw new TypeError('sanitizeName must be false or a function');
  if(typeof options.ignoreAttributes!=='boolean'&&typeof options.ignoreAttributes!=='function'&&!Array.isArray(options.ignoreAttributes))throw new TypeError('Invalid ignoreAttributes');
  if(Array.isArray(options.ignoreAttributes))options.ignoreAttributes=Object.freeze(options.ignoreAttributes.map(x=>{
    if(typeof x==='string')return x;
    if(x instanceof RegExp)return new RegExp(x.source,x.flags);
    throw new TypeError('Attribute filters must be strings or regular expressions');
  }));
  for(const key of ['unpairedTags','stopNodes']){
    if(!Array.isArray(options[key]))throw new TypeError(key+' must be an array');
    options[key]=options[key].slice();
  }
  if(options.unpairedTags.some(x=>typeof x!=='string'))throw new TypeError('unpairedTags must contain strings');
  if(options.entities===defaults.entities)options.entities=null; // Shared fast path, not a mutable regex list.
  else {
    if(!Array.isArray(options.entities))throw new TypeError('entities must be an array');
    options.entities=Object.freeze(options.entities.map(e=>{
      if(!e||!(e.regex instanceof RegExp)||(typeof e.val!=='string'&&typeof e.val!=='function'))throw new TypeError('Invalid entity replacement');
      return Object.freeze({regex:new RegExp(e.regex.source,e.regex.flags),val:e.val});
    }));
  }
  return options;
};
