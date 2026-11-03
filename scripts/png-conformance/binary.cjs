'use strict';
const {crc32,inflateSync,deflateSync}=require('node:zlib');
function chunk(type,data=Buffer.alloc(0)){const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(type,4);data.copy(out,8);out.writeUInt32BE(crc32(out.subarray(4,-4)),out.length-4);return out;}
function chunks(input){let pos=8;const list=[];while(pos<input.length){const size=input.readUInt32BE(pos);list.push({type:input.toString('ascii',pos+4,pos+8),data:Buffer.from(input.subarray(pos+8,pos+8+size))});pos+=size+12;}return list;}
function encode(list){return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...list.map(c=>chunk(c.type,c.data))]);}
function redata(input,change){const list=chunks(input),raw=inflateSync(Buffer.concat(list.filter(c=>c.type==='IDAT').map(c=>c.data))),packed=deflateSync(change(raw));const start=list.findIndex(c=>c.type==='IDAT');list.splice(start,list.filter(c=>c.type==='IDAT').length,{type:'IDAT',data:packed});return encode(list);}
module.exports={chunk,chunks,encode,redata};
