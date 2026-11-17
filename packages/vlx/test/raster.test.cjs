'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{rasterize,renderSvgPng}=require('../raster.cjs'),{encodePng}=require('../raster-png.cjs'),{PNG}=require('../../vpngjs');
const svg=body=>`<svg width="20" height="20" viewBox="0 0 20 20">${body}</svg>`,pixel=(r,x,y)=>[...r.data.subarray((y*r.width+x)*4,(y*r.width+x+1)*4)];
test('fills preserve winding holes, fractional coverage and source-over color',()=>{
 const r=rasterize(svg('<path d="M1 1H19V19H1Z M5 5V15H15V5Z" fill="red"/><rect x="8" y="8" width="2.5" height="2" fill="blue"/>'));
 assert.deepEqual(pixel(r,2,2),[255,0,0,255]);assert.deepEqual(pixel(r,6,6),[0,0,0,0]);assert.deepEqual(pixel(r,10,8),[0,0,255,128]);
 const c=rasterize(svg('<rect width="20" height="20" fill="red"/><rect x=".5" width="1" height="20" fill="blue"/>'));assert.deepEqual(pixel(c,0,10),[128,0,128,255]);
});
test('curves, transforms, stroke widths and dash gaps retain drawing geometry',()=>{
 const r=rasterize(svg('<g transform="translate(2 3) scale(2)"><path d="M0 0Q5 0 5 5L0 5Z" fill="green"/></g><path d="M1 18H19" fill="none" stroke="blue" stroke-width="2" stroke-dasharray="2 2"/>'));
 assert.deepEqual(pixel(r,3,8),[0,128,0,255]);assert.deepEqual(pixel(r,1,8),[0,0,0,0]);assert.deepEqual(pixel(r,1,18),[0,0,255,255]);assert.deepEqual(pixel(r,3,18),[0,0,0,0]);
 const line=rasterize(svg('<path d="M5 0V20" fill="none" stroke="black" stroke-width="1.5"/>'));assert.equal(pixel(line,4,10)[3],191);assert.equal(pixel(line,5,10)[3],191);
});
test('PNG encoding roundtrips RGBA through an independent decoder',()=>{
 const native=require('../../../scripts/png-conformance/node_modules/pngjs').PNG;
 for(const [width,height]of [[1,1],[37,23]]){const data=Buffer.alloc(width*height*4);for(let i=0;i<data.length;i++)data[i]=(i*113+7)%256;const png=encodePng({width,height,data});for(const decoder of [native,PNG]){const d=decoder.sync.read(png);assert.equal(d.width,width);assert.equal(d.height,height);assert.deepEqual(Buffer.from(d.data),data);}assert.deepEqual(png,encodePng({width,height,data}));}
 assert.throws(()=>encodePng({width:2,height:2,data:Buffer.alloc(4)}),RangeError);
});
test('embedded figure pixels preserve color and alpha without transparent color fringes',()=>{
 const png=encodePng({width:2,height:1,data:Buffer.from([255,0,0,255,0,0,255,0])}),uri='data:image/png;base64,'+png.toString('base64');
 const r=rasterize(svg(`<image href="${uri}" x="2" y="3" width="2" height="1"/>`));assert.deepEqual(pixel(r,2,3),[255,0,0,255]);assert.equal(pixel(r,3,3)[3],0);
 const scaled=rasterize(svg(`<image href="${uri}" x="2" y="3" width="8" height="4"/>`));for(let x=2;x<8;x++){const p=pixel(scaled,x,4);if(p[3]){assert.equal(p[0],255);assert.equal(p[2],0);}}
});
test('only owned drawing vocabulary and bounded dimensions are accepted',()=>{
 for(const body of ['<script/>','<text>Hello</text>','<image href="https://example.com/a.png"/>','<path d="M0 0A1 1 0 0 0 5 5"/>','<g transform="rotate(4)"></g>'])assert.throws(()=>rasterize(svg(body)),{code:'RASTER'});
 for(const width of [0,-1,NaN,Infinity,20000])assert.throws(()=>rasterize(svg(''),{width}));
 assert.throws(()=>rasterize('<svg width="5000" height="5000"></svg>'),{code:'LIMIT'});assert.throws(()=>rasterize(svg('<g>')),{code:'RASTER'});assert.throws(()=>rasterize(svg('<path d="MNaN 2"/>')),{code:'RASTER'});
 const p=renderSvgPng(svg('<ellipse cx="10" cy="10" rx="4" ry="6" fill="purple"/>'),{width:40,background:'white'});assert.equal(p.width,40);assert.equal(p.height,40);assert.deepEqual(pixel(PNG.sync.read(p.data),20,20),[128,0,128,255]);
});
test('public math and page PNG APIs run without loading a native rasterizer',async()=>{
 const Module=require('node:module'),load=Module._load;Module._load=function(name,...rest){if(name.includes('resvg'))throw Error('native rasterizer loaded');return load.call(this,name,...rest)};
 try {const {createRenderer}=require('..'),{renderPng}=require('../png.cjs'),{renderProblemPng}=require('../problem.cjs');const p=await renderPng(createRenderer(),String.raw`10\sqrt[3]{10}`);assert.ok(p.width>0);assert.equal(PNG.sync.read(renderProblemPng({statement:'Find $x$.'})).width,960);}finally{Module._load=load;}
});

test('cached geometry keeps per-request limits and scale-sensitive precision',()=>{const {flatten}=require('../raster-paths.cjs'),source='M0 0C0 20 20 20 20 0Z',a={points:0},b={points:0};const coarse=flatten(source,.2,a),fine=flatten(source,.01,b);assert(b.points>a.points);assert.notDeepEqual(coarse,fine);assert.throws(()=>flatten(source,.2,{points:2000000}),{code:'LIMIT'});const again={points:0};assert.deepEqual(flatten(source,.2,again),coarse);assert.equal(again.points,a.points);});
test('rectangle fast paths preserve clipped, transformed and fractional coverage',()=>{for(const box of [[-.4,-.2,7.8,8.5],[1.25,2.75,6.5,9.1],[19.4,18.2,10,20]])for(const transform of ['', 'translate(2 1) scale(-1 1)','skewX(10)']){const [x,y,w,h]=box,attributes=`fill="#102030" transform="${transform}"`,rect=rasterize(svg(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attributes}/>`)),path=rasterize(svg(`<path d="M${x} ${y}H${x+w}V${y+h}H${x}Z" ${attributes}/>`));for(let i=0;i<rect.data.length;i++)assert(Math.abs(rect.data[i]-path.data[i])<=1);}});
