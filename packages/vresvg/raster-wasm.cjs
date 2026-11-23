'use strict';
// Portable in-house scan converter. The JS path remains the compatibility
// reference and supports runtimes where WebAssembly has been disabled.
const fs=require('node:fs');
const {RasterError}=require('./error.cjs');
const states=new WeakMap();let compiled;
function createSurface(width,height){
 const bytes=width*height*4;
 if(typeof WebAssembly==='undefined'||process.env.VPM_RASTER_JS==='1')return {width,height,data:Buffer.alloc(bytes)};
 compiled??=new WebAssembly.Module(fs.readFileSync(__dirname+'/scan.wasm'));
 const memory=new WebAssembly.Memory({initial:Math.ceil((131072+bytes)/65536),maximum:4096});
 const instance=new WebAssembly.Instance(compiled,{env:{memory}});
 const start=instance.exports.__heap_base.value,scratch=(start+bytes+7)&~7;
 const surface={width,height,data:Buffer.from(memory.buffer,start,bytes)};
 states.set(surface,{memory,instance,start,scratch,bytes});
 return surface;
}
function paint(polygons,ink,surface,budget,matrix){
 const state=states.get(surface);if(!state)return false;
 let vertices=0;for(const p of polygons)vertices+=p.length;
 // Horizontal edges are omitted below. The JS reference handles unusually
 // large all-horizontal input without reserving unnecessary Wasm scratch.
 if(vertices>2000000)return false;
 const needed=state.scratch+vertices*96+80+surface.width*4;
 if(needed>state.memory.buffer.byteLength){
  state.memory.grow(Math.ceil((needed-state.memory.buffer.byteLength)/65536));
  surface.data=Buffer.from(state.memory.buffer,state.start,state.bytes);
 }
 const edges=new Float64Array(state.memory.buffer,state.scratch,vertices*6);
 let count=0,low=Infinity,high=-Infinity,minx=Infinity,maxx=-Infinity;
 for(const points of polygons)for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const ax=matrix?matrix[0]*a[0]+matrix[2]*a[1]+matrix[4]:a[0],ay=matrix?matrix[1]*a[0]+matrix[3]*a[1]+matrix[5]:a[1];
  const bx=matrix?matrix[0]*b[0]+matrix[2]*b[1]+matrix[4]:b[0],by=matrix?matrix[1]*b[0]+matrix[3]*b[1]+matrix[5]:b[1];
  if(!Number.isFinite(ax)||!Number.isFinite(ay)||!Number.isFinite(bx)||!Number.isFinite(by))return false;
  minx=Math.min(minx,ax);maxx=Math.max(maxx,ax);if(ay===by)continue;
  const down=ay<by,lx=down?ax:bx,ly=down?ay:by,ux=down?bx:ax,uy=down?by:ay;
  const slope=(ux-lx)/(uy-ly);if(!Number.isFinite(slope))return false;
  const j=count++*6;edges[j]=lx;edges[j+1]=ly;edges[j+2]=uy;edges[j+3]=slope;edges[j+4]=down?1:-1;edges[j+5]=count-1;
  low=Math.min(low,ly);high=Math.max(high,uy);
 }
 if(!count)return true;
 const rgba=ink[0]|ink[1]<<8|ink[2]<<16|ink[3]<<24;
 const work=state.instance.exports.paint(state.scratch,count,surface.width,surface.height,state.start,low,high,minx,maxx,rgba,budget.work,state.scratch+count*48);
 if(work<0)throw new RasterError('LIMIT','Raster sampling budget exceeded');
 budget.work=work;return true;
}
function filter(surface,first,rows){
 const state=states.get(surface);if(!state)return null;
 const length=(surface.width*4+1)*rows,needed=state.scratch+length;
 if(needed>state.memory.buffer.byteLength){state.memory.grow(Math.ceil((needed-state.memory.buffer.byteLength)/65536));surface.data=Buffer.from(state.memory.buffer,state.start,state.bytes);}
 state.instance.exports.filter(surface.width,surface.height,state.start,state.scratch,first,rows);
 return Buffer.from(state.memory.buffer,state.scratch,length);
}
function adler(surface,bytes,prior){
 const state=states.get(surface);if(state)return state.instance.exports.adler(state.scratch,bytes.length,prior)>>>0;
 let a=prior&65535,b=prior>>>16;
 for(let i=0;i<bytes.length;){const end=Math.min(bytes.length,i+5552);for(;i<end;i++){a+=bytes[i];b+=a;}a%=65521;b%=65521;}
 return ((b<<16)|a)>>>0;
}
module.exports={createSurface,paint,filter,adler};
