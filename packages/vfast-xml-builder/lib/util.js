

// String(val)/val.toString() drop the sign of -0 (e.g. String(-0) === '0'), silently
// corrupting a round-tripped negative-zero value. XML has no separate int/float syntax,
// so this is the single place every raw value gets turned into text.
function valToStr(val) {
  return typeof val === 'number' && Object.is(val, -0) ? '-0' : String(val)
}

function safeComment(val) {
  return valToStr(val)
    .replace(/--/g, '- -')   // -- is illegal anywhere in comment content
    .replace(/--/g, '- -')   // Separate remaining pairs in longer runs.
    .replace(/-$/, '- ');    // trailing - would form -- with the closing -->
}

function safeCdata(val) {
  return valToStr(val).replace(/\]\]>/g, ']]]]><![CDATA[>')
}

function escapeAttribute(val) {
  return valToStr(val).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

Object.assign(exports,{valToStr,safeComment,safeCdata,escapeAttribute});

const escaped=new Array(64).fill(null);
escaped[38]='&amp;';escaped[60]='&lt;';escaped[62]='&gt;';escaped[39]='&apos;';escaped[34]='&quot;';
const unsafe=/[&<>"']/;
function escapeXML(text){
  let i=text.search(unsafe);if(i<0)return text;
  let output='',last=0;
  for(;i<text.length;i++){
    const code=text.charCodeAt(i),replacement=code<64?escaped[code]:null;
    if(replacement!==null){output+=text.slice(last,i)+replacement;last=i+1;}
  }
  return output+text.slice(last);
}
function replaceEntities(value,options){
  if(typeof value==='boolean')return value;
  const text=valToStr(value);
  if(!options.processEntities||!text)return text;
  if(options.entities===null)return escapeXML(text);
  let result=text;
  for(const entity of options.entities){entity.regex.lastIndex=0;try{result=result.replace(entity.regex,entity.val);}finally{entity.regex.lastIndex=0;}}
  return result;
}
function checkDepth(depth,options){if(options.maxNestedTags&&depth>options.maxNestedTags)throw new Error('Maximum nested tags exceeded');}
function enter(active,value){if(active.has(value))throw new TypeError('Cyclic XML input');active.add(value);}
function own(object,key){return object!=null&&Object.hasOwn(object,key)?object[key]:undefined;}
Object.assign(exports,{replaceEntities,checkDepth,enter,own});
