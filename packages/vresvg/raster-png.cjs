'use strict';
const {deflateRawSync,crc32,constants}=require('node:zlib'),scan=require('./raster-wasm.cjs');
function chunk(type,data){const out=Buffer.allocUnsafe(data.length+12);out.writeUInt32BE(data.length);out.write(type,4,4,'ascii');data.copy(out,8);out.writeUInt32BE(crc32(out.subarray(4,out.length-4)),out.length-4);return out;}
function encodePng(surface){
 const {width,height}=surface;let {data}=surface;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>16777216||data.length!==width*height*4)throw new RangeError('Invalid raster dimensions');
 const stride=width*4,rowsPerChunk=Math.max(1,Math.floor(1048576/(stride+1)));
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const chunks=[Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',Buffer.from([0x78,0x01]))];
 let checksum=1,scratch;
 for(let first=0;first<height;first+=rowsPerChunk){
  const rows=Math.min(rowsPerChunk,height-first),length=(stride+1)*rows;
  let filtered=scan.filter(surface,first,rows);data=surface.data;
  if(!filtered){
   scratch??=Buffer.allocUnsafe((stride+1)*Math.min(rowsPerChunk,height));filtered=scratch.subarray(0,length);
   // First row: Sub; all remaining rows: Up, even at a chunk boundary.
   for(let y=first;y<first+rows;y++){
    const source=y*stride,dest=(y-first)*(stride+1);filtered[dest]=y?2:1;
    if(y){for(let i=0;i<stride;i++)filtered[dest+i+1]=data[source+i]-data[source-stride+i];}
    else{for(let i=0;i<stride;i++)filtered[dest+i+1]=data[source+i]-(i>=4?data[source+i-4]:0);}
   }
  }
  checksum=scan.adler(surface,filtered,checksum);
  // Z_SYNC_FLUSH ends at a byte boundary with BFINAL=0. Each fresh compressor
  // uses no earlier dictionary, so these blocks form ONE valid zlib stream.
  // End it below with a final empty stored block and the whole-image Adler-32.
  // Only public zlib APIs are used; filter scratch stays below 1 MiB.
  chunks.push(chunk('IDAT',deflateRawSync(filtered,{level:1,finishFlush:constants.Z_SYNC_FLUSH})));
 }
 const end=Buffer.from([1,0,0,255,255,0,0,0,0]);end.writeUInt32BE(checksum,5);
 chunks.push(chunk('IDAT',end),chunk('IEND',Buffer.alloc(0)));return Buffer.concat(chunks);
}
module.exports={encodePng};
