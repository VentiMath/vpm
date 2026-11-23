'use strict';
const {rasterize}=require('./raster.cjs');
const {encodePng}=require('./raster-png.cjs');
const {RasterError}=require('./error.cjs');
const {TextDecoder}=require('node:util');
// This is the Resvg surface used by the writeup caller, not a general SVG DOM.
class Resvg {
 #svg; #options;
 constructor(svg,options={}) {
  if(svg instanceof Uint8Array)svg=new TextDecoder('utf-8',{fatal:true}).decode(svg);
  if(typeof svg!=='string')throw new TypeError('SVG must be a string or UTF-8 bytes');
  if(svg.length>32*1024*1024)throw new RasterError('LIMIT','SVG exceeds the source limit');
  options??={};if(typeof options!=='object'||Array.isArray(options))throw new TypeError('Invalid render options');
  for(const key of Object.keys(options))if(!['fitTo','background'].includes(key))throw new RasterError('RASTER','Unsupported render option: '+key);
  const fit=options.fitTo??{mode:'original'};
  if(!fit||!['original','width','height','zoom'].includes(fit.mode))throw new TypeError('Invalid fitTo mode');
  for(const key of Object.keys(fit))if(key!=='mode'&&(key!=='value'||fit.mode==='original'))throw new TypeError('Invalid fitTo option');
  if(fit.mode!=='original'&&(typeof fit.value!=='number'||!Number.isFinite(fit.value)||fit.value<=0))throw new RangeError('fitTo value must be finite and positive');
  this.#svg=svg;this.#options={strict:true,background:options.background,...(fit.mode==='original'?{}:{[fit.mode]:fit.value})};
 }
 render(){return new RenderedImage(rasterize(this.#svg,this.#options));}
}
class RenderedImage {
 #surface; #png;
 constructor(surface){this.#surface=surface;}
 get width(){return this.#surface.width;}
 get height(){return this.#surface.height;}

 asPng(){this.#png??=encodePng(this.#surface);return Buffer.from(this.#png);}
}
module.exports={Resvg,RenderedImage,RasterError};
