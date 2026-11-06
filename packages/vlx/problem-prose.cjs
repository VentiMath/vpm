'use strict';
const {parse,VlxError}=require('./source.cjs');
// Recognize page-level lists only outside math. Labels can span math/text nodes;
// retain their exact source and let the existing math parser handle their TeX.
module.exports=function problemProse(source){
 const result=parse(source);if(result.diagnostics.length)throw new VlxError('UNCLOSED_MATH',result.diagnostics[0].message);
 if(!/\\(?:begin|end|item)(?![A-Za-z])/.test(source))return result.nodes.map(n=>({kind:n.kind==='text'?'text':n.display?'display':'math',source:n.kind==='text'?n.value:n.tex}));
 const out=[];let consumed=0;
 const text=(start,end)=>{if(end>start)out.push({kind:'text',source:source.slice(start,end).replace(/\\\$/g,'$')});};
 for(const node of result.nodes){
  if(node.end<=consumed)continue;
  if(node.kind!=='text'){out.push({kind:node.display?'display':'math',source:node.tex});continue;}
  let start=Math.max(node.start,consumed),i=start;
  while(i<node.end){
   if(source[i]!=='\\'){i++;continue;}
   if(source[i+1]==='\\'||source[i+1]==='$'){i+=2;continue;}
   const env=/^\\(begin|end)\s*\{(itemize|enumerate)\}/.exec(source.slice(i));
   const item=env?null:/^\\item(?![A-Za-z])/.exec(source.slice(i));
   if(!env&&!item){i++;continue;}
   text(start,i);
   if(env){i+=env[0].length;out.push({kind:env[1]==='begin'?'list-start':'list-end',name:env[2]});}
   else{
    i+=item[0].length;while(/\s/.test(source[i]||'')&&i<source.length)i++;
    let label;
    if(source[i]==='['){
     const begin=++i;let depth=1;
     while(i<source.length&&depth){if(i-begin>256)throw new VlxError('LIMIT','List label exceeds 256 characters');if(source[i]==='\\'){i+=2;continue;}if(source[i]==='[')depth++;if(source[i]===']')depth--;if(depth)i++;}
     if(depth)throw new VlxError('LIST','Unclosed list label');label=source.slice(begin,i++);
    }
    out.push({kind:'list-item',label});
   }
   consumed=start=i;
  }
  text(start,node.end);
 }
 return out;
};
