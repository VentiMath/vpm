'use strict';
const defaults={escapeEverything:false,isIdentifier:false,quotes:'single',wrap:false};
const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
function cssesc(value,options){
 if(typeof value!=='string')throw new TypeError('vcssesc expects a string');
 const setting=k=>own(options,k)?options[k]:own(cssesc.options,k)?cssesc.options[k]:defaults[k];
 const identifier=!!setting('isIdentifier'),all=!!setting('escapeEverything'),quote=setting('quotes')==='double'?'"':"'",wrap=!!setting('wrap');
 if(!all&&(identifier?/^(?:[A-Za-z_]|-[A-Za-z_])[A-Za-z0-9_-]*$/.test(value):(!/[\x00-\x1f\x7f-\uffff\\]/.test(value)&&!value.includes(quote))))return wrap&&!identifier?quote+value+quote:value;
 let result='',hexPending=false;
 for(let i=0;i<value.length;){
  const index=i,point=value.codePointAt(i);i+=point>0xffff?2:1;
  const char=value[index],letter=(point>=65&&point<=90)||(point>=97&&point<=122),digit=point>=48&&point<=57;
  let piece,hex=false;
  if(point<32||point>126||(all&&(letter||digit||point===45||point===95))||(identifier&&index===0&&digit)){
   piece='\\'+point.toString(16).toUpperCase();hex=true;
  }else if(all||point===92||(!identifier&&char===quote)||(identifier&&(!letter&&!digit&&point!==45&&point!==95))||(identifier&&index===0&&point===45&&(value.length===1||value[1]==='-'||/\d/.test(value[1]))))piece='\\'+char;
  else piece=char;
  // Terminate a hex escape only when the next emitted token could extend or
  // consume it. Escaped punctuation never needs a separator. No cleanup regex
  // or second leading-character pass can corrupt an already escaped prefix.
  if(hexPending&&/^[\da-fA-F ]/.test(piece))result+=' ';
  result+=piece;hexPending=hex;
 }
 return wrap&&!identifier?quote+result+quote:result;
}
cssesc.options={...defaults};cssesc.version='3.0.0';module.exports=cssesc;
