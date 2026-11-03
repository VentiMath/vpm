'use strict';
const {VlxError}=require('./index.cjs');
async function renderPng(renderer,tex,options={}) {
 const scale=options.scale??2,background=options.background??'white';
 if(background!=='white'&&background!=='transparent')throw new TypeError('background must be white or transparent');
 if(!Number.isFinite(scale)||scale<=0||scale>8)throw new RangeError('scale must be positive and at most 8');
 const result=await renderer.renderMath(tex,{display:options.display??true,fontSize:options.fontSize});
 const width=Math.ceil(result.width*scale),height=Math.ceil(result.height*scale);
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16384||height>16384||width*height>16777216)throw new VlxError('LIMIT','PNG dimensions exceed the supported pixel budget');
 const {Resvg}=require('@resvg/resvg-js');
 const png=new Resvg(result.svg,{background:background==='white'?'white':undefined,fitTo:{mode:'width',value:width},font:{loadSystemFonts:false}}).render();
 return {data:new Uint8Array(png.asPng()),width:png.width,height:png.height};
}
exports.renderPng=renderPng;
