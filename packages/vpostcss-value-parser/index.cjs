'use strict';
// A value lexer, not a CSS validator. Frames preserve source offsets and recovery
// state without consuming the JS call stack for nested functions.
const white = c => c === 32 || c === 9 || c === 10 || c === 13 || c === 12;
function parse(text) {
  const nodes = [], stack = [{ nodes, owner: null }];
  let i = 0;
  while (i < text.length) {
    const frame = stack[stack.length - 1], list = frame.nodes, start = i, c = text[i];
    if (white(text.charCodeAt(i))) {
      while (white(text.charCodeAt(++i))) {}
      list.push({ type:'space', sourceIndex:start, sourceEndIndex:i, value:text.slice(start,i) });
    } else if (c === ')' && frame.owner) {
      const last = list[list.length-1];
      if (last?.type === 'space') { frame.owner.after = last.value; list.pop(); }
      else if(last?.type==='div' && last.after) { frame.owner.after=last.after; last.sourceEndIndex-=last.after.length; last.after=''; }
      frame.owner.sourceEndIndex = ++i; stack.pop();
    } else if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c) { if(text[i] === '\\') i++; i++; }
      const node = { type:'string', sourceIndex:start, quote:c, value:text.slice(start+1,Math.min(i,text.length)), sourceEndIndex:Math.min(i+1,text.length) };
      if(i === text.length || i > text.length) node.unclosed = true; else i++;
      list.push(node);
    } else if (c === '/' && text[i+1] === '*') {
      const end = text.indexOf('*/',i+2), closed = end !== -1;
      i = closed ? end+2 : text.length;
      const node = { type:'comment', sourceIndex:start, sourceEndIndex:i, value:text.slice(start+2,closed?end:i) };
      if(!closed) node.unclosed=true;
      list.push(node);
    } else if (c === ',' || c === ':' || (c === '/' && frame.owner?.value !== 'calc')) {
      let before='', offset=start;
      const last=list[list.length-1];
      if(last?.type==='space') { before=last.value;offset=last.sourceIndex;list.pop(); }
      const afterStart=++i;
      while(white(text.charCodeAt(i))) i++;
      list.push({type:'div',sourceIndex:offset,sourceEndIndex:i,value:c,before,after:text.slice(afterStart,i)});
    } else {
      if(c!=='(') {
        while(i<text.length) {
          const x=text[i];
          if(x==='\\') { i=Math.min(i+2,text.length);continue; }
          if((frame.owner?.value==='calc'&&(x==='*'||x==='/')) || white(text.charCodeAt(i)) || x==='(' || x==='"' || x==="'" || x===',' || x===':' || (x===')'&&frame.owner) || (x==='/'&& (frame.owner?.value!=='calc'||text[i+1]==='*'))) break;
          i++;
        }
      }
      const value=text.slice(start,i);
      if(text[i]==='(') {
        i++;const beforeStart=i;while(white(text.charCodeAt(i)))i++;
        const node={type:'function',sourceIndex:start,value,before:text.slice(beforeStart,i),after:'',sourceEndIndex:text.length,nodes:[]};
        list.push(node);
        // Unquoted URLs are opaque, including punctuation and spaces.
        if(value==='url' && text[i]!=="'" && text[i]!=='"') {
          const contentStart=i;
          while(i<text.length && text[i]!==')') { if(text[i]==='\\')i++;i++; }
          i=Math.min(i,text.length);let end=i;while(end>contentStart&&white(text.charCodeAt(end-1)))end--;
          if(end>contentStart)node.nodes.push({type:'word',sourceIndex:contentStart,sourceEndIndex:end,value:text.slice(contentStart,end)});
          node.after=text.slice(end,i);
          if(i<text.length)i++;else { node.unclosed=true; if(node.after){node.nodes.push({type:'space',sourceIndex:end,sourceEndIndex:i,value:node.after});node.after='';} }
          node.sourceEndIndex=i;
        } else stack.push({nodes:node.nodes,owner:node});
      } else if(i>start) list.push({type:/^[uU]\+[\da-fA-F?-]+$/.test(value)?'unicode-range':'word',sourceIndex:start,sourceEndIndex:i,value});
      else { // A calc slash is an ordinary arithmetic word.
        list.push({type:'word',sourceIndex:i,sourceEndIndex:i+1,value:text[i++]});
      }
    }
  }
  for(let f=1;f<stack.length;f++) stack[f].owner.unclosed=true;
  return nodes;
}
function stringify(input, custom) {
  const output=[], frames=[{nodes:Array.isArray(input)?input:[input], index:0, tail:''}];
  while(frames.length) {
    const f=frames[frames.length-1];
    if(f.index===f.nodes.length){output.push(f.tail);frames.pop();continue;}
    const node=f.nodes[f.index++], override=custom?.(node);
    if(override!==undefined){output.push(override);continue;}
    switch(node.type) {
      case 'function': output.push(node.value+'('+(node.before||''));frames.push({nodes:node.nodes||[],index:0,tail:(node.after||'')+(node.unclosed?'':')')});break;
      case 'string': output.push(node.quote+node.value+(node.unclosed?'':node.quote));break;
      case 'comment': output.push('/*'+node.value+(node.unclosed?'':'*/'));break;
      case 'div': output.push((node.before||'')+node.value+(node.after||''));break;
      default: output.push(node.value);
    }
  }
  return output.join('');
}
function walk(nodes, callback, bubble) {
  const frames=[{nodes,index:0,after:null}];
  while(frames.length) {
    const f=frames[frames.length-1];
    if(f.index>=f.nodes.length){frames.pop();if(f.after)callback(...f.after);continue;}
    const index=f.index++, node=f.nodes[index];
    const descend=bubble || callback(node,index,f.nodes)!==false;
    if(descend && node.type==='function' && node.nodes) frames.push({nodes:node.nodes,index:0,after:bubble?[node,index,f.nodes]:null});
    else if(bubble)callback(node,index,f.nodes);
  }
}
function unit(value) {
  const match=/^[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(value);
  return match?{number:match[0],unit:value.slice(match[0].length)}:false;
}
function ValueParser(value) {
  if(!(this instanceof ValueParser))return new ValueParser(value);
  this.nodes=parse(value);
}
ValueParser.prototype.toString=function(){return stringify(this.nodes);};
ValueParser.prototype.walk=function(callback,bubble){walk(this.nodes,callback,bubble);return this;};
Object.assign(ValueParser,{unit,stringify,walk});
module.exports=ValueParser;
