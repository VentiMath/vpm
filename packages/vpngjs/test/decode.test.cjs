'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{deflateSync}=require('node:zlib');
const fixture=path.resolve(__dirname,'../../../scripts/png-conformance'),upstream=require(path.join(fixture,'node_modules/pngjs')).PNG,{PNG}=require('../index.cjs'),binary=require(path.join(fixture,'binary.cjs'));
const image=name=>fs.readFileSync(path.join(fixture,'images',name));
for(const name of fs.readdirSync(path.join(fixture,'images')).filter(n=>n.endsWith('.png')))test('PngSuite '+name,()=>{
 const input=image(name),before=Buffer.from(input);
 // This corpus file has no IDAT. Upstream's private inflate path can return
 // a bitmap or throw depending on runtime/inflate state.
 if(name==='xdtn0g01.png'){assert.throws(()=>PNG.sync.read(input),/image end/);return;}
 if(name.startsWith('x')){assert.throws(()=>upstream.sync.read(input));assert.throws(()=>PNG.sync.read(input));}
 else {const expected=upstream.sync.read(input),actual=PNG.sync.read(input);assert.deepEqual(actual,expected);assert(Buffer.isBuffer(actual.data));}
 assert.deepEqual(input,before);
});
test('pinned corpus and upstream parser hashes',()=>{
 const manifest=require(path.join(fixture,'images.json'));
 for(const [name,hash]of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(fixture,'images',name))).digest('hex'),hash);
 for(const [name,hash]of Object.entries(require('../PROVENANCE.json').sourceSHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(fixture,'node_modules/pngjs',name))).digest('hex'),hash);
});
const input=image('basn6a08.png'),base=binary.chunks(input);
test('reject a truncated zlib checksum accepted by upstream',()=>{const broken=binary.encode(base.map(c=>c.type==='IDAT'?{...c,data:c.data.subarray(0,-4)}:c));assert.doesNotThrow(()=>upstream.sync.read(broken));assert.throws(()=>PNG.sync.read(broken));});
test('reject duplicate IHDR accepted by upstream',()=>{const broken=binary.encode([base[0],base[0],...base.slice(1)]);assert.doesNotThrow(()=>upstream.sync.read(broken));assert.throws(()=>PNG.sync.read(broken),/IHDR/);});
test('check ignored ancillary chunk CRC too',()=>{const ancillary=binary.chunk('teXt',Buffer.from('fixture'));ancillary[ancillary.length-1]^=1;const broken=Buffer.concat([input.subarray(0,33),ancillary,input.subarray(33)]);assert.doesNotThrow(()=>upstream.sync.read(broken));assert.throws(()=>PNG.sync.read(broken),/CRC/);assert.deepEqual(PNG.sync.read(broken,{checkCRC:false}),PNG.sync.read(input));});
test('bounded dimensions before inflation, including Adam7',()=>{for(const interlace of [0,1]){const header=Buffer.from(base[0].data);header.writeUInt32BE(16000001);header.writeUInt32BE(1,4);header[12]=interlace;const broken=binary.encode([{type:'IHDR',data:header},...base.slice(1)]);assert.throws(()=>PNG.sync.read(broken),/dimensions/);}});
test('inflate output must match scanlines exactly',()=>{for(const name of ['basn6a08.png','basi6a08.png'])for(const amount of [-1,1,1000000]){const broken=binary.redata(image(name),raw=>amount<0?raw.subarray(0,-1):Buffer.concat([raw,Buffer.alloc(amount)]));assert.throws(()=>PNG.sync.read(broken));}});
test('allow final IDAT padding but reject discontinuous IDAT chunks',()=>{
 const tail=binary.encode(base.map(c=>c.type==='IDAT'?{...c,data:Buffer.concat([c.data,Buffer.from([1,2,3])])}:c));assert.deepEqual(PNG.sync.read(tail),PNG.sync.read(input));
 const packed=Buffer.concat(base.filter(c=>c.type==='IDAT').map(c=>c.data)),header=base[0];
 const broken=binary.encode([header,{type:'IDAT',data:packed.subarray(0,4)},{type:'teXt',data:Buffer.alloc(0)},{type:'IDAT',data:packed.subarray(4)},{type:'IEND',data:Buffer.alloc(0)}]);assert.throws(()=>PNG.sync.read(broken),/ordering/);
});
test('validate chunk framing, methods, filters and critical extensions',()=>{
 const badFilter=binary.redata(input,raw=>{raw[0]=5;return raw;});assert.throws(()=>PNG.sync.read(badFilter),/filter/);
 for(const index of [8,9,10,11,12]){const header=Buffer.from(base[0].data);header[index]=255;assert.throws(()=>PNG.sync.read(binary.encode([{type:'IHDR',data:header},...base.slice(1)])));}
 assert.throws(()=>PNG.sync.read(binary.encode([base[0],{type:'ABCD',data:Buffer.alloc(0)},...base.slice(1)])),/critical/);
 assert.throws(()=>PNG.sync.read(input.subarray(0,-12)),/IEND/);
 assert.throws(()=>PNG.sync.read(Buffer.concat([input,Buffer.from([0])])),/trailing/);
 const tooLong=Buffer.from(input);tooLong.writeUInt32BE(0x80000000,8);assert.throws(()=>PNG.sync.read(tooLong),/length/);
});
test('typed-array slices, pixel ownership and resource option validation',()=>{
 const enclosing=Buffer.concat([Buffer.alloc(7,255),input,Buffer.alloc(9,255)]),slice=new Uint8Array(enclosing.buffer,enclosing.byteOffset+7,input.length),before=Buffer.from(enclosing);
 const a=PNG.sync.read(slice),b=PNG.sync.read(slice);a.data[0]^=255;assert.notEqual(a.data[0],b.data[0]);assert.deepEqual(enclosing,before);
 assert.throws(()=>PNG.sync.read(input,{maxPixels:100}),/maxPixels/);assert.throws(()=>PNG.sync.read(input,{maxBytes:100}),/maxBytes/);
 assert.deepEqual(PNG.sync.read(input,{maxPixels:1024,maxBytes:input.length}),upstream.sync.read(input));
 for(const key of ['maxPixels','maxBytes'])for(const value of [0,-1,1.5,NaN,Infinity,'100',0x80000000])assert.throws(()=>PNG.sync.read(input,{[key]:value}),RangeError);
 assert.throws(()=>PNG.sync.read(input,{checkCRC:1}),TypeError);assert.throws(()=>PNG.sync.read(input,{skipRescale:true}),/Unsupported/);assert.throws(()=>PNG.sync.read('png'),TypeError);
});
test('upstream-written mixed RGBA fixtures preserve bytes and metadata',()=>{
 for(let size=1;size<=32;size++){
  const data=Buffer.alloc(size*7*4);for(let n=0;n<data.length;n++)data[n]=(n*31+size*17)%256;
  for(const filterType of [0,1,2,3,4,-1]){const encoded=upstream.sync.write({width:size,height:7,data},{filterType});const result=PNG.sync.read(encoded);assert.deepEqual(result,upstream.sync.read(encoded));assert.deepEqual(result.data,data);}
 }
});
test('real resvg output matches the image caller pixel checks',()=>{
 const {Resvg}=require(path.join(fixture,'node_modules/@resvg/resvg-js'));
 for(const fill of ['red','blue','#12345680']){const encoded=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="37" height="29"><rect width="17" height="19" fill="'+fill+'"/></svg>').render().asPng();const actual=PNG.sync.read(encoded,{checkCRC:true}),expected=upstream.sync.read(Buffer.from(encoded),{checkCRC:true});assert.deepEqual(actual,expected);assert.equal(actual.width,37);assert.equal(actual.height,29);}
});

test('mask unused transparency-key bits as the PNG specification requires',()=>{
 const original=image('basn0g08.png'),list=binary.chunks(original),key=Buffer.from([1,0]);list.splice(1,0,{type:'tRNS',data:key});const encoded=binary.encode(list),actual=PNG.sync.read(encoded),before=upstream.sync.read(encoded);
 assert.deepEqual(actual.transColor,[0]);assert.deepEqual(before.transColor,[256]);let transparent=0;
 for(let i=0;i<actual.data.length;i+=4){if(before.data[i]===0){assert.equal(actual.data[i+3],0);transparent++;}else assert.deepEqual(actual.data.subarray(i,i+4),before.data.subarray(i,i+4));}assert(transparent>0);
});
test('empty palette transparency leaves every palette entry opaque',()=>{
 const list=binary.chunks(image('basn3p01.png'));list.splice(list.findIndex(c=>c.type==='IDAT'),0,{type:'tRNS',data:Buffer.alloc(0)});const encoded=binary.encode(list);assert.deepEqual(PNG.sync.read(encoded),upstream.sync.read(encoded));
});
