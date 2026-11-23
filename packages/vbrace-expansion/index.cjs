'use strict';
const {range}=require('vbalanced-match');
const EXPANSION_MAX=100000,EXPANSION_MAX_LENGTH=4000000,EXPANSION_MAX_DEPTH=1000,EXPANSION_MAX_REWRITES=1000,EXPANSION_MAX_STEPS=20000000;
const defaults={max:EXPANSION_MAX,maxLength:EXPANSION_MAX_LENGTH,maxDepth:EXPANSION_MAX_DEPTH,maxRewrites:EXPANSION_MAX_REWRITES,maxSteps:EXPANSION_MAX_STEPS};
const escaped=/\\([\\{},.])/g;
const decode=s=>s.indexOf('\\')<0?s:s.replace(escaped,'$1');
const size=s=>s.indexOf('\\')<0?s.length:decode(s).length;
// A same-width lexical mask keeps original offsets and literal NUL/private-use
// characters intact. No random sentinels are inserted into user strings.
function mask(source){return source.replace(escaped,'\0\0');}
function bounds(options){
 if(options===undefined)return defaults;
 if(options===null||typeof options!=='object')throw new TypeError('Options must be an object');
 const out={};for(const key of Object.keys(defaults)){
  const n=options[key];if(n!==undefined&&typeof n!=='number')throw new TypeError(key+' must be a number');
  out[key]=n===undefined||Number.isNaN(n)?defaults[key]:Math.max(0,Math.floor(n));
 }return out;
}
function spend(context,n){context.steps-=n;return context.steps>=0;}
// One bounded accumulator per active frame. Charge characters *before* making
// products, so a small result count cannot hide arbitrarily large allocations.
function product(left,prefix,right,drop,context,charge=true){
 const result=[],limit=context.limits;let chars=0;
 let nonempty;
 for(const a of left){const head=a+prefix,items=drop&&!head?(nonempty??=right.filter(Boolean)):right;
  for(const b of items){
   if(result.length>=limit.max)return result;
   const length=size(head)+size(b);if(chars+length>limit.maxLength)return result;
   if(charge&&!spend(context,length+1))return undefined;
   result.push(head+b);chars+=length;
  }
 }return result;
}
function parts(body,lex){
 const result=[];let depth=0,start=0;
 for(let i=0;i<lex.length;i++){
  const c=lex.charCodeAt(i);if(c===123)depth++;else if(c===125)depth--;else if(c===44&&depth===0){result.push(body.slice(start,i));start=i+1;}
 }result.push(body.slice(start));return result;
}
function laterComma(lex){
 let close=false;
 for(let i=lex.length-1;i>=0;i--){const c=lex.charCodeAt(i);
  if(c===125)close=true;else if(c===10||c===13||c===8232||c===8233)close=false;
  else if(c===44&&close&&lex.charCodeAt(i+1)!==44)return true;
 }return false;
}
function sequence(body,context){
 const numeric=/^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(body);
 const alpha=numeric?null:/^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.(-?\d+))?$/.exec(body);
 const match=numeric||alpha;if(!match)return null;
 const start=numeric?Number(match[1]):match[1].charCodeAt(0),end=numeric?Number(match[2]):match[2].charCodeAt(0),step=Math.max(1,Math.abs(Number(match[3]??1)));
 // Rounded endpoints or non-advancing steps must not repeat forever or pretend
 // to represent exact integers. Such ranges remain literal.
 if(![start,end,step].every(Number.isSafeInteger))return null;
 const delta=end<start?-step:step,width=Math.max(match[1].length,match[2].length),padded=match.slice(1).some(s=>s&&/^-?0\d/.test(s));
 const out=[];let length=0;
 for(let n=start;delta>0?n<=end:n>=end;n+=delta){
  if(out.length>=context.limits.max)break;
  if(!spend(context,padded?width:1))return undefined;
  let value=alpha?(n===92?'':String.fromCharCode(n)):String(n);
  if(numeric&&padded){const sign=n<0?'-':'';value=sign+value.slice(sign.length).padStart(width-sign.length,'0');}
  if(length+value.length>context.limits.maxLength)break;
  out.push(value);length+=value.length;
  if(!Number.isSafeInteger(n+delta))break;
 }return out;
}
// Frames yield child-expansion requests. The public driver resumes them with
// results on its own stack; nested input never recurses on the JavaScript stack.
function* frame(source,top,depth,context){
 const {limits}=context;
 let acc=[''],drop=false,first=true,rewrites=0,lex=mask(source);
 const literal=()=>product(acc,source,[''],drop,context,false);
 if(depth>limits.maxDepth||!spend(context,source.length+16))return literal();
 while(true){
  if(context.steps<0)return literal();
  const pair=range('{','}',lex);
  if(!pair)return product(acc,source,[''],drop,context,false);
  const [open,close]=pair,pre=source.slice(0,open),body=source.slice(open+1,close),tail=source.slice(close+1),bodyLex=lex.slice(open+1,close);
  if(!spend(context,lex.indexOf('{')<open?lex.length:close+1))return literal();
  let values;
  if(pre.endsWith('$')){values=['{'+body+'}'];first=false;}
  else{
   values=sequence(body,context);if(values===undefined)return literal();
   const isSequence=values!==null;
   if(!isSequence&&!bodyLex.includes(',')){
    if(rewrites<limits.maxRewrites&&spend(context,tail.length)&&laterComma(lex.slice(close+1))){
     source=source.slice(0,close)+'\\'+source.slice(close);lex=mask(source);rewrites++;top=true;continue;
    }return literal();
   }
   if(first){drop=top&&!isSequence;first=false;}
   if(!isSequence){
    let members=parts(body,bodyLex);
    if(members.length===1){
     const nested=yield {source:members[0],top:false,depth:depth+1};
     if(context.steps<0)return literal();
     members=nested.map(v=>'{'+v+'}');
     if(members.length===1){values=members;}
    }
    if(values===null){
     values=[];let length=0;const skipEmpty=drop&&!tail&&!pre&&acc.every(v=>!v);
     for(const member of members){
      const expanded=yield {source:member,top:false,depth:depth+1};
      if(context.steps<0)return literal();
      let full=false;
      for(const value of expanded){
       if(skipEmpty&&!value)continue;
       const n=size(value);if(values.length>=limits.max||length+n>limits.maxLength){full=true;break;}
       values.push(value);length+=n;
      }if(full)break;
     }
    }
   }
  }
  const next=product(acc,pre,values,drop&&!tail,context);
  if(next===undefined)return literal();
  acc=next;if(!tail||!acc.length)return acc;
  source=tail;lex=lex.slice(close+1);
 }
}
function expand(source,options){
 if(typeof source!=='string')throw new TypeError('Pattern must be a string');
 if(!source)return [];
 const limits=bounds(options);if(!limits.max)return [];
 if(!source.includes('{')){const literal=decode(source);return literal.length<=limits.maxLength?[literal]:[];}
 // Bash preserves an initial empty pair but permits its quirk after a prefix.
 if(source.startsWith('{}'))source='\\{\\}'+source.slice(2);
 const context={limits,steps:limits.maxSteps};
 const stack=[frame(source,true,0,context)];let result;
 while(stack.length){const next=stack[stack.length-1].next(result);result=undefined;
  if(next.done){stack.pop();result=next.value;}
  else{const request=next.value;
   // Ordinary option members are literal. Preserve the same budget/depth
   // semantics without allocating another suspended interpreter frame.
   if(!request.source.includes('{')){
    if(request.depth<=limits.maxDepth)spend(context,request.source.length+16);
    result=size(request.source)<=limits.maxLength?[request.source]:[];
   }else stack.push(frame(request.source,request.top,request.depth,context));
  }
 }
 return result.map(decode);
}
module.exports=expand;
Object.assign(module.exports,{expand,EXPANSION_MAX,EXPANSION_MAX_LENGTH,EXPANSION_MAX_DEPTH,EXPANSION_MAX_REWRITES,EXPANSION_MAX_STEPS});
