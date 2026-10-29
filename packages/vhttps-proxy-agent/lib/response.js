'use strict';
const {validateHeaderName,validateHeaderValue}=require('node:http');
const delimiter=Buffer.from('\r\n\r\n');
function failure(code,message){return Object.assign(new Error(message),{code});}
function parseHeaders(buffer){
  const lines=buffer.toString('latin1',0,buffer.length-4).split('\r\n');
  const status=/^HTTP\/1\.[01] ([1-5][0-9]{2})(?: ([\t\x20-\x7e\x80-\xff]*))?$/.exec(lines[0]);
  if(!status||status[0].length!==lines[0].length)throw failure('ERR_PROXY_RESPONSE','Invalid proxy CONNECT status line');
  const headers=Object.create(null);
  for(let i=1;i<lines.length;i++){
    const line=lines[i],colon=line.indexOf(':');
    if(colon<1)throw failure('ERR_PROXY_RESPONSE','Invalid header from proxy CONNECT response');
    let start=colon+1,end=line.length;
    while(start<end&&(line.charCodeAt(start)===32||line.charCodeAt(start)===9))start++;
    while(end>start&&(line.charCodeAt(end-1)===32||line.charCodeAt(end-1)===9))end--;
    const name=line.slice(0,colon),value=line.slice(start,end);
    // Long printable ASCII fields need only the contiguous-range check. Other
    // values retain the native validator, including tabs and Latin-1 bytes.
    try{validateHeaderName(name);if(value.length<256||/[^\x20-\x7e]/.test(value))validateHeaderValue(name,value);}catch{throw failure('ERR_PROXY_RESPONSE','Invalid header from proxy CONNECT response');}
    const key=name.toLowerCase(),previous=headers[key];
    if(previous===undefined)headers[key]=value;else if(Array.isArray(previous))previous.push(value);else headers[key]=[previous,value];
  }
  return {statusCode:Number(status[1]),statusText:status[2]||'',headers};
}
class HeaderParser{
  constructor(limit=16384){this.limit=limit;this.total=0;this.length=0;this.match=0;this.parts=[];this.finished=false;}
  write(chunk){
    if(this.finished)throw failure('ERR_PROXY_RESPONSE','CONNECT response already parsed');
    let start=0;
    while(start<chunk.length){
      let end=-1;
      if(!this.parts.length){const found=chunk.indexOf(delimiter,start);if(found!==-1){end=found+4;this.total+=end-start;}}
      if(end===-1){
        for(let i=start;i<chunk.length;i++){
          if(++this.total>this.limit)throw failure('ERR_PROXY_HEADER_SIZE','Proxy CONNECT headers exceed the configured limit');
          this.match=chunk[i]===delimiter[this.match]?this.match+1:chunk[i]===13?1:0;
          if(this.match===4){end=i+1;break;}
        }
      }
      if(this.total>this.limit)throw failure('ERR_PROXY_HEADER_SIZE','Proxy CONNECT headers exceed the configured limit');
      if(end===-1){this.parts.push(chunk.subarray(start));this.length+=chunk.length-start;return null;}
      const part=chunk.subarray(start,end);
      const header=this.parts.length?Buffer.concat([...this.parts,part],this.length+part.length):part;
      const connect=parseHeaders(header);
      this.parts=[];this.length=0;this.match=0;
      if(connect.statusCode<200){
        if(connect.statusCode===101)throw failure('ERR_PROXY_RESPONSE','Unexpected protocol switch during CONNECT');
        start=end;continue;
      }
      this.finished=true;
      const head=chunk.subarray(end);
      return {connect,head,buffered:head.length?Buffer.concat([header,head]):header};
    }
    return null;
  }
}
function readResponse(socket,limit){
  return new Promise((resolve,reject)=>{
    const parser=new HeaderParser(limit);let settled=false;
    const cleanup=()=>{socket.removeListener('readable',read);socket.removeListener('end',end);socket.removeListener('close',close);socket.removeListener('error',fail);};
    const fail=error=>{if(settled)return;settled=true;cleanup();reject(error);};
    const end=()=>fail(failure('ECONNRESET','Proxy connection ended before receiving CONNECT response'));
    const close=()=>fail(failure('ECONNRESET','Proxy connection closed before receiving CONNECT response'));
    function read(){
      try{let chunk;while(!settled&&(chunk=socket.read())!==null){const result=parser.write(chunk);if(result){settled=true;cleanup();resolve(result);return;}}if(!settled)socket.once('readable',read);}
      catch(error){fail(error);}
    }
    socket.once('end',end);socket.once('close',close);socket.once('error',fail);read();
  });
}
module.exports={HeaderParser,readResponse,failure};
