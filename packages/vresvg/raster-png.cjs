'use strict';
const {deflateSync,crc32}=require('node:zlib');
function chunk(type,data){const out=Buffer.allocUnsafe(data.length+12);out.writeUInt32BE(data.length);out.write(type,4,4,'ascii');data.copy(out,8);out.writeUInt32BE(crc32(out.subarray(4,out.length-4)),out.length-4);return out;}
function encodePng({width,height,data}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>16777216||data.length!==width*height*4)throw new RangeError('Invalid raster dimensions');
 const stride=width*4,filtered=Buffer.allocUnsafe((stride+1)*height);
 // Text pages have long identical rows; the Up filter encodes those as zeroes.
 // Use Sub on the first row and Up thereafter. Both are lossless PNG filters.
 for(let y=0;y<height;y++){const source=y*stride,dest=y*(stride+1);filtered[dest]=y?2:1;
  if(y&&Buffer.isBuffer(data)&&data.subarray(source,source+stride).equals(data.subarray(source-stride,source))){filtered.fill(0,dest+1,dest+stride+1);continue;}
  if(y){for(let i=0;i<stride;i++)filtered[dest+i+1]=data[source+i]-data[source-stride+i];}
  else {for(let i=0;i<stride;i++)filtered[dest+i+1]=data[source+i]-(i>=4?data[source+i-4]:0);}
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(filtered,{level:6})),chunk('IEND',Buffer.alloc(0))]);
}
module.exports={encodePng};
