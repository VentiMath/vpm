'use strict';
// Walk delimiter occurrences, retaining only unmatched opening positions. A
// completed outer pair wins; if its prefix never closes, keep the leftmost
// completed inner pair. UTF-16 offsets deliberately follow String#indexOf.
function range(open,close,source){
 if(typeof open!=='string'||typeof close!=='string'||typeof source!=='string')throw new TypeError('range expects string delimiters and input');
 if(!open||!close)return undefined;
 const first=source.indexOf(open);
 if(first<0)return undefined;
 let shut=source.indexOf(close,first+1);
 if(shut<0)return undefined;
 if(open===close)return [first,shut];
 let next=first,bestStart=Infinity,bestEnd=-1;
 const pending=[];
 while(shut>=0){
  // Equal positions open first. This also preserves overlapping-token matches.
  if(next>=0&&next<=shut){pending.push(next);next=source.indexOf(open,next+1);}
  else {
   const start=pending.pop();
   if(start===undefined)break;
   if(start<bestStart){bestStart=start;bestEnd=shut;}
   if(!pending.length)return [start,shut];
   shut=source.indexOf(close,shut+1);
  }
 }
 return bestEnd<0?undefined:[bestStart,bestEnd];
}
function delimiter(value,source){
 if(typeof value==='string')return value;
 // Native matching handles flags and lastIndex; it also accepts RegExp objects
 // from another realm without treating arbitrary objects as delimiters.
 if(Object.prototype.toString.call(value)!=='[object RegExp]')throw new TypeError('balanced expects string or RegExp delimiters');
 return source.match(value)?.[0];
}
function balanced(open,close,source){
 if(typeof source!=='string')throw new TypeError('balanced expects a string input');
 open=delimiter(open,source);close=delimiter(close,source);
 if(open===undefined||close===undefined)return undefined;
 const pair=range(open,close,source);
 if(!pair)return undefined;
 const [start,end]=pair;
 return {start,end,pre:source.slice(0,start),body:source.slice(start+open.length,end),post:source.slice(end+close.length)};
}
// Current named API plus the callable CJS surface still used by brace-expansion 2.
module.exports=balanced;
module.exports.balanced=balanced;
module.exports.range=range;
