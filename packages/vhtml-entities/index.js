'use strict';
const {namedReferences,bodyRegExps,numericUnicodeMap}=require('./lib/data');
const special=/[<>'"&]/g;
const patterns={
  nonAscii:/[<>'"&\u0080-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
  nonAsciiPrintable:/[<>'"&\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
  nonAsciiPrintableOnly:/[\x01-\x08\x11-\x15\x17-\x1F\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,
  extensive:/[\x01-\x0c\x0e-\x1f\x21-\x2c\x2e-\x2f\x3a-\x40\x5b-\x60\x7b-\x7d\x7f-\uD7FF\uE000-\uFFFF\uDC00-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g
};
const strict=/&(?:#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+);/g;
// '=' blocks an unterminated named reference, but never a numeric reference.
const attribute=/&(?:#\d+;?|#[xX][\da-fA-F]+;?|[0-9a-zA-Z]+[;=]?)/g;
function options(value){if(value===null||typeof value!=='object'||Array.isArray(value))throw new TypeError('options must be an object');return value;}
function own(object,key,fallback){if(!Object.hasOwn(object,key))return fallback;const value=object[key];return value===undefined?fallback:value;}
function level(value){if(value==='all')return 'html5';if(value!=='xml'&&value!=='html4'&&value!=='html5')throw new TypeError('invalid entity level');return value;}
function text(value,numbers=false){if(value==null)return '';if(typeof value==='string')return value;if(numbers&&typeof value==='number')return String(value);throw new TypeError('text must be a string'+(numbers?' or number':''));}
function scalar(code){
  if(code===0||code>0x10ffff||(code>=0xd800&&code<=0xdfff))return '\ufffd';
  return String.fromCodePoint(numericUnicodeMap[code]||code);
}
function numeric(entity){
  const hex=entity.charCodeAt(2)===120||entity.charCodeAt(2)===88;
  return scalar(parseInt(entity.slice(hex?3:2),hex?16:10));
}
function singleNumeric(input){
  const hex=input.charCodeAt(2)===120||input.charCodeAt(2)===88,base=hex?16:10,start=hex?3:2;
  let index=start,code=0;
  for(;index<input.length;index++){
    const unit=input.charCodeAt(index);
    const digit=unit>=48&&unit<=57?unit-48:hex&&unit>=65&&unit<=70?unit-55:hex&&unit>=97&&unit<=102?unit-87:-1;
    if(digit<0)break;
    // Saturation avoids precision loss while still validating every input digit.
    if(code<=0x10ffff)code=code*base+digit;
  }
  if(index===start||(input.charCodeAt(index)===59?index+1:index)!==input.length)return input;
  return scalar(code);
}
function escapeSpecial(input){
  special.lastIndex=0;if(!special.test(input))return input;
  let output='',last=0,index=special.lastIndex-1;
  while(index<input.length){
    let replacement;
    switch(input.charCodeAt(index)){
      case 34:replacement='&quot;';break;
      case 38:replacement='&amp;';break;
      case 39:replacement='&apos;';break;
      case 60:replacement='&lt;';break;
      case 62:replacement='&gt;';break;
      default:
        if(index-last<16){index++;continue;}
        special.lastIndex=index+1;if(!special.test(input))return output+input.slice(last);
        index=special.lastIndex-1;continue;
    }
    output+=input.slice(last,index)+replacement;last=++index;
  }
  return output+input.slice(last);
}
function encode(value,configuration){
  const input=text(value,true);let selected='html5',mode='specialChars',format='decimal';
  if(configuration!==undefined){const opts=options(configuration);selected=level(own(opts,'level','all'));mode=own(opts,'mode','specialChars');format=own(opts,'numeric','decimal');}
  if(format!=='decimal'&&format!=='hexadecimal')throw new TypeError('invalid numeric format');
  if(mode==='specialChars')return escapeSpecial(input);
  if(typeof mode!=='string'||!Object.hasOwn(patterns,mode))throw new TypeError('invalid encoding mode');
  const references=namedReferences[selected].characters,hex=format==='hexadecimal';
  return input.replace(patterns[mode],character=>{
    const named=references[character];if(named!==undefined)return named;
    const code=character.length===1?character.charCodeAt(0):character.codePointAt(0);
    return (hex?'&#x'+code.toString(16):'&#'+code)+';';
  });
}
function decodeEntity(value,configuration){
  const input=text(value);const selected=configuration===undefined?'html5':level(own(options(configuration),'level','all'));
  if(input.charCodeAt(0)===38&&input.charCodeAt(1)===35)return singleNumeric(input);
  const found=namedReferences[selected].entities[input];if(found!==undefined)return found;
  return input;
}
function decode(value,configuration){
  const input=text(value);let selected='html5',scope='body';
  if(configuration!==undefined){const opts=options(configuration);selected=level(own(opts,'level','all'));scope=own(opts,'scope',selected==='xml'?'strict':'body');}
  if(scope!=='body'&&scope!=='strict'&&scope!=='attribute')throw new TypeError('invalid decoding scope');
  if(input.indexOf('&')===-1)return input;
  const references=namedReferences[selected].entities,pattern=scope==='strict'?strict:scope==='attribute'?attribute:bodyRegExps[selected];
  return input.replace(pattern,entity=>entity.charCodeAt(1)===35?numeric(entity):(references[entity]??entity));
}
exports.encode=encode;
exports.decode=decode;
exports.decodeEntity=decodeEntity;
