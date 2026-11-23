'use strict';
// Segment matching is a position-set interpreter. Stars never become native
// regular-expression quantifiers; nested extglobs run on an explicit stack.
const LIMIT = 20000000;
const POSIX = {
 alnum:'\\p{L}\\p{N}', alpha:'\\p{L}', ascii:'\\x00-\\x7f', blank:'\\p{Zs}\\t', cntrl:'\\p{Cc}', digit:'\\p{Nd}',
 graph:'\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}', lower:'\\p{Ll}', print:'\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}\\p{Zs}', punct:'\\p{P}\\p{S}', space:'\\s', upper:'\\p{Lu}', word:'\\p{L}\\p{N}_', xdigit:'A-Fa-f0-9'
};
function characterClass(source,start,nocase) {
 let i=start+1,neg=false,body='',count=0;
 if(source[i]==='!'||source[i]==='^'){neg=true;i++;}
 if(source[i]===']'){body='\\]';i++;count++;}
 for(;i<source.length;i++){
  const c=source[i];if(c===']'&&count){
   body=body.replace(/([^-\\])-([^-\\])/gu,(all,a,b)=>a.codePointAt(0)>b.codePointAt(0)?'':all);
   if(!neg&&Array.from(body).length===1)return {end:i,token:{kind:'literal',text:body}};
   try{return {end:i,token:{kind:'class',re:new RegExp(body?'^['+(neg?'^':'')+body+']$':neg?'^[\\s\\S]$':'(?!)',nocase?'iu':'u')}};}catch{return null;}
  }
  if(c==='['&&source[i+1]===':'){
   const end=source.indexOf(':]',i+2),name=source.slice(i+2,end);
   if(end>=0&&POSIX[name]){body+=POSIX[name];i=end+1;count++;continue;}
  }
  if(c==='\\'&&i+1<source.length){body+='\\'+source[++i].replace(/[^\\\]\-^]/,v=>v);if(!/[\\\]\-^]/.test(source[i]))body=body.slice(0,-2)+source[i];}
  else body+=c==='['?'\\[':c;
  count++;
 }
 return null;
}
function parse(source,options,ranges) {
 const pairs=new Map(),stack=[];
 for(let i=0;i<source.length;i++){
  if(source[i]==='\\'){i++;continue;}
  if(source[i]==='['){const c=characterClass(source,i,options.nocase);if(c){i=c.end;continue;}}
  if(!options.noext&&'@?+*!'.includes(source[i])&&source[i+1]==='('){stack.push(i);i++;}
  else if(source[i]===')'&&stack.length)pairs.set(stack.pop(),i);
 }
 const root=[],frames=[{seq:root,end:source.length}],literal=(seq,c)=>{const last=seq[seq.length-1];if(last?.kind==='literal')last.text+=c;else seq.push({kind:'literal',text:c});};
 for(let i=0;i<source.length;i++){
  let frame=frames[frames.length-1],seq=frame.seq,c=source[i];
  if(i===frame.end){frames.pop();continue;}
  if(c==='|'&&frames.length>1){frame.seq=[];frame.ext.alts.push(frame.seq);continue;}
  if(c==='\\'){literal(seq,source[++i]??'\\');continue;}
  if(ranges?.has(c)){seq.push({kind:'range',...ranges.get(c)});continue;}
  if(pairs.has(i)&&!(i===0&&pairs.get(i)===source.length-1&&source.length===3)){
   const ext={kind:'ext',op:c,alts:[[]]};seq.push(ext);frames.push({seq:ext.alts[0],ext,end:pairs.get(i)});i++;continue;
  }
  if(c==='['){const cc=characterClass(source,i,options.nocase);if(cc){seq.push(cc.token);i=cc.end;continue;}}
  if(!options.noext&&'@?+*!'.includes(c)&&source[i+1]==='('&&!pairs.has(i)){literal(seq,source.slice(i));break;}
  if(c==='*'){if(seq[seq.length-1]?.kind!=='star')seq.push({kind:'star'});}
  else if(c==='?')seq.push({kind:'any'});
  else literal(seq,c);
 }
 const todo=[root];while(todo.length){const seq=todo.pop();for(const t of seq){if(t.kind==='literal'){t.original=t.text;if(options.nocase)t.text=t.text.toLowerCase();t.chars=Array.from(t.text);}else if(t.kind==='ext')todo.push(...t.alts);}}
 return root;
}
function run(seq,chars,start,context) {
 function* evaluate(tokens,from){
  let positions=new Set([from]);
  for(const token of tokens){
   const next=new Set();
   if(token.kind==='star'){
    let first=Infinity;for(const at of positions)if(at<first)first=at;
    if(!context.dots&&!(first===0&&chars[0]==='.'&&!context.dot))for(let end=first;end<=chars.length;end++){
     if(--context.left<0)throw new RangeError('glob match work limit exceeded');next.add(end);
    }
    positions=next;if(!positions.size)break;continue;
   }
   for(const at of positions){
    if(--context.left<0)throw new RangeError('glob match work limit exceeded');
    if(token.kind==='literal'){
     let k=0;for(;k<token.chars.length;k++){if(--context.left<0)throw new RangeError('glob match work limit exceeded');if(chars[at+k]!==token.chars[k])break;}
     if(k===token.chars.length)next.add(at+k);
    }else if(token.kind==='any'){if(at<chars.length&&!context.dots&&!(at===0&&chars[0]==='.'&&!context.dot))next.add(at+1);}
    else if(token.kind==='class'){if(at<chars.length&&!context.dots&&!(at===0&&chars[0]==='.'&&!context.dot)&&token.re.test(chars[at]))next.add(at+1);}
    else if(token.kind==='range'){
     let value='';for(let end=at;end<chars.length&&end-at<token.width+2;end++){
      const c=chars[end];if(!/[-0-9]/.test(c))break;value+=c;const n=Number(value);
      if(Number.isSafeInteger(n)&&n>=token.min&&n<=token.max&&(n-token.start)%token.step===0){
       const canonical=token.padded?(n<0?'-':'')+String(Math.abs(n)).padStart(token.width-(n<0?1:0),'0'):String(n);
       if(value===canonical)next.add(end+1);
      }
     }
    }else{
     const first=new Set();for(const alt of token.alts){const ends=yield {tokens:alt,from:at};for(const end of ends)first.add(end);}
     if(token.op==='!'){
      for(let end=at;end<=chars.length;end++){if(context.dots||at===0&&chars[0]==='.'&&!context.dot&&end>0)break;if(--context.left<0)throw new RangeError('glob match work limit exceeded');if(!first.has(end))next.add(end);}
     }else{
      for(const end of first)next.add(end);
      if(token.op==='?'||token.op==='*')next.add(at);
      if(token.op==='*'||token.op==='+'){
       const seen=new Set([at]),queue=[...first];
       for(let q=0;q<queue.length;q++){const p=queue[q];if(seen.has(p))continue;seen.add(p);
        for(const alt of token.alts){const ends=yield {tokens:alt,from:p};for(const end of ends){next.add(end);if(!seen.has(end))queue.push(end);}}
       }
      }
     }
    }
   }
   positions=next;if(!positions.size)break;
  }
  return positions;
 }
 const frames=[{it:evaluate(seq,start)}];let value;
 while(frames.length){const frame=frames[frames.length-1],r=frame.it.next(value);value=undefined;
  if(r.done){frames.pop();value=r.value;if(frame.memo)frame.memo.set(frame.from,value);}
  else{const {tokens,from}=r.value;let memo=context.memo.get(tokens);if(!memo){memo=new Map();context.memo.set(tokens,memo);}
   if(memo.has(from))value=memo.get(from);else frames.push({it:evaluate(tokens,from),memo,from});
  }
 }
 return value;
}
function simple(tokens){
 if(tokens.every(t=>t.kind==='literal')){const text=tokens.map(t=>t.text).join('');return s=>s===text;}
 if(tokens.length<=3&&tokens.filter(t=>t.kind==='star').length===1&&tokens.every(t=>t.kind==='star'||t.kind==='literal')){
  const prefix=tokens[0]?.kind==='literal'?tokens[0].text:'',suffix=tokens.at(-1)?.kind==='literal'?tokens.at(-1).text:'';
  return s=>s.length>=prefix.length+suffix.length&&s.startsWith(prefix)&&s.endsWith(suffix);
 }
}
class SegmentMatcher extends RegExp {
 constructor(pattern,options={},ranges){
  // glob 9–13 tests instanceof RegExp. Its .test() calls still run our own
  // interpreter. The dummy native source is deliberately not a serialization.
  super('(?!)');this.pattern=pattern;this._glob=pattern;this.options=Object.freeze({...options});this.tokens=parse(pattern,options,ranges);
  this.literal=this.tokens.every(t=>t.kind==='literal')?this.tokens.map(t=>t.text).join(''):undefined;
  this.originalLiteral=this.literal===undefined?undefined:this.tokens.map(t=>t.original).join('');this.magic=this.literal===undefined;
  this.explicitDot=pattern.startsWith('.')||pattern.startsWith('\\.');
  const rangeIndex=this.tokens.findIndex(t=>t.kind==='range');
  if(rangeIndex>=0&&this.tokens.every((t,i)=>i===rangeIndex||t.kind==='literal')){
   const before=this.tokens.slice(0,rangeIndex).map(t=>t.text).join(''),after=this.tokens.slice(rangeIndex+1).map(t=>t.text).join(''),r=this.tokens[rangeIndex];
   this.rangeTest=value=>{
    if(!value.startsWith(before)||!value.endsWith(after)||value.length<before.length+after.length+1)return false;
    const str=value.slice(before.length,after.length?-after.length:undefined),n=Number(str);
    if(!Number.isSafeInteger(n)||n<r.min||n>r.max||(n-r.start)%r.step!==0)return false;
    return str===(r.padded?(n<0?'-':'')+String(Math.abs(n)).padStart(r.width-(n<0?1:0),'0'):String(n));
   };
  }
  if(this.tokens[0]?.kind==='ext'&&this.tokens[0].op==='!'&&this.tokens.slice(1).every(t=>t.kind==='literal')){
   const exclude=this.tokens[0].alts.map(simple),suffix=this.tokens.slice(1).map(t=>t.text).join('');
   if(exclude.every(Boolean))this.negativeTest=value=>{
    if(!value.endsWith(suffix))return false;const body=suffix?value.slice(0,-suffix.length):value;
    if(body[0]==='.'&&!this.options.dot)return false;return !exclude.some(test=>test(body));
   };
  }

  if(this.tokens.length===1&&this.tokens[0].kind==='star')this.simpleStar=true;
  if(this.tokens.length<=3&&this.tokens.filter(t=>t.kind==='star').length===1&&this.tokens.every(t=>t.kind==='star'||t.kind==='literal')){
   this.prefix=this.tokens[0].kind==='literal'?this.tokens[0].text:'';this.suffix=this.tokens.at(-1).kind==='literal'?this.tokens.at(-1).text:'';
  }
 }
 test(value){
  if(typeof value!=='string')throw new TypeError('path must be a string');
  if(value.includes('/')&&!this.options.normalize)return false;
  if(this.literal!==undefined)return (this.options.nocase?value.toLowerCase():value)===this.literal;
  if(!value)return false;
  if(this.options.nocase)value=value.toLowerCase();
  if(this.prefix!==undefined){if(value==='.'||value==='..'||value[0]==='.'&&!this.options.dot&&!this.explicitDot)return false;return value.length>=this.prefix.length+this.suffix.length&&value.startsWith(this.prefix)&&value.endsWith(this.suffix);}
  if(this.rangeTest)return this.rangeTest(value);
  if(this.negativeTest&&value!=='.'&&value!=='..')return this.negativeTest(value);
  const chars=Array.from(value);return run(this.tokens,chars,0,{left:LIMIT,memo:new Map(),dot:this.options.dot,dots:value==='.'||value==='..'}).has(chars.length);
 }
 testUnchecked(value){return this.test(value);}
 exec(value){if(!this.test(value))return null;const result=[value];result.index=0;result.input=value;result.groups=undefined;return result;}
 toString(){return this.pattern;}
}
module.exports={SegmentMatcher};
