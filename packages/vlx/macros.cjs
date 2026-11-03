'use strict';
const {VlxError}=require('./source.cjs');
// Deliberately small macro contract: leading newcommand definitions with braced
// arguments. No global definitions, filesystem access or cross-expression state.
function expand(source,reserved){
 const macros=new Map();let cursor=0,expansions=0;
 const fail=message=>{throw new VlxError('TEX',message,{start:cursor})};
 function group(){while(/\s/.test(source[cursor]||'\0'))cursor++;if(source[cursor]!=='{')fail('Macro arguments must be braced');const start=++cursor;let depth=1;while(cursor<source.length){const c=source[cursor++];if(c==='\\'){cursor++;continue}if(c==='{')depth++;if(c==='}'&&!--depth)return source.slice(start,cursor-1);}fail('Unclosed macro argument');}
 while(true){while(/\s/.test(source[cursor]||'\0'))cursor++;if(!source.startsWith('\\newcommand',cursor))break;cursor+=11;const name=group();if(!/^\\[a-zA-Z]+$/.test(name))fail('Invalid macro name');if(macros.has(name)||reserved.has(name.slice(1)))fail('Duplicate or built-in macro definition');while(/\s/.test(source[cursor]||'\0'))cursor++;let args=0;if(source[cursor]==='['){const match=/^\[([0-9])\]/.exec(source.slice(cursor));if(!match)fail('Invalid macro argument count');args=Number(match[1]);cursor+=3;}const body=group();for(const m of body.matchAll(/#([0-9])/g))if(Number(m[1])<1||Number(m[1])>args)fail('Macro references an undeclared argument');macros.set(name,{args,body});if(macros.size>64)throw new VlxError('LIMIT','Too many macro definitions');}
 if(!macros.size)return source;
 source=source.slice(cursor);cursor=0;
 while(cursor<source.length){if(source[cursor]==='%'){const next=source.indexOf('\n',cursor);cursor=next<0?source.length:next+1;continue}if(source[cursor]!=='\\'){cursor++;continue}const start=cursor;const match=/^\\[a-zA-Z]+/.exec(source.slice(cursor));if(!match){cursor+=2;continue}cursor+=match[0].length;const macro=macros.get(match[0]);if(!macro)continue;if(++expansions>1000)throw new VlxError('LIMIT','Macro expansion limit exceeded');const values=[];for(let a=0;a<macro.args;a++)values.push(group());const replacement=macro.body.replace(/#([1-9])/g,(_,n)=>values[Number(n)-1]);source=source.slice(0,start)+replacement+source.slice(cursor);if(source.length>16384)throw new VlxError('LIMIT','Expanded TeX exceeds 16384 characters');cursor=start;}
 return source;
}
exports.expand=expand;
